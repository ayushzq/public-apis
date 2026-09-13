"use client";

import { useRef, useState } from "react";
import { Smile, Paperclip, Mic, Send, X, FileText, Reply } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

export default function MessageInput({ chatId }: { chatId: string }) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, sendMediaMessage, replyTarget, setReplyTarget } = useChatStore();

  const clearAttachment = () => {
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFilePicked = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null);
  };

  const handleSend = async () => {
    if (pendingFile) {
      const file = pendingFile;
      const cap = caption;
      clearAttachment();
      await sendMediaMessage(chatId, file, cap || undefined);
      return;
    }
    if (!text.trim()) return;
    const value = text;
    setText("");
    await sendMessage(chatId, value);
  };

  return (
    <div className="shrink-0 bg-wa-header">
      {replyTarget && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-wa-border/40">
          <Reply size={16} className="text-wa-accentBright shrink-0" />
          <div className="flex-1 min-w-0 bg-wa-panelInput/60 rounded px-3 py-1.5 border-l-4 border-wa-accentBright">
            <p className="text-[12.5px] text-wa-accentBright font-medium">
              {replyTarget.fromMe ? "You" : replyTarget.senderName || "Contact"}
            </p>
            <p className="text-[12.5px] text-wa-textSecondary truncate">{replyTarget.text}</p>
          </div>
          <button onClick={() => setReplyTarget(null)} aria-label="Cancel reply" className="text-wa-textSecondary">
            <X size={18} />
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="flex items-center gap-3 px-4 pt-2 pb-1 border-t border-wa-border/40">
          {previewUrl ? (
            pendingFile.type.startsWith("video/") ? (
              <video src={previewUrl} className="w-12 h-12 rounded object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="attachment preview" className="w-12 h-12 rounded object-cover" />
            )
          ) : (
            <div className="w-12 h-12 rounded bg-wa-chipBg flex items-center justify-center text-wa-danger">
              <FileText size={20} />
            </div>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            className="flex-1 bg-transparent outline-none text-[14px] text-wa-textPrimary placeholder:text-wa-textSecondary"
          />
          <button onClick={clearAttachment} aria-label="Remove attachment" className="text-wa-textSecondary">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Docked, flat compose row — matches real WhatsApp Web: no floating
          pill container, icons sit directly on the header-colored bar. */}
      <div className="flex items-end gap-4 px-3 py-2 min-h-[52px]">
        <button aria-label="Emoji" className="text-wa-textSecondary hover:text-wa-textPrimary pb-0.5">
          <Smile size={24} />
        </button>
        <button
          aria-label="Attach"
          onClick={() => fileInputRef.current?.click()}
          className="text-wa-textSecondary hover:text-wa-textPrimary pb-0.5"
        >
          <Paperclip size={22} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFilePicked(e.target.files?.[0] || null)}
        />

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
          className="flex-1 bg-transparent outline-none resize-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary max-h-28 py-1.5"
        />

        {text.trim() || pendingFile ? (
          <button onClick={handleSend} aria-label="Send" className="text-wa-accentBright pb-0.5">
            <Send size={22} />
          </button>
        ) : (
          <button aria-label="Voice message" className="text-wa-textSecondary hover:text-wa-textPrimary pb-0.5">
            <Mic size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
