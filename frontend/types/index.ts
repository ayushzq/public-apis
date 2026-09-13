export type MessageStatus = "sent" | "delivered" | "read";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  about?: string;
  onlineStatus: boolean;
  lastSeen?: string;
  themePreference: "light" | "dark";
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
  status: MessageStatus;
  timestamp: string;
  deleted?: boolean;
}

export interface Participant {
  userId: string;
  conversationId: string;
  role: "admin" | "member";
  user: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string; // for groups
  avatar?: string | null;
  createdAt: string;
  participants: Participant[];
  messages: Message[];
  unreadCount: number;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

export type FilterChip = "All" | "Unread" | "Favorites" | "Groups";

export type ActiveRailTab =
  | "chats"
  | "calls"
  | "status"
  | "channels"
  | "communities"
  | "settings";

export interface CallLogEntry {
  id: string;
  name: string;
  avatar?: string | null;
  type: "voice" | "video";
  direction: "incoming" | "outgoing" | "missed";
  count: number;
  timestamp: string;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  name: string;
  avatar?: string | null;
  mediaUrl: string;
  createdAt: string;
  viewed: boolean;
}

export interface ChannelSummary {
  id: string;
  name: string;
  avatar?: string | null;
  followers: string;
  verified: boolean;
}
