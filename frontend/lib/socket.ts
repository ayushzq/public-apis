import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Lazily creates a single Socket.io connection authenticated with the
 * user's JWT. The backend (backend/src/socket/index.js) verifies this
 * token on the `connection` event and joins the user to their
 * conversation rooms.
 */
export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("wa_token") : null;

    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
