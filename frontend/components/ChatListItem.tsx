"use client";

import { Check, CheckCheck, Image as ImageIcon, Star, FileText, Mic, Video } from "lucide-react";
import { WaChat } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import Avatar from "./Avatar";
import { getChatTitle, getLastMessage, formatListTimestamp, cn } from "@/lib/utils";

const MEDIA_ICON: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Mic,
  document: FileText,
  sticker: ImageIcon,
};

export default function ChatListItem({ chat }: { chat: WaChat }) {
  const { activeChatId, selectConversation } = useChatStore();

  const title = getChatTitle(chat);
  const lastMessage = getLastMessage(chat);
  const isActive = activeChatId === chat.id;
  const MediaIcon = lastMessage?.mediaType ? MEDIA_ICON[lastMessage.mediaType] : null;

  const preview = lastMessage
    ? lastMessage.deleted
      ? "This message was deleted"
      : lastMessage.text || lastMessage.caption || (lastMessage.mediaType ? capitalize(lastMessage.mediaType) : "")
    : "No messages yet";

  return (
    <button
      onClick={() => selectConversation(chat.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-wa-border/40",
        isActive ? "bg-wa-active" : "hover:bg-wa-hover"
      )}
    >
      <Avatar name={title} src={chat.avatarUrl} size={49} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[16px] text-wa-textPrimary truncate font-normal">{title}</span>
          <span
            className={cn(
              "text-xxs shrink-0 ml-2",
              chat.unreadCount > 0 ? "text-wa-accentBright font-medium" : "text-wa-textSecondary"
            )}
          >
            {lastMessage ? formatListTimestamp(lastMessage.timestamp) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 min-w-0 text-[13.5px] text-wa-textSecondary">
            {lastMessage?.fromMe &&
              (lastMessage.status === "read" ? (
                <CheckCheck size={16} className="tick-read shrink-0" />
              ) : lastMessage.status === "delivered" ? (
                <CheckCheck size={16} className="tick-sent shrink-0" />
              ) : (
                <Check size={16} className="tick-sent shrink-0" />
              ))}
            {MediaIcon && <MediaIcon size={14} className="shrink-0" />}
            <span className="truncate">{preview}</span>
          </div>
          {chat.unreadCount > 0 ? (
            <span className="ml-2 bg-wa-accentBright text-[#0b141a] text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shrink-0">
              {chat.unreadCount}
            </span>
          ) : chat.isFavorite ? (
            <Star size={14} className="text-wa-textMuted shrink-0" fill="currentColor" />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
