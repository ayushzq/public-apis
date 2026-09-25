import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { getSystemSettingsByOrg } from "@/lib/systemSettings";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";

// New route (BaseKey audit — "media/image broken dikhta hai"): an inbound
// WhatsApp media message only ever carries Meta's internal media ID in
// `Message.mediaUrl` (e.g. "1234567890"), not a real URL — and even Meta's
// own CDN link for it (i) expires quickly and (ii) requires your app's
// access token in the Authorization header to fetch at all, so a browser
// (or the mobile app) can never load it directly via a plain <img src>.
// This route:
//   1. Resolves the message → its org (so an id from another workspace's
//      chat can never be requested here) — works for both the web app
//      (NextAuth session cookie) and the mobile app (Bearer JWT),
//   2. Asks Meta for the current CDN URL for that media ID,
//   3. Fetches the bytes itself (server-side, with the access token) and
//      streams them back with the right content-type.
async function resolveOrgId(req: NextRequest): Promise<{ orgId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = requireOwner(req);
      return { orgId: payload.organizationId };
    } catch (err) {
      const status = err instanceof MobileAuthError ? err.status : 401;
      return { error: "Unauthorized", status };
    }
  }

  const ctx = await getTenantContext();
  if (ctx.error || !ctx.orgId) return { error: ctx.error || "Unauthorized", status: ctx.status };
  return { orgId: ctx.orgId };
}

export async function GET(req: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await context.params;
  const resolved = await resolveOrgId(req);
  if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const { orgId } = resolved;

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: true },
    });

    if (!message || message.contact?.organizationId !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!message.mediaUrl) {
      return NextResponse.json({ error: "This message has no media" }, { status: 404 });
    }

    // Outbound messages store a real URL directly (whatever the user/agent
    // pasted, usually a Cloudinary link) — nothing to resolve, just redirect.
    if (message.mediaUrl.startsWith("http://") || message.mediaUrl.startsWith("https://")) {
      return NextResponse.redirect(message.mediaUrl);
    }

    const settings = await getSystemSettingsByOrg(orgId);
    if (!settings?.accessToken) {
      return NextResponse.json({ error: "WhatsApp isn't connected for this workspace" }, { status: 400 });
    }

    // Step 1: resolve the media ID to a short-lived CDN URL.
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${message.mediaUrl}`, {
      headers: { Authorization: `Bearer ${settings.accessToken}` },
    });
    if (!metaRes.ok) {
      return NextResponse.json({ error: "Media has expired or is no longer available" }, { status: 404 });
    }
    const metaData = await metaRes.json();
    if (!metaData.url) {
      return NextResponse.json({ error: "Meta did not return a media URL" }, { status: 502 });
    }

    // Step 2: fetch the actual bytes — this URL also needs the same bearer token.
    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${settings.accessToken}` },
    });
    if (!mediaRes.ok || !mediaRes.body) {
      return NextResponse.json({ error: "Failed to download media from WhatsApp" }, { status: 502 });
    }

    return new NextResponse(mediaRes.body, {
      status: 200,
      headers: {
        "Content-Type": metaData.mime_type || mediaRes.headers.get("content-type") || "application/octet-stream",
        // The underlying bytes never change once a message is sent — safe
        // to let the browser/app cache this response for a while even
        // though Meta's own CDN link is short-lived (we re-resolve it every
        // request).
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}
