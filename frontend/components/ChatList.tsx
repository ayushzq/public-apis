"use client";

import { Search, MoreVertical, MessageSquarePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import ChatListItem from "./ChatListItem";
import FilterChips from "./FilterChips";
import ThreeDotMenu from "./ThreeDotMenu";
import { getChatTitle, getLastMessage } from "@/lib/utils";

export default function ChatList() {
  const {
    chats,
    activeFilter,
    searchQuery,
    setSearchQuery,
    openNewChatDrawer,
    isThreeDotMenuOpen,
    toggleThreeDotMenu,
  } = useChatStore();
  const [, setShowSearchMenu] = useState(false);

  const filtered = useMemo(() => {
    let list = [...chats];

    if (activeFilter === "Unread") list = list.filter((c) => c.unreadCount > 0);
    if (activeFilter === "Favorites") list = list.filter((c) => c.isFavorite);
    if (activeFilter === "Groups") list = list.filter((c) => c.isGroup);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => getChatTitle(c).toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      const aTime = getLastMessage(a)?.timestamp || a.lastMessageAt || "";
      const bTime = getLastMessage(b)?.timestamp || b.lastMessageAt || "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats, activeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">WhatsApp</h1>
        <div className="flex items-center gap-4 text-wa-textSecondary relative">
          <button aria-label="New chat" onClick={openNewChatDrawer} className="hover:text-wa-textPrimary">
            <MessageSquarePlus size={21} />
          </button>
          <button aria-label="Menu" onClick={toggleThreeDotMenu} className="hover:text-wa-textPrimary">
            <MoreVertical size={21} />
          </button>
          {isThreeDotMenuOpen && <ThreeDotMenu />}
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-3 bg-wa-header rounded-lg px-3 py-1.5">
          <Search size={16} className="text-wa-textSecondary shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchMenu(true)}
            onBlur={() => setShowSearchMenu(false)}
            placeholder="Search or start a new chat"
            className="bg-transparent outline-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary w-full"
          />
        </div>
      </div>

      <FilterChips />

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="text-center text-wa-textSecondary text-sm mt-10 px-6">
            Syncing your real chats from WhatsApp… this can take a few seconds right after linking.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-wa-textSecondary text-sm mt-10 px-6">
            No chats match this filter yet.
          </div>
        ) : (
          filtered.map((c) => <ChatListItem key={c.id} chat={c} />)
        )}
      </div>
    </div>
  );
}
