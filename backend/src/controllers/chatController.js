const prisma = require("../config/prisma");

function serializeMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    status: m.status,
    deleted: m.deleted,
    timestamp: m.timestamp,
  };
}

function serializeUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    about: u.about,
    onlineStatus: u.onlineStatus,
    themePreference: u.themePreference,
  };
}

/** GET /api/chat/conversations */
async function getConversations(req, res) {
  try {
    const participants = await prisma.participant.findMany({
      where: { userId: req.userId, isArchived: false },
      include: {
        conversation: {
          include: {
            participants: { include: { user: true } },
            messages: { orderBy: { timestamp: "desc" }, take: 30 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const conversations = participants.map((p) => ({
      id: p.conversation.id,
      isGroup: p.conversation.isGroup,
      name: p.conversation.name,
      avatar: p.conversation.avatar,
      createdAt: p.conversation.createdAt,
      unreadCount: p.unreadCount,
      isFavorite: p.isFavorite,
      participants: p.conversation.participants.map((cp) => ({
        userId: cp.userId,
        conversationId: cp.conversationId,
        role: cp.role,
        user: serializeUser(cp.user),
      })),
      messages: p.conversation.messages.reverse().map(serializeMessage),
    }));

    return res.json({ conversations });
  } catch (err) {
    console.error("getConversations error:", err);
    return res.status(500).json({ message: "Could not load conversations." });
  }
}

/** GET /api/chat/conversations/:id/messages */
async function getMessages(req, res) {
  try {
    const { id } = req.params;

    const participant = await prisma.participant.findUnique({
      where: { userId_conversationId: { userId: req.userId, conversationId: id } },
    });
    if (!participant) {
      return res.status(403).json({ message: "You are not part of this conversation." });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: "asc" },
    });

    return res.json({ messages: messages.map(serializeMessage) });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ message: "Could not load messages." });
  }
}

/** POST /api/chat/conversations/:id/messages */
async function sendMessage(req, res) {
  try {
    const { id } = req.params;
    const { text, mediaUrl, mediaType } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const participant = await prisma.participant.findUnique({
      where: { userId_conversationId: { userId: req.userId, conversationId: id } },
    });
    if (!participant) {
      return res.status(403).json({ message: "You are not part of this conversation." });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: req.userId,
        text,
        mediaUrl,
        mediaType,
        status: "sent",
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Bump unread count for every other participant.
    await prisma.participant.updateMany({
      where: { conversationId: id, userId: { not: req.userId } },
      data: { unreadCount: { increment: 1 } },
    });

    // Real-time fan-out happens in socket/index.js via req.app.get("io").
    const io = req.app.get("io");
    if (io) io.to(`conversation:${id}`).emit("message:new", serializeMessage(message));

    return res.status(201).json({ message: serializeMessage(message) });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Could not send message." });
  }
}

/** POST /api/chat/conversations */
async function createConversation(req, res) {
  try {
    const { participantIds, isGroup, name } = req.body;
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: "At least one participant is required." });
    }

    const allIds = Array.from(new Set([req.userId, ...participantIds]));

    // For 1:1 chats, reuse an existing conversation if one already exists.
    if (!isGroup && allIds.length === 2) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { every: { userId: { in: allIds } } },
          AND: allIds.map((uid) => ({ participants: { some: { userId: uid } } })),
        },
      });
      if (existing) {
        return res.json({ conversationId: existing.id, reused: true });
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: !!isGroup,
        name: isGroup ? name : undefined,
        participants: {
          create: allIds.map((uid) => ({
            userId: uid,
            role: uid === req.userId && isGroup ? "admin" : "member",
          })),
        },
      },
    });

    return res.status(201).json({ conversationId: conversation.id, reused: false });
  } catch (err) {
    console.error("createConversation error:", err);
    return res.status(500).json({ message: "Could not create conversation." });
  }
}

module.exports = { getConversations, getMessages, sendMessage, createConversation };
