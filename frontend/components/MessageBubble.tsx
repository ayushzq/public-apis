"use client";

import { useState } from "react";
import { Check, CheckCheck, FileText, Reply, Download } from "lucide-react";
import { WaMessage } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import { formatMessageTime, cn } from "@/lib/utils";

export default function MessageBubble({ message }: { message: WaMessage }) {
  const { setReplyTarget } = useChatStore();
  const [hover, setHover] = useState(false);
  const isOwn = message.fromMe;

  const handleReply = () => {
    setReplyTarget({
      waMessageId: message.waMessageId,
      text: message.text || message.caption || (message.mediaType ? `[${message.mediaType}]` : ""),
      fromMe: message.fromMe,
      senderName: message.senderName,
    });
  };

  return (
    <div
      className={cn("flex w-full mb-1.5 group", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isOwn && (
        <button
          onClick={handleReply}
          aria-label="Reply"
          className={cn(
            "self-center mr-1 text-wa-textSecondary hover:text-wa-textPrimary transition-opacity",
            hover ? "opacity-100" : "opacity-0"
          )}
        >
          <Reply size={16} />
        </button>
      )}

      <div
        className={cn(
          "relative max-w-[65%] px-2.5 py-[6px] rounded-bubble text-[14.5px] leading-snug shadow-sm",
          isOwn
            ? "bg-wa-bubbleOut text-wa-textPrimary bubble-tail-out rounded-tr-none"
            : "bg-wa-bubbleIn text-wa-textPrimary bubble-tail-in rounded-tl-none"
        )}
      >
        {message.replyToWaId && (
          <div
            className={cn(
              "mb-1.5 pl-2 pr-2 py-1.5 rounded-md border-l-4 text-[12.5px] truncate",
              isOwn ? "bg-black/10 border-wa-accentBright" : "bg-black/20 border-wa-accent"
            )}
          >
            <p className="text-wa-accentBright font-medium truncate">
              {message.replyToSender ? message.replyToSender : message.fromMe ? "You" : "Contact"}
            </p>
            <p className="text-wa-textSecondary truncate">{message.replyToText}</p>
          </div>
        )}

        {message.deleted ? (
          <span className="italic text-wa-textSecondary text-[13.5px]">This message was deleted</span>
        ) : (
          <MessageContent message={message} />
        )}

        <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 translate-y-1.5">
          <span className="text-[11px] text-wa-textSecondary/80">{formatMessageTime(message.timestamp)}</span>
          {isOwn &&
            !message.deleted &&
            (message.status === "read" ? (
              <CheckCheck size={15} className="tick-read" />
            ) : message.status === "delivered" ? (
              <CheckCheck size={15} className="tick-sent" />
            ) : (
              <Check size={15} className="tick-sent" />
            ))}
        </span>
      </div>

      {!isOwn && (
        <button
          onClick={handleReply}
          aria-label="Reply"
          className={cn(
            "self-center ml-1 text-wa-textSecondary hover:text-wa-textPrimary transition-opacity",
            hover ? "opacity-100" : "opacity-0"
          )}
        >
          <Reply size={16} />
        </button>
      )}
    </div>
  );
}

function MessageContent({ message }: { message: WaMessage }) {
  if (message.mediaType === "image" || message.mediaType === "sticker") {
    return (
      <div className="max-w-[260px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={message.mediaUrl || undefined}
          alt={message.caption || "photo"}
          className="rounded-md w-full h-auto mb-1 object-cover"
        />
        {message.caption && <p className="whitespace-pre-wrap break-words">{message.caption}</p>}
      </div>
    );
  }

  if (message.mediaType === "video") {
    return (
      <div className="max-w-[260px]">
        <video src={message.mediaUrl || undefined} controls className="rounded-md w-full mb-1" />
        {message.caption && <p className="whitespace-pre-wrap break-words">{message.caption}</p>}
      </div>
    );
  }

  if (message.mediaType === "audio") {
    return <audio src={message.mediaUrl || undefined} controls className="max-w-[240px]" />;
  }

  if (message.mediaType === "document") {
    return (
      <a
        href={message.mediaUrl || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-black/10 rounded-md px-3 py-2 min-w-[200px]"
      >
        <FileText size={22} className="text-wa-danger shrink-0" />
        <span className="truncate text-[13.5px] flex-1">{message.fileName || "Document"}</span>
        <Download size={16} className="shrink-0 text-wa-textSecondary" />
      </a>
    );
  }

  return <span className="whitespace-pre-wrap break-words">{message.text}</span>;
}
