// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ─── GET: Frontend Settings page ko verified Public Key return karega ───
export async function GET() {
  try {
    // Security fix (BaseKey audit): no more hardcoded fallback VAPID private
    // key. A missing env var is now a clear 503, not a silently shared key.
    const rawKey = process.env.VAPID_PRIVATE_KEY;
    if (!rawKey) {
      return NextResponse.json({ error: "VAPID_PRIVATE_KEY is not configured on the server." }, { status: 503 });
    }
    const privKey = rawKey.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");

    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privKey, "base64url"));
    const publicKey = ecdh.getPublicKey("base64url");

    return NextResponse.json({ publicKey }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to derive VAPID public key: " + err.message }, { status: 500 });
  }
}

// ─── POST: Device subscription token ko DB me upsert karega ───
export async function POST(req: Request) {
  try {
    // Bug fix (BaseKey audit): `getServerSession()` without `authOptions`
    // frequently returns null inside a route handler, so subscriptions used
    // to silently save with NO userId — completely un-scoped to any
    // workspace, meaning that device would then never receive a
    // notification once push delivery was made per-user/per-org (see
    // /api/webhook). Now the session is read correctly and required.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();

    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh || body.p256dh;
    const auth = body.keys?.auth || body.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        {
          error: "Invalid subscription payload: endpoint or keys are missing",
          details: { hasEndpoint: Boolean(endpoint), hasP256dh: Boolean(p256dh), hasAuth: Boolean(auth) },
        },
        { status: 400 }
      );
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId },
      create: { endpoint, p256dh, auth, userId },
    });

    return NextResponse.json({ success: true, id: subscription.id }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json({ error: error.message || "Database insert error" }, { status: 500 });
  }
}
