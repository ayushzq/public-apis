"use client";

import { ArrowLeft, Video, Phone, Search, MoreVertical } from "lucide-react";
import { Conversation } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";
import { getConversationTitle, getOtherParticipant } from "@/lib/utils";

export default function ChatHeader({ conversation }: { conversation: Conversation }) {
  const { backToList, openMediaModal } = useChatStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id || "u0";
  const title = getConversationTitle(conversation, currentUserId);
  const other = getOtherParticipant(conversation, currentUserId);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-wa-header border-b border-wa-border shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={backToList} className="md:hidden text-wa-textSecondary" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <button onClick={openMediaModal} className="flex items-center gap-3 min-w-0">
          <Avatar name={title} src={conversation.avatar} size={40} online={other?.onlineStatus} />
          <div className="min-w-0 text-left">
            <p className="text-[15.5px] text-wa-textPrimary truncate leading-tight">{title}</p>
            <p className="text-[12.5px] text-wa-textSecondary truncate leading-tight">
              {other?.onlineStatus ? "online" : "last seen recently"}
            </p>
          </div>
        </button>
      </div>
      <div className="flex items-center gap-5 text-wa-textSecondary pr-1">
        <button aria-label="Video call" className="hover:text-wa-textPrimary">
          <Video size={20} />
        </button>
        <button aria-label="Voice call" className="hover:text-wa-textPrimary">
          <Phone size={19} />
        </button>
        <button aria-label="Search in chat" className="hover:text-wa-textPrimary">
          <Search size={19} />
        </button>
        <button aria-label="Menu" className="hover:text-wa-textPrimary">
          <MoreVertical size={19} />
        </button>
      </div>
    </div>
  );
}
