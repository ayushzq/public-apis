const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/**
 * Wires up a Socket.io server instance:
 *  - Authenticates each socket with the same JWT used by the REST API.
 *  - Joins the user to a room per conversation they belong to, so
 *    chatController.sendMessage can fan out `message:new` events.
 *  - Tracks online/offline presence and broadcasts it to contacts.
 *  - Handles typing indicators and read-receipt updates.
 */
function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    try {
      // Join every conversation room this user is part of.
      const participants = await prisma.participant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      participants.forEach((p) => socket.join(`conversation:${p.conversationId}`));

      await prisma.user.update({
        where: { id: userId },
        data: { onlineStatus: true },
      });

      socket.broadcast.emit("presence:update", { userId, online: true });
    } catch (err) {
      console.error("socket connection setup error:", err);
    }

    // Client tells the server it's typing in a given conversation.
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        userId,
        typing: true,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        userId,
        typing: false,
      });
    });

    // Client acknowledges it has read messages up to a point.
    socket.on("message:read", async ({ conversationId, messageId }) => {
      try {
        await prisma.message.updateMany({
          where: { conversationId, id: messageId },
          data: { status: "read" },
        });
        await prisma.participant.updateMany({
          where: { conversationId, userId },
          data: { unreadCount: 0 },
        });
        io.to(`conversation:${conversationId}`).emit("message:status", {
          conversationId,
          messageId,
          status: "read",
        });
      } catch (err) {
        console.error("message:read error:", err);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { onlineStatus: false, lastSeenAt: new Date() },
        });
        socket.broadcast.emit("presence:update", { userId, online: false });
      } catch (err) {
        console.error("socket disconnect error:", err);
      }
    });
  });
}

module.exports = { initSocket };
