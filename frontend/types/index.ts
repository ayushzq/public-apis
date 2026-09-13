export type MessageStatus = "sent" | "delivered" | "read";
export type MediaType = "image" | "video" | "audio" | "document" | "sticker";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  about?: string;
  onlineStatus: boolean;
  themePreference: "light" | "dark";
}

/** A single real WhatsApp message, synced live from the backend/Baileys. */
export interface WaMessage {
  id: string;
  chatId: string;
  waMessageId: string;
  fromMe: boolean;
  senderJid?: string | null;
  senderName?: string | null;
  text?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  fileName?: string | null;
  status: MessageStatus;
  deleted?: boolean;
  replyToWaId?: string | null;
  replyToText?: string | null;
  replyToSender?: string | null;
  timestamp: string;
}

/** A real WhatsApp chat (1:1 or group) belonging to the linked account. */
export interface WaChat {
  id: string;
  jid: string;
  name?: string | null;
  isGroup: boolean;
  avatarUrl?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  unreadCount: number;
  lastMessageAt?: string | null;
  lastMessage?: WaMessage | null;
  messages: WaMessage[];
}

export type FilterChip = "All" | "Unread" | "Favorites" | "Groups";

export type ActiveRailTab =
  | "chats"
  | "calls"
  | "status"
  | "channels"
  | "communities"
  | "settings";

export type WaConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected";

/** What the compose box is currently attaching, before it's sent. */
export interface PendingAttachment {
  file: File;
  previewUrl: string;
  mediaType: MediaType;
}

/** The message currently being replied to, shown above the compose box. */
export interface ReplyTarget {
  waMessageId: string;
  text: string;
  fromMe: boolean;
  senderName?: string | null;
}
