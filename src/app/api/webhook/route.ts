import { NextResponse } from "next/server";
import { MessageType, MessageDirection, MessageStatus } from "@prisma/client";
import { db as prisma } from "@/prisma/lib/db";
import { runFlowEngine } from "@/lib/whatsapp/engine";
import { runAiBotReply } from "@/lib/whatsapp/aiBot";
import { fcm } from "@/lib/firebaseAdmin";
import crypto from "crypto";

// @ts-ignore
import webpush from "web-push";

// Security fix (BaseKey audit): no more hardcoded fallback VAPID private key
// / personal email baked into source. If the env vars aren't set, push
// sending is simply skipped for this request (logged once) instead of every
// deploy silently signing notifications with the same shared key.
function initVapid(): boolean {
  const rawPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const rawSubject = process.env.VAPID_SUBJECT;
  if (!rawPrivateKey || !rawSubject) return false;

  try {
    const privateKey = rawPrivateKey.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
    const subject = rawSubject.trim();
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    const verifiedPublicKey = ecdh.getPublicKey("base64url");
    webpush.setVapidDetails(subject, verifiedPublicKey, privateKey);
    return true;
  } catch (err) {
    console.error("VAPID auto-derivation error in webhook:", err);
    return false;
  }
}
const vapidReady = initVapid();

// Security fix (BaseKey audit — P0): Meta signs every webhook POST with an
// HMAC-SHA256 of the raw body using your app secret, sent as the
// `X-Hub-Signature-256` header. This route never checked it, so ANYONE who
// found the webhook URL could POST fabricated "incoming messages" or
// "delivery statuses" straight into any workspace's chat history. Verified
// with a raw-body HMAC + timing-safe comparison before anything is parsed.
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // Fail CLOSED, not open — an unconfigured secret must never be treated
    // as "signature check not applicable".
    console.error("Webhook rejected: META_APP_SECRET is not configured.");
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function isWithinDnd(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  try {
    const now = new Date();
    const istOffset = 5.5 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const currentMinutes = Math.floor((utcMinutes + istOffset) % (24 * 60));

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      return currentMinutes >= startTotal && currentMinutes <= endTotal;
    } else {
      return currentMinutes >= startTotal || currentMinutes <= endTotal;
    }
  } catch {
    return false;
  }
}

// ─── GET: Webhook Verification ───
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    try {
      const settings = await prisma.systemSettings.findFirst({
        where: { verifyToken: token },
      });

      if (settings) {
        console.log(`✅ Webhook Verified: ${token}`);
        return new Response(challenge, { status: 200 });
      } else {
        return new Response("Forbidden: Invalid Token", { status: 403 });
      }
    } catch (error) {
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Receive Messages & Status Updates ───
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
      console.error("Webhook rejected: invalid or missing X-Hub-Signature-256");
      // 200 (not 401) so Meta doesn't retry-storm a forged/misconfigured
      // request, matching how Meta's own docs suggest handling bad payloads.
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const body = JSON.parse(rawBody);

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        const phoneId = value.metadata?.phone_number_id;
        if (!phoneId) continue;

        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            try {
              await handleIncomingMessage(phoneId, message, value.contacts);
            } catch (e) {
              console.error("Message Processing Error:", e);
            }
          }
        }

        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            try {
              await handleStatusUpdate(status);
            } catch (e) {
              console.error("Status Processing Error:", e);
            }
          }
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Webhook Processing Error:", error);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}

