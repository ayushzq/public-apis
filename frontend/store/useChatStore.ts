import { create } from "zustand";
import { Conversation, Message, FilterChip, ActiveRailTab } from "@/types";
import { mockConversations } from "@/data/mockData";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeRailTab: ActiveRailTab;
  activeFilter: FilterChip;
  searchQuery: string;
  theme: "light" | "dark";

  // drawers / modals
  isSettingsDrawerOpen: boolean;
  isNewChatDrawerOpen: boolean;
  isMediaModalOpen: boolean;
  isThreeDotMenuOpen: boolean;
  isMobileViewingChat: boolean; // controls mobile single-pane takeover

  setActiveRailTab: (tab: ActiveRailTab) => void;
  setActiveFilter: (filter: FilterChip) => void;
  setSearchQuery: (q: string) => void;
  selectConversation: (id: string) => void;
  backToList: () => void;
  toggleTheme: () => void;
  sendMessage: (conversationId: string, text: string) => void;
  markConversationRead: (id: string) => void;
  toggleFavorite: (id: string) => void;
  openSettingsDrawer: () => void;
  closeSettingsDrawer: () => void;
  openNewChatDrawer: () => void;
  closeNewChatDrawer: () => void;
  openMediaModal: () => void;
  closeMediaModal: () => void;
  toggleThreeDotMenu: () => void;
  closeThreeDotMenu: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: mockConversations,
  activeConversationId: null,
  activeRailTab: "chats",
  activeFilter: "All",
  searchQuery: "",
  theme: "dark",

  isSettingsDrawerOpen: false,
  isNewChatDrawerOpen: false,
  isMediaModalOpen: false,
  isThreeDotMenuOpen: false,
  isMobileViewingChat: false,

  setActiveRailTab: (tab) => set({ activeRailTab: tab }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectConversation: (id) => {
    get().markConversationRead(id);
    set({ activeConversationId: id, isMobileViewingChat: true });
  },

  backToList: () => set({ isMobileViewingChat: false }),

  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  sendMessage: (conversationId, text) => {
    if (!text.trim()) return;
    const newMessage: Message = {
      id: `m_${Date.now()}`,
      conversationId,
      senderId: "u0",
      text,
      status: "sent",
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMessage] }
          : c
      ),
    }));

    // Simulate delivery + read receipts for demo purposes.
    setTimeout(() => {
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMessage.id ? { ...m, status: "delivered" } : m
                ),
              }
            : c
        ),
      }));
    }, 700);
    setTimeout(() => {
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMessage.id ? { ...m, status: "read" } : m
                ),
              }
            : c
        ),
      }));
    }, 1600);
  },

  markConversationRead: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      ),
    })),

  toggleFavorite: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      ),
    })),

  openSettingsDrawer: () => set({ isSettingsDrawerOpen: true }),
  closeSettingsDrawer: () => set({ isSettingsDrawerOpen: false }),
  openNewChatDrawer: () => set({ isNewChatDrawerOpen: true }),
  closeNewChatDrawer: () => set({ isNewChatDrawerOpen: false }),
  openMediaModal: () => set({ isMediaModalOpen: true }),
  closeMediaModal: () => set({ isMediaModalOpen: false }),
  toggleThreeDotMenu: () =>
    set((s) => ({ isThreeDotMenuOpen: !s.isThreeDotMenuOpen })),
  closeThreeDotMenu: () => set({ isThreeDotMenuOpen: false }),
}));
