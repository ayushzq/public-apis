import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";

export async function GET(request: NextRequest) {
  try {
    requireOwner(request);

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const leadStatus = searchParams.get("status"); // "NEW" | "HOT" | "FOLLOWUP" | "CLOSED"
    const vipOnly = searchParams.get("vip") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "30"), 100);

    const where: any = {};

    if (search) {
      const cleanPhone = search.replace(/\D/g, "");
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        ...(cleanPhone ? [{ phoneNumber: { contains: cleanPhone } }] : []),
      ];
    }

    if (leadStatus) {
      where.leadStatus = leadStatus.toUpperCase();
    }

    if (vipOnly) {
      where.isVip = true;
    }

    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { messages: true, notes: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return ok({
      items: contacts.map((c) => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        name: c.name || c.phoneNumber,
        email: c.email,
        avatarUrl: c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`,
        leadStatus: c.leadStatus,
        source: c.source,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt.toISOString(),
        isSessionActive: c.isSessionActive,
        isVip: c.isVip,
        isMuted: c.isMuted,
        isBotPaused: c.isBotPaused,
        assignedTo: c.assignedTo,
        messagesCount: c._count.messages,
        notesCount: c._count.notes,
        createdAt: c.createdAt.toISOString(),
      })),
      page,
      pageSize,
      totalCount,
      hasMore: page * pageSize < totalCount,
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Contacts GET Error]", err);
    return fail(err.message || "Internal server error", 500);
  }
}
