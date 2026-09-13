"use client";

import { useEffect, useRef } from "react";
import { Conversation } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function ChatWindow({ conversation }: { conversation: Conversation }) {
  const { user } = useAuthStore();
  const currentUserId = user?.id || "u0";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader conversation={conversation} />

      <div className="flex-1 overflow-y-auto chat-bg-pattern px-4 md:px-10 py-4">
        {conversation.messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.senderId === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={conversation.id} />
    </div>
  );
}