// ─── Handle Incoming Message & Push Notifications ───
async function handleIncomingMessage(phoneId: string, message: any, contacts: any[]) {
  // 1. Resolve Workspace by Phone Number ID
  // Security fix (BaseKey audit — P0, cross-tenant leak): this used to fall
  // back to `prisma.organization.findFirst()` (literally "whichever
  // workspace was created first") whenever the incoming phoneId didn't
  // match any configured SystemSettings row — silently filing a stranger's
  // WhatsApp conversation into some other business's contact list. An
  // unrecognised phoneId is now just dropped (and logged), never guessed.
  const settings = await prisma.systemSettings.findUnique({
    where: { phoneNumberId: phoneId },
  });

  const orgId = settings?.organizationId;
  if (!orgId) {
    console.error(`[Webhook Alert] No workspace is configured for phoneId: ${phoneId} — message dropped.`);
    return;
  }

  const senderPhone = message.from;
  const senderName = contacts?.[0]?.profile?.name || senderPhone;
  const messageId = message.id;
  const timestamp = new Date(parseInt(message.timestamp) * 1000);
  const rawType = message.type;

  let textBody = "";
  let mediaUrl: string | null = null;
  let enumType: MessageType = "TEXT";
  let interactivePayload: any = null;

  switch (rawType) {
    case "text":
      textBody = message.text?.body || "";
      enumType = "TEXT";
      break;
    case "image":
      enumType = "IMAGE";
      mediaUrl = message.image?.id || null;
      textBody = message.image?.caption || "📷 Image";
      break;
    case "video":
      enumType = "VIDEO";
      mediaUrl = message.video?.id || null;
      textBody = message.video?.caption || "🎥 Video";
      break;
    case "audio":
    case "voice":
      enumType = "AUDIO";
      mediaUrl = message.audio?.id || message.voice?.id || null;
      textBody = "🎵 Audio message";
      break;
    case "document":
      enumType = "DOCUMENT";
      mediaUrl = message.document?.id || null;
      textBody = message.document?.caption || `📄 ${message.document?.filename || "Document"}`;
      break;
    case "interactive":
      enumType = "INTERACTIVE";
      if (message.interactive?.type === "button_reply") {
        textBody = message.interactive.button_reply?.title || "Button reply";
        interactivePayload = { type: "button_reply", value: message.interactive.button_reply?.id };
      } else if (message.interactive?.type === "list_reply") {
        textBody = message.interactive.list_reply?.title || "List selection";
        interactivePayload = { type: "list_reply", value: message.interactive.list_reply?.id };
      }
      break;
    case "button":
      enumType = "INTERACTIVE";
      textBody = message.button?.text || "Button clicked";
      interactivePayload = { type: "button_reply", value: message.button?.payload };
      break;
    case "location":
      enumType = "TEXT";
      textBody = `📍 Location: ${message.location?.name || `${message.location?.latitude}, ${message.location?.longitude}`}`;
      break;
    default:
      enumType = "TEXT";
      textBody = `📎 ${rawType} message`;
  }

  // 2. Existing contact lookup via compound key
  const existingContact = await prisma.contact.findUnique({
    where: {
      organizationId_phoneNumber: {
        organizationId: orgId,
        phoneNumber: senderPhone,
      },
    },
  });
  const isNewContact = !existingContact;

  // 3. Upsert Contact with compound key
  const contact = await prisma.contact.upsert({
    where: {
      organizationId_phoneNumber: {
        organizationId: orgId,
        phoneNumber: senderPhone,
      },
    },
    update: {
      name: senderName,
      lastMessageAt: timestamp,
      unreadCount: { increment: 1 },
      isSessionActive: true,
    },
    create: {
      organizationId: orgId,
      phoneNumber: senderPhone,
      name: senderName,
      lastMessageAt: timestamp,
      unreadCount: 1,
      isSessionActive: true,
    },
  });

  // 4. Create Message
  await prisma.message.create({
    data: {
      id: messageId,
      contactId: contact.id,
      body: textBody,
      type: enumType,
      direction: "INBOUND",
      status: "DELIVERED",
      mediaUrl: mediaUrl,
      timestamp: timestamp,
    },
  });

  // Security fix (BaseKey audit — P0, cross-tenant leak + notification
  // spam): this used to call `prisma.notificationSetting.findFirst()` and
  // `prisma.pushSubscription.findMany()` with NO filter at all — meaning
  // every single incoming WhatsApp message, for ANY workspace, pushed a
  // notification to EVERY registered device across the ENTIRE platform,
  // and used whichever one global (now per-user) NotificationSetting row
  // happened to be read first to decide DND/mute for everyone. Now scoped
  // to just this organization's users, respecting each user's own
  // NotificationSetting.
  try {
    const isContactMuted = Boolean((contact as any)?.isMuted);
    const isContactVip = Boolean((contact as any)?.isVip);

    if (!isContactMuted) {
      const orgSubscriptions = await prisma.pushSubscription.findMany({
        where: { user: { organizationId: orgId } },
        include: { user: { include: { notificationSetting: true } } },
      });

      if (orgSubscriptions.length > 0) {
        const notifTitle = isContactVip ? `⭐ VIP: ${senderName}` : `${senderName}`;
        const notifBody = textBody.substring(0, 100) || "Received an attachment";

        for (const sub of orgSubscriptions) {
          const config = sub.user?.notificationSetting;
          const isMasterEnabled = config ? config.notificationsEnabled : true;
          let shouldSendNotification = isMasterEnabled;

          if (config && isMasterEnabled) {
            if (isNewContact && !config.notifyOnNewContact) shouldSendNotification = false;
            if (!isNewContact && !config.notifyOnExistingContact) shouldSendNotification = false;
            if (config.dndEnabled && !isContactVip) {
              if (isWithinDnd(config.dndStartTime, config.dndEndTime)) shouldSendNotification = false;
            }
          }
          if (!shouldSendNotification) continue;

          const webPayload = JSON.stringify({
            title: notifTitle,
            body: notifBody,
            icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
            badge: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
            sound: config?.soundEnabled ?? true,
            tag: `chat-${senderPhone}`,
            contactId: contact.id,
            senderPhone: senderPhone,
            url: `/chat?phone=${senderPhone}`,
          });

          if (sub.fcmToken && fcm) {
            try {
              await fcm.send({
                token: sub.fcmToken,
                notification: { title: notifTitle, body: notifBody },
                data: {
                  contactId: String(contact.id),
                  senderPhone: String(senderPhone),
                  senderName: String(senderName),
                  tag: `chat-${senderPhone}`,
                  click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
                android: {
                  priority: "high",
                  notification: {
                    channelId: "basekey_chat_channel",
                    sound: "default",
                    clickAction: "FLUTTER_NOTIFICATION_CLICK",
                  },
                },
              });
            } catch (fcmErr: any) {
              if (
                fcmErr?.code === "messaging/registration-token-not-registered" ||
                fcmErr?.code === "messaging/invalid-registration-token"
              ) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
              }
            }
            continue;
          }

          if (vapidReady && sub.endpoint && sub.p256dh && sub.auth) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                webPayload,
                { urgency: "high", TTL: 120 }
              );
            } catch (pushErr: any) {
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404 || pushErr.statusCode === 403) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
              }
            }
          }
        }
      }
    }
  } catch (notifyError) {
    console.error("Push Dispatch Error:", notifyError);
  }

  // 6. Bot / Flow Engine
  try {
    if (settings && !contact.isBotPaused) {
      if (!settings.isAiBotActive) {
        if (interactivePayload) {
          await runFlowEngine(phoneId, contact.id, senderPhone, interactivePayload as any);
        } else if (rawType === "text") {
          await runFlowEngine(phoneId, contact.id, senderPhone, { type: "text", value: textBody });
        }
      } else {
        await runAiBotReply(phoneId, senderPhone, textBody, settings);
      }
    }
  } catch (engineError) {
    console.error("Flow engine error:", engineError);
  }
}

// ─── Status Update Handler ───
async function handleStatusUpdate(status: any) {
  const metaId = status.id;
  const metaStatus = status.status;
  const errDescription = status.errors?.[0]?.message || status.errors?.[0]?.title || null;

  let dbStatus: MessageStatus | null = null;
  if (metaStatus === "sent") dbStatus = MessageStatus.SENT;
  if (metaStatus === "delivered") dbStatus = MessageStatus.DELIVERED;
  if (metaStatus === "read") dbStatus = MessageStatus.READ;

  if (dbStatus) {
    try {
      await prisma.message.updateMany({
        where: {
          OR: [{ id: metaId }, { metaMessageId: metaId }],
        },
        data: { status: dbStatus },
      });
    } catch (error) {
      console.error("Message status tick update error:", error);
    }
  }

  try {
    await prisma.campaignLog.updateMany({
      where: { messageId: metaId },
      data: {
        status: metaStatus ? String(metaStatus).toUpperCase() : "FAILED",
        errorMessage: errDescription ? String(errDescription) : undefined,
      },
    });
  } catch (error) {}
}
