"use client";

import { useChatStore } from "@/store/useChatStore";
import ChatWindow from "./ChatWindow";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";

export default function RightPanel() {
  const { conversations, activeConversationId, isMobileViewingChat } = useChatStore();
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div
      className={cn(
        "flex-1 h-full min-w-0",
        isMobileViewingChat ? "flex" : "hidden md:flex"
      )}
    >
      {activeConversation ? <ChatWindow conversation={activeConversation} /> : <EmptyState />}
    </div>
  );
}
