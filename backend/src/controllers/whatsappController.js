const prisma = require("../config/prisma");
const baileys = require("../whatsapp/baileysManager");
const { uploadBuffer } = require("../utils/cloudinary");

function serializeChat(c) {
  return {
    id: c.id,
    jid: c.jid,
    name: c.name,
    isGroup: c.isGroup,
    avatarUrl: c.avatarUrl,
    isFavorite: c.isFavorite,
    isArchived: c.isArchived,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt,
  };
}

/** POST /api/wa/connect — (re)starts the Baileys session.
 *  Body: { phoneNumber? } — if given, requests a real pairing code
 *  ("wa:pairing-code" over socket) instead of a QR ("wa:qr").
 */
async function connect(req, res) {
  try {
    const io = req.app.get("io");
    const { phoneNumber } = req.body || {};
    await baileys.startSession(req.userId, io, phoneNumber);
    return res.json({ status: baileys.getStatus(req.userId) });
  } catch (err) {
    console.error("wa connect error:", err);
    return res.status(500).json({ message: "Could not start WhatsApp session." });
  }
}

/** GET /api/wa/status */
async function status(req, res) {
  try {
    const record = await prisma.waSession.findUnique({ where: { userId: req.userId } });
    return res.json({
      status: record?.status || "disconnected",
      phoneNumber: record?.phoneNumber || null,
      waName: record?.waName || null,
    });
  } catch (err) {
    console.error("wa status error:", err);
    return res.status(500).json({ message: "Could not read WhatsApp status." });
  }
}

/** POST /api/wa/logout — unlinks the device, deletes local session files. */
async function logout(req, res) {
  try {
    await baileys.logoutSession(req.userId);
    return res.json({ message: "Logged out." });
  } catch (err) {
    console.error("wa logout error:", err);
    return res.status(500).json({ message: "Could not log out." });
  }
}

/** GET /api/wa/chats — real chats for this user's linked WhatsApp account. */
async function getChats(req, res) {
  try {
    const session = await prisma.waSession.findUnique({ where: { userId: req.userId } });
    if (!session) return res.json({ chats: [] });

    const chats = await prisma.waChat.findMany({
      where: { sessionId: session.id, isArchived: false },
      orderBy: { lastMessageAt: "desc" },
      include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } },
    });

    return res.json({
      chats: chats.map((c) => ({
        ...serializeChat(c),
        lastMessage: c.messages[0] ? baileys.serializeMessage(c.messages[0]) : null,
      })),
    });
  } catch (err) {
    console.error("getChats error:", err);
    return res.status(500).json({ message: "Could not load chats." });
  }
}

/** GET /api/wa/chats/:chatId/messages */
async function getMessages(req, res) {
  try {
    const { chatId } = req.params;
    const session = await prisma.waSession.findUnique({ where: { userId: req.userId } });
    const chat = await prisma.waChat.findFirst({ where: { id: chatId, sessionId: session?.id } });
    if (!chat) return res.status(404).json({ message: "Chat not found." });

    const messages = await prisma.waMessage.findMany({
      where: { chatId },
      orderBy: { timestamp: "asc" },
      take: 200,
    });

    return res.json({ messages: messages.map(baileys.serializeMessage) });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ message: "Could not load messages." });
  }
}

/** POST /api/wa/chats/:chatId/messages — send text, optionally as a reply. */
async function sendMessage(req, res) {
  try {
    const { chatId } = req.params;
    const { text, replyToWaId, replyToText, replyFromMe } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Message text is required." });

    const session = await prisma.waSession.findUnique({ where: { userId: req.userId } });
    const chat = await prisma.waChat.findFirst({ where: { id: chatId, sessionId: session?.id } });
    if (!chat) return res.status(404).json({ message: "Chat not found." });

    await baileys.sendText(req.userId, chat.jid, text, { replyToWaId, replyToText, replyFromMe });
    return res.status(202).json({ message: "Sent." });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(400).json({ message: err.message || "Could not send message." });
  }
}

/**
 * POST /api/wa/chats/:chatId/media — multipart upload (field "file") +
 * optional "caption", "replyToWaId", "replyToText". Uploads to Cloudinary
 * first, then sends the resulting URL as a real WhatsApp media message.
 */
async function sendMediaMessage(req, res) {
  try {
    const { chatId } = req.params;
    const { caption, replyToWaId, replyToText, replyFromMe } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const session = await prisma.waSession.findUnique({ where: { userId: req.userId } });
    const chat = await prisma.waChat.findFirst({ where: { id: chatId, sessionId: session?.id } });
    if (!chat) return res.status(404).json({ message: "Chat not found." });

    const mediaType = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("video/")
      ? "video"
      : req.file.mimetype.startsWith("audio/")
      ? "audio"
      : "document";

    const uploaded = await uploadBuffer(req.file.buffer, {
      mediaType,
      folder: `whatsapp-clone/${session.id}`,
      filename: req.file.originalname,
    });

    await baileys.sendMedia(req.userId, chat.jid, {
      mediaUrl: uploaded.secureUrl,
      mediaType,
      caption,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      replyToWaId,
      replyToText,
      replyFromMe,
    });

    return res.status(202).json({ message: "Sent.", mediaUrl: uploaded.secureUrl });
  } catch (err) {
    console.error("sendMediaMessage error:", err);
    return res.status(400).json({ message: err.message || "Could not send media." });
  }
}

/** POST /api/wa/chats/start — { phoneNumber } → verifies + creates a real chat. */
async function startChat(req, res) {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber?.trim()) return res.status(400).json({ message: "Phone number is required." });
    const chat = await baileys.startChatWithNumber(req.userId, phoneNumber);
    return res.status(201).json({ chat: serializeChat(chat) });
  } catch (err) {
    console.error("startChat error:", err);
    return res.status(400).json({ message: err.message || "Could not start chat." });
  }
}

module.exports = {
  connect,
  status,
  logout,
  getChats,
  getMessages,
  sendMessage,
  sendMediaMessage,
  startChat,
};
