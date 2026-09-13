"use client";

import { useState } from "react";
import { Smile, Paperclip, Mic, Send } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

export default function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const { sendMessage } = useChatStore();

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(conversationId, text);
    setText("");
  };

  return (
    <div className="flex items-end gap-2 px-3 py-2.5 bg-wa-header shrink-0">
      <button aria-label="Emoji" className="text-wa-textSecondary hover:text-wa-textPrimary mb-1.5">
        <Smile size={24} />
      </button>
      <button aria-label="Attach" className="text-wa-textSecondary hover:text-wa-textPrimary mb-1.5">
        <Paperclip size={22} />
      </button>
      <div className="flex-1 bg-wa-panelInput rounded-lg px-3 py-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message"
          rows={1}
          className="w-full bg-transparent outline-none resize-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary max-h-28"
        />
      </div>
      {text.trim() ? (
        <button
          onClick={handleSend}
          aria-label="Send"
          className="text-wa-textSecondary hover:text-wa-accentBright mb-1.5"
        >
          <Send size={22} />
        </button>
      ) : (
        <button aria-label="Voice message" className="text-wa-textSecondary hover:text-wa-textPrimary mb-1.5">
          <Mic size={22} />
        </button>
      )}
    </div>
  );
}
