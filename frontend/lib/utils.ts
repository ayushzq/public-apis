import { WaChat } from "@/types";

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

/** Real WhatsApp JIDs look like "91xxxxxxxxxx@s.whatsapp.net" — show the number. */
export function jidToPhoneNumber(jid: string): string {
  return jid.split("@")[0].split(":")[0];
}

export function getChatTitle(chat: WaChat): string {
  if (chat.name) return chat.name;
  return `+${jidToPhoneNumber(chat.jid)}`;
}

export function getLastMessage(chat: WaChat) {
  return chat.lastMessage || chat.messages?.[chat.messages.length - 1];
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
