import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { sendWhatsAppMessage } from "@/lib/metaWhatsAppClient";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = requireOwner(request);

    const body = await request.json().catch(() => null);
    const phone: string | undefined = body?.phone;
    const text: string | undefined = body?.body || body?.text;
    const mediaUrl: string | undefined = body?.mediaUrl;
    const rawType: string | undefined = body?.type;
    const templateName: string | undefined = body?.templateName;
    const templateParams: string[] | undefined = body?.templateParams;
    const replyToId: string | undefined = body?.replyToId;

    if (!phone || (!text && !mediaUrl && !templateName)) {
      return fail("phone and one of body/mediaUrl/templateName are required", 400);
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Message Type Determine karein
    let messageType = "TEXT";
    if (templateName) {
      messageType = "TEMPLATE";
    } else if (rawType) {
      messageType = rawType.toUpperCase();
    } else if (mediaUrl) {
      messageType = "IMAGE";
    }

    // 2. Meta WhatsApp Cloud API call karein
    let metaResult: any = null;
    try {
      metaResult = await sendWhatsAppMessage({
        to: cleanPhone,
        text,
        mediaUrl,
        type: messageType,
        templateName,
        templateParams,
      } as any);
    } catch (apiErr: any) {
      console.error("[Meta API Dispatch Error]", apiErr);
      return fail(apiErr.message || "Failed to send WhatsApp message via Meta API", 502);
    }

    // 3. Database me Contact locate ya create karein — org-scoped (BaseKey audit
    // fix: unscoped lookup could match, and silently message into, another
    // workspace's existing contact for the same phone number).
    let contact = await prisma.contact.findFirst({
      where: {
        organizationId,
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: { contains: cleanPhone } },
        ],
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          organizationId,
          phoneNumber: cleanPhone,
          name: cleanPhone,
          isSessionActive: true,
        },
      });
    }

    // 4. Quoted target message verify karein (agar user ne swipe karke reply kiya ho)
    let quotedMessageData: any = null;
    if (replyToId) {
      try {
        const quotedMsg = await prisma.message.findUnique({
          where: { id: replyToId },
          select: { id: true, body: true, direction: true, type: true },
        });
        if (quotedMsg) {
          quotedMessageData = {
            id: quotedMsg.id,
            text: quotedMsg.body,
            senderName: quotedMsg.direction === "OUTBOUND" ? "You" : (contact.name || cleanPhone),
            type: quotedMsg.type,
          };
        }
      } catch (e) {
        console.warn("[Quoted Message Lookup Skipped]", e);
      }
    }

    // 5. Message Create Karein
    const finalMessageId = metaResult?.messageId || metaResult?.messages?.[0]?.id || randomUUID();
    const messageContent = text || (mediaUrl ? `[Media: ${mediaUrl}]` : `[Template: ${templateName}]`);

    const createPayload: any = {
      id: finalMessageId,
      contactId: contact.id,
      body: messageContent,
      type: messageType as any,
      direction: "OUTBOUND",
      status: "SENT",
      mediaUrl: mediaUrl || null,
      metaMessageId: finalMessageId,
      timestamp: new Date(),
    };

    // Agar model mein replyToId column add ho chuka hai toh fill karein
    if (replyToId) {
      createPayload.replyToId = replyToId;
      if (quotedMessageData?.text) {
        createPayload.replyToText = quotedMessageData.text.slice(0, 100);
      }
    }

    let message: any;
    try {
      message = await prisma.message.create({ data: createPayload });
    } catch (dbErr) {
      // Fallback agar schema mein abhi replyToId column apply nahi hua hai
      delete createPayload.replyToId;
      delete createPayload.replyToText;
      message = await prisma.message.create({ data: createPayload });
    }

    // 6. Contact ka lastMessageAt update karein
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        lastMessageAt: message.timestamp,
        isSessionActive: true,
      },
    }).catch(() => {});

    // 7. Response Mobile format ke according return karein
    return ok({
      id: message.id,
      contactId: contact.id,
      chatPhone: cleanPhone,
      body: message.body,
      text: message.body,
      type: message.type,
      direction: message.direction,
      isMe: true,
      status: message.status,
      statusLower: (message.status || "SENT").toLowerCase(),
      mediaUrl: message.mediaUrl ?? undefined,
      replyTo: quotedMessageData,
      timestamp: message.timestamp,
      time: new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: message.timestamp.toISOString(),
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Send Route Fatal Error]", err);
    return fail(err.message || "Internal server error", 500);
  }
}
