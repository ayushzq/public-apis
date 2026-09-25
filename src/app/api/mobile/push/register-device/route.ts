import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";

export async function POST(request: NextRequest) {
  try {
    const { ownerId } = requireOwner(request);

    const body = await request.json().catch(() => null);
    const fcmToken: string | undefined = body?.fcmToken;
    const deviceModel: string | undefined = body?.deviceModel;
    const osVersion: string | undefined = body?.osVersion;
    const appVersion: string | undefined = body?.appVersion;

    if (!fcmToken) {
      return fail("fcmToken is required", 400);
    }

    // 1. User table par fcmToken save karein (Owner device notification ke liye)
    try {
      await (prisma.user as any).update({
        where: { id: ownerId },
        data: { fcmToken },
      });
    } catch {
      // Agar User model me fcmToken column na ho toh silently continue karein
    }

    // 2. PushSubscription model agar schema me ho toh safely upsert karein
    const pushSubModel = (prisma as any).pushSubscription;
    if (pushSubModel) {
      try {
        const existing = await pushSubModel.findFirst({
          where: { fcmToken },
        });

        if (existing) {
          await pushSubModel.update({
            where: { id: existing.id },
            data: {
              ownerId,
              deviceModel: deviceModel ?? "unknown",
              osVersion: osVersion ?? "unknown",
              appVersion: appVersion ?? "0.0.0",
              lastSeenAt: new Date(),
            },
          });
        } else {
          await pushSubModel.create({
            data: {
              fcmToken,
              ownerId,
              deviceModel: deviceModel ?? "unknown",
              osVersion: osVersion ?? "unknown",
              appVersion: appVersion ?? "0.0.0",
              platform: "ANDROID",
              lastSeenAt: new Date(),
            },
          });
        }
      } catch (subErr) {
        console.warn("[PushSubscription DB Warning]", subErr);
      }
    }

    return ok({ registered: true });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Push Register Device Error]", err);
    return fail("Internal server error", 500);
  }
}
