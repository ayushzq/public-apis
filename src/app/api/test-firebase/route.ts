import { NextResponse } from "next/server";
import { firebaseAdmin, fcm } from "@/lib/firebaseAdmin";

export async function GET() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const status = {
    hasProjectId: Boolean(projectId),
    projectId: projectId || "MISSING",
    hasClientEmail: Boolean(clientEmail),
    hasPrivateKey: Boolean(privateKey),
    privateKeyFormatValid: Boolean(
      privateKey && privateKey.includes("-----BEGIN PRIVATE KEY-----")
    ),
    isInitialized: Boolean(firebaseAdmin.apps.length),
    fcmReady: Boolean(fcm),
  };

  if (!status.isInitialized || !status.fcmReady) {
    return NextResponse.json(
      {
        success: false,
        message: "Firebase connect nahi ho paya. Env variables check karein.",
        debug: status,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Firebase Admin 100% connect ho gaya aur FCM ready hai!",
    debug: status,
  });
}
