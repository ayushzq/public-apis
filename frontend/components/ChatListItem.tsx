"use client";

import { Check, CheckCheck, Image as ImageIcon, Star } from "lucide-react";
import { Conversation } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";
import { getConversationTitle, getLastMessage, formatListTimestamp, cn } from "@/lib/utils";

export default function ChatListItem({ conversation }: { conversation: Conversation }) {
  const { activeConversationId, selectConversation } = useChatStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id || "u0";

  const title = getConversationTitle(conversation, currentUserId);
  const lastMessage = getLastMessage(conversation);
  const otherUser = conversation.participants.find((p) => p.userId !== currentUserId)?.user;
  const isActive = activeConversationId === conversation.id;
  const isOwnLastMessage = lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={() => selectConversation(conversation.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-wa-border/40",
        isActive ? "bg-wa-active" : "hover:bg-wa-hover"
      )}
    >
      <Avatar name={title} src={conversation.avatar} size={49} online={otherUser?.onlineStatus} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[16px] text-wa-textPrimary truncate font-normal">{title}</span>
          <span
            className={cn(
              "text-xxs shrink-0 ml-2",
              conversation.unreadCount > 0 ? "text-wa-accentBright font-medium" : "text-wa-textSecondary"
            )}
          >
            {lastMessage ? formatListTimestamp(lastMessage.timestamp) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 min-w-0 text-[13.5px] text-wa-textSecondary">
            {isOwnLastMessage && lastMessage && (
              lastMessage.status === "read" ? (
                <CheckCheck size={16} className="tick-read shrink-0" />
              ) : lastMessage.status === "delivered" ? (
                <CheckCheck size={16} className="tick-sent shrink-0" />
              ) : (
                <Check size={16} className="tick-sent shrink-0" />
              )
            )}
            {lastMessage?.mediaType === "image" && <ImageIcon size={14} className="shrink-0" />}
            <span className="truncate">{lastMessage?.text || "No messages yet"}</span>
          </div>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 bg-wa-accentBright text-[#0b141a] text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shrink-0">
              {conversation.unreadCount}
            </span>
          )}
          {conversation.isFavorite && conversation.unreadCount === 0 && (
            <Star size={14} className="text-wa-textMuted shrink-0" fill="currentColor" />
          )}
        </div>
      </div>
    </button>
  );
}
