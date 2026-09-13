const path = require("path");
const fs = require("fs");
const pino = require("pino");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
} = require("@whiskeysockets/baileys");

const prisma = require("../config/prisma");
const { uploadBuffer } = require("../utils/cloudinary");

// One real WhatsApp socket per app-user, kept in memory for the life of
// the process. Render/most hosts recycle the process on deploy, which is
// fine — `useMultiFileAuthState` persists creds to disk so reconnecting
// on boot does NOT require re-scanning the QR code.
const sessions = new Map(); // userId -> { sock, status }

const SESSIONS_DIR = process.env.WA_SESSIONS_DIR || path.join(__dirname, "..", "..", "wa-sessions");

function sessionDirFor(userId) {
  return path.join(SESSIONS_DIR, userId);
}

function getSession(userId) {
  return sessions.get(userId);
}

function extractMessageText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    null
  );
}

function extractMediaInfo(contentType, message) {
  const map = {
    imageMessage: "image",
    videoMessage: "video",
    audioMessage: "audio",
    documentMessage: "document",
    stickerMessage: "sticker",
  };
  const mediaType = map[contentType];
  if (!mediaType) return null;
  const node = message[contentType];
  return {
    mediaType,
    mimeType: node?.mimetype || null,
    fileName: node?.fileName || null,
  };
}

function extractQuoteInfo(message, contentType) {
  const ctx =
    message?.extendedTextMessage?.contextInfo ||
    message?.[contentType]?.contextInfo ||
    null;
  if (!ctx?.stanzaId) return null;
  return {
    replyToWaId: ctx.stanzaId,
    replyToSender: ctx.participant || null,
    replyToText:
      extractMessageText(ctx.quotedMessage) ||
      (ctx.quotedMessage ? "[media]" : null),
  };
}

async function upsertChat(sessionRecordId, jid, patch) {
  return prisma.waChat.upsert({
    where: { sessionId_jid: { sessionId: sessionRecordId, jid } },
    create: { sessionId: sessionRecordId, jid, ...patch },
    update: patch,
  });
}

/**
 * Persists one Baileys message into WaMessage, uploading media to
 * Cloudinary first if present. Idempotent via the (chatId, waMessageId)
 * unique constraint, since Baileys can redeliver events on reconnect.
 */
async function persistMessage(sock, sessionRecordId, waChat, msg) {
  const contentType = getContentType(msg.message || {});
  if (!contentType) return null;

  const text = extractMessageText(msg.message);
  const mediaInfo = extractMediaInfo(contentType, msg.message);
  const quoteInfo = extractQuoteInfo(msg.message, contentType);

  let mediaUrl = null;
  if (mediaInfo) {
    try {
      const buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage }
      );
      const uploaded = await uploadBuffer(buffer, {
        mediaType: mediaInfo.mediaType,
        folder: `whatsapp-clone/${waChat.sessionId}`,
        filename: mediaInfo.fileName || msg.key.id,
      });
      mediaUrl = uploaded.secureUrl;
    } catch (err) {
      console.error("media download/upload failed:", err.message);
    }
  }

  const data = {
    waMessageId: msg.key.id,
    fromMe: !!msg.key.fromMe,
    senderJid: msg.key.participant || msg.key.remoteJid,
    senderName: msg.pushName || null,
    text: mediaInfo ? null : text,
    caption: mediaInfo ? text : null,
    mediaUrl,
    mediaType: mediaInfo?.mediaType || null,
    mimeType: mediaInfo?.mimeType || null,
    fileName: mediaInfo?.fileName || null,
    status: msg.key.fromMe ? "sent" : "delivered",
    replyToWaId: quoteInfo?.replyToWaId || null,
    replyToText: quoteInfo?.replyToText || null,
    replyToSender: quoteInfo?.replyToSender || null,
    timestamp: new Date(Number(msg.messageTimestamp) * 1000),
  };

  return prisma.waMessage.upsert({
    where: { chatId_waMessageId: { chatId: waChat.id, waMessageId: msg.key.id } },
    create: { chatId: waChat.id, ...data },
    update: data,
  });
}

/**
 * Starts (or resumes) a Baileys session for one app user, wiring every
 * event to Socket.io (`user:<userId>` room) and to Postgres via Prisma so
 * chats/messages survive process restarts.
 */
