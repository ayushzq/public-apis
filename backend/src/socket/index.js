const jwt = require("jsonwebtoken");

/**
 * Wires up Socket.io:
 *  - Authenticates each socket with the app JWT (same one from OTP login).
 *  - Joins the socket to a private `user:<userId>` room so
 *    baileysManager.js can push real WhatsApp events (QR, connection
 *    state, live messages) to exactly the right browser tab.
 *  - Relays lightweight UI signals (typing indicators) — everything
 *    else (messages, receipts, chat updates) is emitted directly from
 *    baileysManager since it's driven by real WhatsApp events, not by
 *    one client talking to another.
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

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("typing:start", ({ chatId }) => {
      socket.to(`user:${socket.userId}`).emit("typing:update", { chatId, typing: true });
    });

    socket.on("typing:stop", ({ chatId }) => {
      socket.to(`user:${socket.userId}`).emit("typing:update", { chatId, typing: false });
    });

    socket.on("disconnect", () => {
      // Baileys connection is intentionally NOT torn down here — it keeps
      // running server-side so messages keep syncing even if every
      // browser tab is closed, exactly like the real WhatsApp Web.
    });
  });
}

module.exports = { initSocket };
