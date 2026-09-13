"use client";

import { useChatStore } from "@/store/useChatStore";
import ChatWindow from "./ChatWindow";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";

export default function RightPanel() {
  const { chats, activeChatId, isMobileViewingChat } = useChatStore();
  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className={cn("flex-1 h-full min-w-0", isMobileViewingChat ? "flex" : "hidden md:flex")}>
      {activeChat ? <ChatWindow chat={activeChat} /> : <EmptyState />}
    </div>
  );
}
