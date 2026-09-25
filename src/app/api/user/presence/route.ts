import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db as prisma } from "@/prisma/lib/db";

// Route ID to readable module names
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "Live Chat",
  "/contacts": "Contacts CRM",
  "/campaigns": "Bulk Campaigns",
  "/chatbot-builder": "Flow Builder",
  "/template": "Templates",
  "/settings": "Settings",
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, page } = await req.json();

    // Module ka readable name resolve karo
    const matchingKey = Object.keys(PAGE_TITLES).find((key) => page?.startsWith(key));
    const activityName = matchingKey ? PAGE_TITLES[matchingKey] : (page || "Navigating");

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // 🔥 FIX: Prisma Enum ke mutabiq 'BUSY' pass kiya (TypeScript Error Resolved)
        status: status === "AWAY" ? "BUSY" : "ONLINE",
        currentActivity: status === "AWAY" ? "Away from tab" : `Viewing ${activityName}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
