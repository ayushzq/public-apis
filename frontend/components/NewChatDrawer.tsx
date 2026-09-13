"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Search, UsersRound, UserPlus, Users } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";
import { getOtherParticipant } from "@/lib/utils";

const ACTIONS = [
  { icon: UsersRound, label: "New group" },
  { icon: UserPlus, label: "New contact" },
  { icon: Users, label: "New community" },
];

export default function NewChatDrawer() {
  const { isNewChatDrawerOpen, closeNewChatDrawer, conversations, selectConversation } = useChatStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");

  const contacts = useMemo(() => {
    const currentUserId = user?.id || "u0";
    const names = conversations
      .filter((c) => !c.isGroup)
      .map((c) => ({ conv: c, person: getOtherParticipant(c, currentUserId) }))
      .filter((x) => x.person)
      .sort((a, b) => (a.person!.name > b.person!.name ? 1 : -1));

    if (!query.trim()) return names;
    return names.filter((x) => x.person!.name.toLowerCase().includes(query.toLowerCase()));
  }, [conversations, user, query]);

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
                  placeholder="Search name, number or @username"
                  className="bg-transparent outline-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary w-full"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {ACTIONS.map(({ icon: Icon, label }) => (
                <button key={label} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-wa-hover">
                  <span className="w-10 h-10 rounded-full bg-wa-accent flex items-center justify-center text-white">
                    <Icon size={18} />
                  </span>
                  <p className="text-[15px] text-wa-textPrimary">{label}</p>
                </button>
              ))}

              <div className="h-px bg-wa-border my-1" />

              {contacts.map(({ conv, person }) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    closeNewChatDrawer();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-hover"
                >
                  <Avatar name={person!.name} size={40} />
                  <p className="text-[15px] text-wa-textPrimary">{person!.name}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
