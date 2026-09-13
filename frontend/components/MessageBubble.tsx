"use client";

import { Check, CheckCheck } from "lucide-react";
import { Message } from "@/types";
import { formatMessageTime, cn } from "@/lib/utils";

export default function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={cn("flex w-full mb-1.5", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[65%] px-2.5 py-[6px] rounded-bubble text-[14.5px] leading-snug shadow-sm",
          isOwn
            ? "bg-wa-bubbleOut text-wa-textPrimary bubble-tail-out rounded-tr-none"
            : "bg-wa-bubbleIn text-wa-textPrimary bubble-tail-in rounded-tl-none"
        )}
      >
        {message.deleted ? (
          <span className="italic text-wa-textSecondary text-[13.5px]">This message was deleted</span>
        ) : (
          <span className="whitespace-pre-wrap break-words">{message.text}</span>
        )}
        <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 translate-y-1.5">
          <span className="text-[11px] text-wa-textSecondary/80">{formatMessageTime(message.timestamp)}</span>
          {isOwn && !message.deleted && (
            message.status === "read" ? (
              <CheckCheck size={15} className="tick-read" />
            ) : message.status === "delivered" ? (
              <CheckCheck size={15} className="tick-sent" />
            ) : (
              <Check size={15} className="tick-sent" />
            )
          )}
        </span>
      </div>
    </div>
  );
}
