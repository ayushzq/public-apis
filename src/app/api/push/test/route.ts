// app/api/push/test/route.ts
import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import crypto from "crypto";
import { getTenantContext } from "@/lib/tenant";
// @ts-ignore
import webpush from "web-push";

export const dynamic = "force-dynamic";

function cleanKey(key?: string | null): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

export async function GET(req: Request) {
  // Security fix (BaseKey audit — P1): this route had NO auth at all.
  // `?clean=true` deleted EVERY push subscription for EVERY workspace with
  // one anonymous request, and the plain GET blasted a test notification to
  // every registered device across every org. Now requires an owner
  // session and only ever touches devices belonging to users in the
  // caller's own organization.
  const { error, status, orgId, user } = await getTenantContext();
  if (error || !orgId || !user) return NextResponse.json({ error: error || "Unauthorized" }, { status });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can manage push notifications." }, { status: 403 });
  }

  const url = new URL(req.url);
  const shouldClean = url.searchParams.get("clean") === "true";

  if (shouldClean) {
    const delResult = await prisma.pushSubscription.deleteMany({ where: { user: { organizationId: orgId } } });
    return NextResponse.json({
      success: true,
      message: `Cleared ${delResult.count} old device token(s) for this workspace.`,
    });
  }

  // Security fix: no more hardcoded fallback VAPID private key / personal
  // email baked into source — a missing env var is now a hard, visible
  // error instead of silently signing pushes with a shared, checked-in key.
  const rawPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const rawSubject = process.env.VAPID_SUBJECT;
  if (!rawPrivateKey || !rawSubject) {
    return NextResponse.json(
      { success: false, error: "VAPID_PRIVATE_KEY / VAPID_SUBJECT are not configured on the server." },
      { status: 503 }
    );
  }

  const privateKey = cleanKey(rawPrivateKey);
  const subject = cleanKey(rawSubject);

  let derivedPublicKey = "";
  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    derivedPublicKey = ecdh.getPublicKey("base64url");
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "VAPID_PRIVATE_KEY is corrupt or in an invalid format: " + err.message },
      { status: 500 }
    );
  }

  try {
    webpush.setVapidDetails(subject, derivedPublicKey, privateKey);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "WebPush initialize error: " + err.message }, { status: 500 });
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { organizationId: orgId } },
    orderBy: { createdAt: "desc" },
  });

  if (subscriptions.length === 0) {
    return NextResponse.json(
      {
        success: false,
        status: "KEYS_AUTHENTICATED_AND_READY",
        activePublicKey: derivedPublicKey,
        message: "VAPID keys are valid, but no device is registered for this workspace yet.",
        next_step: "Open Settings on your phone/browser and press 'Re-sync Fresh Token'.",
      },
      { status: 404 }
    );
  }

  const testPayload = JSON.stringify({
    title: "🔔 BaseKey Alert",
    body: "Push notification engine is connected and working!",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    url: "/chat",
  });

  let successCount = 0;
  let failureCount = 0;
  let deletedDeadTokens = 0;
  const results: any[] = [];

  for (const sub of subscriptions) {
    const rawEndpoint = sub.endpoint || "";
    const endpointSnippet = rawEndpoint
      ? rawEndpoint.substring(0, 45) + "..."
      : sub.fcmToken
      ? "FCM: " + sub.fcmToken.substring(0, 30) + "..."
      : "No Endpoint";

    const item: any = { id: sub.id, endpointSnippet, statusCode: null, status: "UNKNOWN" };

    if (!sub.endpoint || !sub.p256dh || !sub.auth) {
      item.status = "SKIPPED";
      item.note = sub.fcmToken ? "Native Android FCM token - WebPush test skipped" : "Incomplete push credentials in database";
      results.push(item);
      continue;
    }

    try {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        testPayload
      );
      item.status = "DELIVERED";
      item.statusCode = res.statusCode;
      successCount++;
    } catch (err: any) {
      failureCount++;
      item.status = "FAILED";
      item.statusCode = err.statusCode || 500;
      item.error = err.message || String(err);

      if (err.statusCode === 403 || err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        deletedDeadTokens++;
        item.cleanup = "Mismatched/dead token removed from the database.";
      }
    }

    results.push(item);
  }

  return NextResponse.json({
    success: successCount > 0,
    summary: `${successCount} device(s) delivered, ${failureCount} failed.`,
    deletedDeadTokens,
    activePublicKey: derivedPublicKey,
    troubleshootingTip:
      successCount > 0
        ? "Notification delivered successfully to the push gateway (Status 201)."
        : "Old mismatched tokens were cleared. Go to Settings and press 'Re-sync Fresh Token'.",
    details: results,
  });
}
