"use client";

import { useEffect, useRef } from "react";
import { WaChat } from "@/types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function ChatWindow({ chat }: { chat: WaChat }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader chat={chat} />

      <div className="flex-1 overflow-y-auto chat-bg-pattern px-4 md:px-10 py-4">
        {chat.messages.length === 0 ? (
          <div className="text-center text-wa-textSecondary text-sm mt-10">
            No messages yet in this chat.
          </div>
        ) : (
          chat.messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput chatId={chat.id} />
    </div>
  );
}
