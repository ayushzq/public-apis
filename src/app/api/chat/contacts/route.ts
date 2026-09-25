import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

export async function GET() {
  // 🔧 Fix: this route had no auth check and no organizationId filter at
  // all — it returned *every* contact from *every* workspace to anyone who
  // hit the URL. Chat is now correctly scoped to the logged-in user's org.
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: {
        lastMessageAt: "desc", // Naye message wale contacts sabse upar
      },
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1, // Sirf aakhri message uthao
          select: { body: true },
        },
      },
    });

    const formattedContacts = contacts.map((c) => ({
      id: c.id,
      name: c.name || c.phoneNumber,
      phoneNumber: c.phoneNumber,
      // Bug fix (BaseKey audit — chat sidebar): the Sidebar component reads
      // `contact.unreadCount` (matching the Prisma column name) — this used
      // to send `unread` instead, so the unread badge and bold/unread
      // styling never lit up no matter how many messages came in.
      unreadCount: c.unreadCount,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages.length > 0 ? c.messages[0].body : "Start a conversation",
      isSessionActive: c.isSessionActive,
      assignedToId: c.assignedToId,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`,
    }));

    return NextResponse.json(formattedContacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}