async function startSession(userId, io, phoneNumber) {
  // --- PERMANENT FIX: AUTO-CLEANUP ---
  // अगर यूज़र नया नंबर डाल रहा है (phoneNumber is present) या पुराना सेशन अटक गया है,
  // तो हम पुराने कनेक्शन को पहले पूरी तरह से बंद (Delete) कर देंगे।
  if (sessions.has(userId)) {
    const existingSession = sessions.get(userId);
    
    // अगर नया नंबर आया है, या पुराना सेशन 'connected' नहीं है
    if (phoneNumber || existingSession.status !== "connected") {
      try { existingSession.sock.ws.close(); } catch (e) {} // ज़बरदस्ती सॉकेट बंद करो
      sessions.delete(userId);
      const dir = sessionDirFor(userId);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true }); // पुरानी फाइल्स डिलीट करो
      }
    } else {
      // अगर एकदम सही से कनेक्टेड है और नया नंबर नहीं डाला है, तो बस पुराना वापस कर दो
      return existingSession.sock;
    }
  }
  // ------------------------------------

  const dir = sessionDirFor(userId);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  await prisma.waSession.upsert({
    where: { userId },
    create: { userId, status: "connecting" },
    update: { status: "connecting" },
  });

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sessions.set(userId, { sock, status: "connecting" });

  const emit = (event, payload) => io.to(`user:${userId}`).emit(event, payload);

  // Real "enter your phone number" pairing path (alternative to QR).
  if (phoneNumber && !state.creds.registered) {
    // 1.5 सेकंड का इंतज़ार ताकि सॉकेट सर्वर से पूरी तरह जुड़ जाए
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ""));
        emit("wa:pairing-code", { code });
      } catch (err) {
        emit("wa:disconnected", { reason: "pairing_failed" });
        console.error("requestPairingCode failed:", err.message);
      }
    }, 1500); 
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      await prisma.waSession.update({
        where: { userId },
        data: { status: "qr_pending" },
      });
      emit("wa:qr", { qr: qrDataUrl });
    }

    if (connection === "open") {
      const phoneNumber = sock.user?.id?.split(":")[0]?.split("@")[0] || null;
      await prisma.waSession.update({
        where: { userId },
        data: {
          status: "connected",
          phoneNumber,
          waName: sock.user?.name || null,
          lastConnectedAt: new Date(),
        },
      });
      sessions.set(userId, { sock, status: "connected" });
      emit("wa:connected", { phoneNumber, name: sock.user?.name || null });
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : undefined;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      sessions.delete(userId);

      if (loggedOut) {
        await prisma.waSession.update({
          where: { userId },
          data: { status: "disconnected" },
        });
        fs.rmSync(dir, { recursive: true, force: true });
        emit("wa:disconnected", { reason: "logged_out" });
      } else {
        emit("wa:disconnected", { reason: "connection_lost", willRetry: true });
        // Transient network blip — reconnect automatically.
        setTimeout(() => startSession(userId, io).catch(console.error), 3000);
      }
    }
  });

  sock.ev.on("messaging-history.set", async ({ chats, messages }) => {
    try {
      const record = await prisma.waSession.findUnique({ where: { userId } });
      if (!record) return;

      for (const chat of chats) {
        const waChat = await upsertChat(record.id, chat.id, {
          name: chat.name || null,
          isGroup: chat.id.endsWith("@g.us"),
          unreadCount: chat.unreadCount || 0,
        });
        emit("wa:chat:update", { chatId: waChat.id, jid: waChat.jid, name: waChat.name });
      }

      for (const msg of messages) {
        if (!msg.key?.remoteJid) continue;
        const waChat = await upsertChat(record.id, msg.key.remoteJid, {
          isGroup: msg.key.remoteJid.endsWith("@g.us"),
        });
        const saved = await persistMessage(sock, record.id, waChat, msg);
        if (saved) emit("wa:message:new", { chatId: waChat.id, message: serializeMessage(saved) });
      }
    } catch (err) {
      console.error("messaging-history.set error:", err);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const record = await prisma.waSession.findUnique({ where: { userId } });
      if (!record) return;

      for (const msg of messages) {
        if (!msg.key?.remoteJid || msg.key.remoteJid === "status@broadcast") continue;

        const waChat = await upsertChat(record.id, msg.key.remoteJid, {
          isGroup: msg.key.remoteJid.endsWith("@g.us"),
          lastMessageAt: new Date(),
          ...(msg.key.fromMe ? {} : { unreadCount: { increment: 1 } }),
        });

        const saved = await persistMessage(sock, record.id, waChat, msg);
        if (saved) {
          emit("wa:message:new", { chatId: waChat.id, message: serializeMessage(saved) });
          emit("wa:chat:update", {
            chatId: waChat.id,
            jid: waChat.jid,
            unreadCount: waChat.unreadCount,
          });
        }
      }
    } catch (err) {
      console.error("messages.upsert error:", err);
    }
  });

  sock.ev.on("message-receipt.update", async (updates) => {
    for (const { key, receipt } of updates) {
      const status = receipt?.readTimestamp ? "read" : receipt?.receiptTimestamp ? "delivered" : null;
      if (!status) continue;
      try {
        await prisma.waMessage.updateMany({
          where: { waMessageId: key.id },
          data: { status },
        });
        emit("wa:message:status", { waMessageId: key.id, status });
      } catch (err) {
      }
    }
  });

  return sock;
}

