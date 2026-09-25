import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { getSystemSettingsByOrg } from "@/lib/systemSettings";

// ─── 1. FETCH MESSAGES (Jab kisi contact par click karein) ───
export async function GET(req: Request) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json([]);
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.organizationId !== orgId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { timestamp: "asc" },
    });

    // Bug fix (BaseKey audit — chat rendering): this used to translate every
    // message into a legacy `{ text, sender, time, status: lowercase }`
    // shape. The web ChatBubble/ChatMessage type (src/lib/chatLogic.ts) and
    // the mobile chat screens both expect Prisma's own field names
    // (body/direction/timestamp/status/type, all UPPERCASE enums) — the old
    // shape meant every bubble rendered with no text, on the wrong side, no
    // timestamp and no delivery ticks. Just pass the row through, adding
    // only the UI-only `replyTo` text (there's no DB column for it).
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      contactId: msg.contactId,
      senderId: msg.senderId,
      body: msg.body,
      type: msg.type,
      direction: msg.direction,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      replyTo: msg.replyToText || null,
      timestamp: msg.timestamp,
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// ─── 2. SEND MESSAGE (Jab aap chat box se message bhejein) ───
export async function POST(req: Request) {
  const { error, status, orgId, user } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const body = await req.json();
    const { contactId, phoneNumber, type = "TEXT", body: msgBody, mediaUrl, replyTo } = body;

    if (!contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.organizationId !== orgId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const settings = await getSystemSettingsByOrg(orgId);
    if (!settings || !settings.accessToken || !settings.phoneNumberId) {
      return NextResponse.json(
        { error: "WhatsApp isn't connected yet for this workspace — set it up in Settings." },
        { status: 400 }
      );
    }

    if ((type === "IMAGE" || type === "VIDEO" || type === "DOCUMENT" || type === "AUDIO") && !mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required for media messages" }, { status: 400 });
    }

    let metaPayload: Record<string, unknown>;
    switch (type) {
      case "IMAGE":
        metaPayload = { type: "image", image: { link: mediaUrl, caption: msgBody || undefined } };
        break;
      case "VIDEO":
        metaPayload = { type: "video", video: { link: mediaUrl, caption: msgBody || undefined } };
        break;
      case "AUDIO":
        metaPayload = { type: "audio", audio: { link: mediaUrl } };
        break;
      case "DOCUMENT":
        metaPayload = { type: "document", document: { link: mediaUrl, filename: msgBody || "file" } };
        break;
      default:
        metaPayload = { type: "text", text: { preview_url: false, body: msgBody } };
    }

    const metaResponse = await fetch(`https://graph.facebook.com/v19.0/${settings.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber || contact.phoneNumber,
        ...metaPayload,
      }),
    });

    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error("Meta API Error:", metaData.error);
      return NextResponse.json({ error: metaData.error?.message || "Failed to send to WhatsApp" }, { status: 500 });
    }

    const metaMessageId = metaData.messages?.[0]?.id || `local_id_${Date.now()}`;

    const newMsg = await prisma.message.create({
      data: {
        id: metaMessageId,
        contactId,
        senderId: user?.id,
        body: msgBody || "",
        type,
        direction: "OUTBOUND",
        status: "SENT",
        mediaUrl: mediaUrl || null,
        source: "CHAT",
        replyToText: replyTo || null,
        timestamp: new Date(),
      },
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMsg.id,
        contactId: newMsg.contactId,
        body: newMsg.body,
        type: newMsg.type,
        direction: newMsg.direction,
        status: newMsg.status,
        mediaUrl: newMsg.mediaUrl,
        replyTo: newMsg.replyToText || null,
        timestamp: newMsg.timestamp,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// ─── 3. DELETE MESSAGE(S) ───
// Added — this route had no DELETE handler at all, so "delete message",
// "clear chat" and "bulk delete" in the chat page all silently no-opped
// (the fetch() call just came back 405 and was never checked).
export async function DELETE(req: Request) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const url = new URL(req.url);
    const singleId = url.searchParams.get("id");
    const contactId = url.searchParams.get("contactId");
    const action = url.searchParams.get("action");

    // Mode A: clear an entire contact's thread — /api/chat/messages?contactId=..&action=clear
    if (contactId && action === "clear") {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact || contact.organizationId !== orgId) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      await prisma.message.deleteMany({ where: { contactId } });
      return NextResponse.json({ success: true });
    }

    // Mode B: delete a single message — /api/chat/messages?id=..
    if (singleId) {
      const msg = await prisma.message.findUnique({ where: { id: singleId }, include: { contact: true } });
      if (!msg || msg.contact?.organizationId !== orgId) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      await prisma.message.delete({ where: { id: singleId } });
      return NextResponse.json({ success: true });
    }

    // Mode C: bulk delete — DELETE with a JSON body of { ids: string[] }
    const body = await req.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No message id(s) provided" }, { status: 400 });
    }

    // deleteMany with a contact.organizationId filter (not delete-by-id) so a
    // caller can never delete a message that belongs to another workspace,
    // even if it guesses/leaks a valid message id.
    const result = await prisma.message.deleteMany({
      where: { id: { in: ids }, contact: { organizationId: orgId } },
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error("Error deleting message(s):", error);
    return NextResponse.json({ error: "Failed to delete message(s)" }, { status: 500 });
  }
}
