import { Conversation, User } from "@/types";

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatListTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getOtherParticipant(conversation: Conversation, currentUserId: string): User | undefined {
  return conversation.participants.find((p) => p.userId !== currentUserId)?.user;
}

export function getConversationTitle(conversation: Conversation, currentUserId: string): string {
  if (conversation.isGroup) return conversation.name || "Group";
  return getOtherParticipant(conversation, currentUserId)?.name || "Unknown";
}

export function getLastMessage(conversation: Conversation) {
  return conversation.messages[conversation.messages.length - 1];
}

export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
