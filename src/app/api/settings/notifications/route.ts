import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db as prisma } from "@/prisma/lib/db";

// Security fix (BaseKey audit — P1): this route had NO auth check and used
// `findFirst()` / a single global row for the entire app — every logged-in
// user (any org, any role) read and overwrote the SAME notification/DND
// settings. The schema already has `NotificationSetting.userId @unique` for
// exactly this; it just wasn't being used. Now scoped per-user via the
// session, with an upsert keyed on userId.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.notificationSetting.upsert({
      where: { userId: session.user.id },
      update: {},
      create: {
        userId: session.user.id,
        notificationsEnabled: true,
        notifyOnNewContact: true,
        notifyOnExistingContact: true,
        notifyOnCampaignEvents: true,
        soundEnabled: true,
        dndEnabled: false,
        dndStartTime: "22:00",
        dndEndTime: "08:00",
      },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error("GET_NOTIFICATION_SETTINGS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const data = {
      notificationsEnabled: body.notificationsEnabled ?? true,
      notifyOnNewContact: body.notifyOnNewContact ?? true,
      notifyOnExistingContact: body.notifyOnExistingContact ?? true,
      notifyOnCampaignEvents: body.notifyOnCampaignEvents ?? true,
      soundEnabled: body.soundEnabled ?? true,
      dndEnabled: body.dndEnabled ?? false,
      dndStartTime: body.dndStartTime || "22:00",
      dndEndTime: body.dndEndTime || "08:00",
    };

    const updated = await prisma.notificationSetting.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    });

    return NextResponse.json({ success: true, settings: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST_NOTIFICATION_SETTINGS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
