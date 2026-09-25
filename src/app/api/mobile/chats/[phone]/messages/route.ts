import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { ok, fail } from "@/lib/apiResponse";

// Bug fix (BaseKey audit — broken media in the mobile app): an inbound
// WhatsApp media message stores Meta's internal media ID here, not a real
// URL — the mobile app can't load that directly. Point it at the media
// proxy (which the app calls with its existing Bearer token) instead;
// outbound media already has a real http(s) link and is left as-is.
function resolveMobileMediaUrl(mediaUrl: string | null, messageId: string): string | null {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) return mediaUrl;
  return `/api/media/${messageId}`;
}

// ─── 1. GET: Fetch Chat Messages & Mark as Read ───
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    const { organizationId } = requireOwner(req);
    const { phone } = await context.params;
    const cleanPhone = phone.replace(/\D/g, "");

    // Contact find karein — org-scoped (BaseKey audit fix: this used to have
    // no organizationId filter, so a phone number match could return
    // another workspace's contact and message history).
    const contact = await prisma.contact.findFirst({
      where: {
        organizationId,
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: { contains: cleanPhone } },
        ],
      },
    });

    if (!contact) {
      return ok({
        contact: null,
        messages: [],
      });
    }

    // Latest 100 messages fetch karein
    const rawMessages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    // Quick lookup dictionary for swipe-to-reply targets
    const messageMap = new Map<string, any>();
    rawMessages.forEach((m) => {
      messageMap.set(m.id, m);
    });

    const messages = rawMessages.reverse().map((msg: any) => {
      // Resolve Quoted Reply Context agar msg ke paas replyToId ho
      let quotedContext: any = null;
      if (msg.replyToId) {
        const target = messageMap.get(msg.replyToId);
        if (target) {
          quotedContext = {
            id: target.id,
            text: String(target.body || ""),
            senderName: target.direction === "OUTBOUND" ? "You" : (contact.name || cleanPhone),
            type: target.type,
          };
        } else if (msg.replyToText) {
          quotedContext = {
            id: msg.replyToId,
            text: String(msg.replyToText),
            senderName: "Message",
            type: "TEXT",
          };
        }
      }

      const safeStatus = String(msg.status || "SENT").toUpperCase();

      return {
        id: msg.id,
        contactId: msg.contactId,
        body: msg.body || "",
        text: msg.body || "",
        type: msg.type,
        direction: msg.direction,
        isMe: msg.direction === "OUTBOUND",
        status: safeStatus,
        statusLower: safeStatus.toLowerCase(), // Safe from undefined/null
        mediaUrl: resolveMobileMediaUrl(msg.mediaUrl, msg.id),
        replyTo: quotedContext,
        metaMessageId: msg.metaMessageId || null,
        isAiGenerated: Boolean(msg.isAiGenerated),
        timestamp: msg.timestamp,
        time: new Date(msg.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });

    // Chat open hote hi unreadCount zero karein
    if (contact.unreadCount > 0) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { unreadCount: 0 },
      }).catch(() => {});
    }

    return ok({
      contact: {
        id: contact.id,
        name: contact.name || contact.phoneNumber,
        phoneNumber: contact.phoneNumber,
        leadStatus: contact.leadStatus || "NEW",
        isVip: Boolean(contact.isVip),
        isMuted: Boolean(contact.isMuted),
        isBotPaused: Boolean(contact.isBotPaused),
        avatarUrl:
          contact.avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`,
      },
      messages,
    });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Messages GET Route Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}

// ─── 2. DELETE: Clear Chat ya Selected Messages Delete Karein ───
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    const { organizationId } = requireOwner(req);
    const { phone } = await context.params;
    const cleanPhone = phone.replace(/\D/g, "");

    const body = await req.json().catch(() => ({}));
    const messageIds: string[] | undefined = body?.messageIds;
    const clearAll: boolean = Boolean(body?.clearAll);

    const contact = await prisma.contact.findFirst({
      where: {
        organizationId,
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: { contains: cleanPhone } },
        ],
      },
    });

    if (!contact) {
      return fail("Contact not found", 404);
    }

    if (clearAll) {
      await prisma.message.deleteMany({
        where: { contactId: contact.id },
      });

      await prisma.contact.update({
        where: { id: contact.id },
        data: { unreadCount: 0 },
      }).catch(() => {});

      return ok({
        cleared: true,
        message: "Contact ki poori chat history delete ho chuki hai.",
      });
    }

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      const deleteResult = await prisma.message.deleteMany({
        where: {
          contactId: contact.id,
          id: { in: messageIds },
        },
      });

      return ok({
        deletedCount: deleteResult.count,
        message: `${deleteResult.count} messages delete ho gaye.`,
      });
    }

    return fail("Either messageIds array or clearAll: true is required", 400);
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Messages DELETE Route Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}
