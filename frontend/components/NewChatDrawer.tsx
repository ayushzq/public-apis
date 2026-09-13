"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Search, UsersRound } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import Avatar from "./Avatar";
import { getChatTitle } from "@/lib/utils";

export default function NewChatDrawer() {
  const { isNewChatDrawerOpen, closeNewChatDrawer, chats, selectConversationFromDrawer, startChatWithNumber, linkError } =
    useChatStore();
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState(false);

  const existingMatches = useMemo(() => {
    if (!query.trim()) return chats;
    return chats.filter((c) => getChatTitle(c).toLowerCase().includes(query.toLowerCase()));
  }, [chats, query]);

  const looksLikeNumber = /^[0-9+\s-]{6,}$/.test(query.trim());

  const handleStartWithNumber = async () => {
    setStarting(true);
    const chatId = await startChatWithNumber(query.trim());
    setStarting(false);
    if (chatId) {
      selectConversationFromDrawer(chatId);
      setQuery("");
    }
  };

  return (
    <AnimatePresence>
      {isNewChatDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeNewChatDrawer}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed left-0 top-0 h-full w-full sm:w-[400px] bg-wa-panelBg z-50 flex flex-col shadow-2xl"
          >
            <div className="px-4 py-4 flex items-center gap-4 border-b border-wa-border">
              <button onClick={closeNewChatDrawer} className="text-wa-textPrimary">
                <ArrowLeft size={22} />
              </button>
              <p className="text-lg font-medium text-wa-textPrimary">New chat</p>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-3 bg-wa-header rounded-lg px-3 py-1.5">
                <Search size={16} className="text-wa-textSecondary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or enter a phone number"
                  className="bg-transparent outline-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary w-full"
                />
              </div>
            </div>

            {linkError && <p className="text-wa-danger text-[13px] px-4 mb-1">{linkError}</p>}

            {looksLikeNumber && (
              <button
                onClick={handleStartWithNumber}
                disabled={starting}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-wa-hover disabled:opacity-60"
              >
                <span className="w-10 h-10 rounded-full bg-wa-accent flex items-center justify-center text-white">
                  <UsersRound size={18} />
                </span>
                <p className="text-[15px] text-wa-textPrimary">
                  {starting ? "Checking on WhatsApp…" : `Message ${query.trim()}`}
                </p>
              </button>
            )}

            <div className="h-px bg-wa-border my-1" />

            <div className="flex-1 overflow-y-auto">
              <p className="px-4 pt-2 pb-1 text-[13px] text-wa-textSecondary">Your chats</p>
              {existingMatches.length === 0 ? (
                <p className="px-4 py-3 text-[13.5px] text-wa-textSecondary">
                  No matching chats yet — type a full phone number above to start a new one.
                </p>
              ) : (
                existingMatches.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => selectConversationFromDrawer(chat.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-hover"
                  >
                    <Avatar name={getChatTitle(chat)} src={chat.avatarUrl} size={40} />
                    <p className="text-[15px] text-wa-textPrimary">{getChatTitle(chat)}</p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