function serializeMessage(m) {
  return {
    id: m.id,
    chatId: m.chatId,
    waMessageId: m.waMessageId,
    fromMe: m.fromMe,
    senderJid: m.senderJid,
    senderName: m.senderName,
    text: m.text,
    caption: m.caption,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    fileName: m.fileName,
    status: m.status,
    deleted: m.deleted,
    replyToWaId: m.replyToWaId,
    replyToText: m.replyToText,
    replyToSender: m.replyToSender,
    timestamp: m.timestamp,
  };
}

function buildQuotedStub(jid, replyToWaId, replyToText, fromMe) {
  if (!replyToWaId) return undefined;
  return {
    key: { remoteJid: jid, id: replyToWaId, fromMe: !!fromMe },
    message: { conversation: replyToText || "" },
  };
}

async function sendText(userId, jid, text, { replyToWaId, replyToText, replyFromMe } = {}) {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected") {
    throw new Error("WhatsApp is not connected. Please scan the QR code first.");
  }
  const quoted = buildQuotedStub(jid, replyToWaId, replyToText, replyFromMe);
  return session.sock.sendMessage(jid, { text }, quoted ? { quoted } : {});
}

async function sendMedia(
  userId,
  jid,
  { mediaUrl, mediaType, caption, fileName, mimeType, replyToWaId, replyToText, replyFromMe }
) {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected") {
    throw new Error("WhatsApp is not connected. Please scan the QR code first.");
  }
  const quoted = buildQuotedStub(jid, replyToWaId, replyToText, replyFromMe);

  let content;
  if (mediaType === "image") content = { image: { url: mediaUrl }, caption };
  else if (mediaType === "video") content = { video: { url: mediaUrl }, caption };
  else if (mediaType === "audio") content = { audio: { url: mediaUrl }, mimetype: mimeType || "audio/mp4" };
  else content = { document: { url: mediaUrl }, mimetype: mimeType, fileName: fileName || "file", caption };

  return session.sock.sendMessage(jid, content, quoted ? { quoted } : {});
}

async function startChatWithNumber(userId, rawNumber) {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected") {
    throw new Error("WhatsApp is not connected. Please scan the QR code first.");
  }

  const digits = rawNumber.replace(/[^0-9]/g, "");
  const [result] = await session.sock.onWhatsApp(digits);
  if (!result?.exists) {
    throw new Error("This number is not on WhatsApp.");
  }

  const sessionRecord = await prisma.waSession.findUnique({ where: { userId } });
  return upsertChat(sessionRecord.id, result.jid, {});
}

async function logoutSession(userId) {
  const session = sessions.get(userId);
  if (session) {
    try {
      await session.sock.logout();
    } catch {
    }
    sessions.delete(userId);
  }
  fs.rmSync(sessionDirFor(userId), { recursive: true, force: true });
  await prisma.waSession.updateMany({ where: { userId }, data: { status: "disconnected" } });
}

function getStatus(userId) {
  return sessions.get(userId)?.status || "disconnected";
}

module.exports = {
  startSession,
  sendText,
  sendMedia,
  startChatWithNumber,
  logoutSession,
  getStatus,
  getSession,
  serializeMessage,
};
