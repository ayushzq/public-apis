import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = requireOwner(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "25"), 100);
    const query = searchParams.get("q") || searchParams.get("search") || "";

    // 1. Search Query Filter (Name ya Phone number se search karein)
    // Security fix (BaseKey audit — critical): this query had NO organizationId
    // filter at all, so any authenticated mobile owner could page through
    // every contact/message in the entire database, across every workspace.
    const whereFilter: any = { organizationId };
    if (query.trim()) {
      const cleanQ = query.trim();
      whereFilter.OR = [
        { name: { contains: cleanQ, mode: "insensitive" } },
        { phoneNumber: { contains: cleanQ.replace(/\D/g, "") } },
      ];
    }

    // 2. Fetch Contacts — 🔥 FIX: lastMessageAt desc (Latest active chats sabse upar)
    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where: whereFilter,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          messages: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
        orderBy: [
          { lastMessageAt: "desc" }, // Naya message aate hi top par
          { createdAt: "desc" },
        ],
      }),
      prisma.contact.count({ where: whereFilter }),
    ]);

    const items = contacts.map((c: any) => {
      const lastMsg = c.messages?.[0];
      const phone = c.phoneNumber || c.phone || "";
      const msgDate = lastMsg?.timestamp || c.lastMessageAt || c.createdAt || new Date();

      // Media text preview helper (📷 Photo, 🎵 Audio, etc.)
      let messageSnippet = "";
      if (lastMsg) {
        if (lastMsg.type === "IMAGE") messageSnippet = lastMsg.body || "📷 Photo";
        else if (lastMsg.type === "AUDIO") messageSnippet = "🎵 Audio message";
        else if (lastMsg.type === "VIDEO") messageSnippet = lastMsg.body || "🎥 Video";
        else if (lastMsg.type === "DOCUMENT") messageSnippet = "📄 Document";
        else messageSnippet = lastMsg.body || "";
      }

      return {
        contact: {
          id: c.id,
          name: c.name || phone || "Unknown",
          phone: phone,
          avatarUrl: c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`,
          leadStatus: c.leadStatus || "NEW",
          isVip: Boolean(c.isVip),
          createdAt: new Date(c.createdAt || Date.now()).toISOString(),
        },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              body: messageSnippet,
              createdAt: new Date(msgDate).toISOString(),
              time: new Date(msgDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              direction: lastMsg.direction, // "INBOUND" | "OUTBOUND"
              isMe: lastMsg.direction === "OUTBOUND",
              // 🔥 Inbox Row Ticks
              status: lastMsg.status, // "SENT" | "DELIVERED" | "READ"
              statusLower: (lastMsg.status || "sent").toLowerCase(),
              type: lastMsg.type,
            }
          : null,
        unreadCount: c.unreadCount || 0,
      };
    });

    return ok({
      items,
      page,
      pageSize,
      totalCount,
      hasMore: page * pageSize < totalCount,
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Chats Route Error]", err);
    return fail("Internal server error", 500);
  }
}
