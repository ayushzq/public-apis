import { create } from "zustand";
import { WaChat, WaMessage, FilterChip, ActiveRailTab, WaConnectionStatus, ReplyTarget } from "@/types";
import { waApi } from "@/lib/api";
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket";

export type BackLayer = "chat" | "settings" | "newchat" | "media" | "menu" | "reply" | "otp";

interface ChatState {
  // --- real WhatsApp link state ---
  waStatus: WaConnectionStatus;
  qrDataUrl: string | null;
  waPhoneNumber: string | null;
  waName: string | null;
  linkError: string | null;

  chats: WaChat[];
  activeChatId: string | null;
  activeRailTab: ActiveRailTab;
  activeFilter: FilterChip;
  searchQuery: string;
  theme: "light" | "dark";
  replyTarget: ReplyTarget | null;

  isSettingsDrawerOpen: boolean;
  isNewChatDrawerOpen: boolean;
  isMediaModalOpen: boolean;
  isThreeDotMenuOpen: boolean;
  isMobileViewingChat: boolean;

  // --- Android/browser back-button stack ---
  // Every overlay (drawer, modal, menu, mobile chat view, OTP step) pushes
  // one entry here + one real history.pushState. Hardware/browser back
  // then closes exactly one layer at a time, most-recent first — same
  // feel as the real WhatsApp app — instead of leaving the page.
  backStack: BackLayer[];
  pushBackLayer: (layer: BackLayer) => void;
  requestBack: () => void;
  replaceTopBackLayer: (layer: BackLayer) => void;
  popBackLayer: () => void;
  dropReplyLayer: () => void;

  initRealtime: () => void;
  startWhatsAppLink: () => Promise<void>;
  refreshWaStatus: () => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  startChatWithNumber: (phoneNumber: string) => Promise<string | null>;

  setActiveRailTab: (tab: ActiveRailTab) => void;
  setActiveFilter: (filter: FilterChip) => void;
  setSearchQuery: (q: string) => void;
  selectConversation: (id: string) => void;
  selectConversationFromDrawer: (id: string) => void;
  backToList: () => void;
  toggleTheme: () => void;

  sendMessage: (chatId: string, text: string) => Promise<void>;
  sendMediaMessage: (chatId: string, file: File, caption?: string) => Promise<void>;
  setReplyTarget: (target: ReplyTarget | null) => void;

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

  reset: () => void;
}

let realtimeInitialized = false;

export const useChatStore = create<ChatState>((set, get) => ({
  waStatus: "disconnected",
  qrDataUrl: null,
  waPhoneNumber: null,
  waName: null,
  linkError: null,

  chats: [],
  activeChatId: null,
  activeRailTab: "chats",
  activeFilter: "All",
  searchQuery: "",
  theme: "dark",
  replyTarget: null,

  isSettingsDrawerOpen: false,
  isNewChatDrawerOpen: false,
  isMediaModalOpen: false,
  isThreeDotMenuOpen: false,
  isMobileViewingChat: false,
  backStack: [],

  /** Opens an overlay AND records it on the browser history stack. */
  pushBackLayer: (layer) => {
    if (typeof window !== "undefined") {
      window.history.pushState({ waBackLayer: layer }, "");
    }
    set((s) => ({ backStack: [...s.backStack, layer] }));
  },

  /** Called by UI close buttons/backdrops — triggers ONE real back-navigation,
   *  which the popstate listener turns into exactly one popBackLayer(). */
  requestBack: () => {
    if (get().backStack.length > 0 && typeof window !== "undefined") {
      window.history.back();
    }
  },

  /** Relabels the CURRENT top-of-stack layer in place (via replaceState)
   *  instead of pushing a new one — used when one overlay hands off
   *  directly into another (e.g. picking a chat from the New Chat
   *  drawer) so a single back press still only takes one step. */
  replaceTopBackLayer: (newLayer) => {
    if (typeof window !== "undefined") {
      window.history.replaceState({ waBackLayer: newLayer }, "");
    }
    set((s) => ({ backStack: [...s.backStack.slice(0, -1), newLayer] }));
  },

  /** Called only by the popstate listener (see hooks/useBackButtonHandler.ts). */
  popBackLayer: () => {
    const stack = get().backStack;
    const layer = stack[stack.length - 1];
    if (!layer) return;
    set({ backStack: stack.slice(0, -1) });

    switch (layer) {
      case "chat":
        set({ isMobileViewingChat: false });
        break;
      case "settings":
        set({ isSettingsDrawerOpen: false });
        break;
      case "newchat":
        set({ isNewChatDrawerOpen: false });
        break;
      case "media":
        set({ isMediaModalOpen: false });
        break;
      case "menu":
        set({ isThreeDotMenuOpen: false });
        break;
      case "reply":
        set({ replyTarget: null });
        break;
      case "otp":
        // no-op here — LoginForm reacts to backStack length itself
        break;
    }
  },

  /** Clears the reply target as a SIDE EFFECT of an action that isn't a
   *  "back" gesture (e.g. sending the reply, or switching chats) — drops
   *  any pending "reply" entry from our JS stack without triggering a
   *  real browser back-navigation. */
  dropReplyLayer: () => {
    set((s) => ({
      replyTarget: null,
      backStack: s.backStack.filter((l) => l !== "reply"),
    }));
  },

  /** Wires every real-time WhatsApp event exactly once per session. */
  initRealtime: () => {
    if (realtimeInitialized) return;
    realtimeInitialized = true;

    const socket = connectSocket();

    socket.on("wa:qr", ({ qr }: { qr: string }) => {
      set({ waStatus: "qr_pending", qrDataUrl: qr, linkError: null });
    });

    socket.on("wa:connected", ({ phoneNumber, name }: { phoneNumber: string | null; name: string | null }) => {
      set({ waStatus: "connected", qrDataUrl: null, waPhoneNumber: phoneNumber, waName: name });
      get().fetchChats();
    });

    socket.on("wa:disconnected", ({ reason }: { reason: string }) => {
      set({
        waStatus: "disconnected",
        qrDataUrl: null,
        linkError: reason === "logged_out" ? "WhatsApp was unlinked from your phone." : null,
      });
    });

    socket.on("wa:chat:update", () => {
      get().fetchChats();
    });

    socket.on("wa:message:new", ({ chatId, message }: { chatId: string; message: WaMessage }) => {
      set((s) => ({
        chats: s.chats.map((c) => {
          if (c.id !== chatId) return c;
          const alreadyHave = c.messages.some((m) => m.waMessageId === message.waMessageId);
          const messages = alreadyHave
            ? c.messages.map((m) => (m.waMessageId === message.waMessageId ? message : m))
            : [...c.messages, message];
          return {
            ...c,
            messages,
            lastMessage: message,
            lastMessageAt: message.timestamp,
            unreadCount: c.id === s.activeChatId ? 0 : c.unreadCount + (alreadyHave ? 0 : message.fromMe ? 0 : 1),
          };
        }),
      }));
    });

    socket.on("wa:message:status", ({ waMessageId, status }: { waMessageId: string; status: string }) => {
      set((s) => ({
        chats: s.chats.map((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.waMessageId === waMessageId ? { ...m, status: status as WaMessage["status"] } : m
          ),
        })),
      }));
    });
  },

  startWhatsAppLink: async () => {
    set({ waStatus: "connecting", linkError: null });
    try {
      await waApi.connect();
    } catch (err: any) {
      set({ waStatus: "disconnected", linkError: err?.response?.data?.message || "Could not start WhatsApp." });
    }
  },

  refreshWaStatus: async () => {
    try {
      const res = await waApi.status();
      const { status, phoneNumber, waName } = res.data;
      set({ waStatus: status, waPhoneNumber: phoneNumber, waName });
      if (status === "connected") get().fetchChats();
    } catch {
      // silent — user will see the QR/connect screen and can retry
    }
  },

  fetchChats: async () => {
    try {
      const res = await waApi.getChats();
      set((s) => ({
        chats: res.data.chats.map((c: WaChat) => ({
          ...c,
          messages: s.chats.find((existing) => existing.id === c.id)?.messages || [],
        })),
      }));
    } catch (err) {
      console.error("fetchChats failed:", err);
    }
  },

  fetchMessages: async (chatId) => {
    try {
      const res = await waApi.getMessages(chatId);
      set((s) => ({
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, messages: res.data.messages } : c)),
      }));
    } catch (err) {
      console.error("fetchMessages failed:", err);
    }
  },

  startChatWithNumber: async (phoneNumber) => {
    try {
      const res = await waApi.startChat(phoneNumber);
      const chat = { ...res.data.chat, messages: [] };
      set((s) => ({ chats: [chat, ...s.chats.filter((c) => c.id !== chat.id)] }));
      return chat.id as string;
    } catch (err: any) {
      set({ linkError: err?.response?.data?.message || "Could not start chat." });
      return null;
    }
  },

  setActiveRailTab: (tab) => set({ activeRailTab: tab }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectConversation: (id) => {
    get().markConversationRead(id);
    const wasViewingChat = get().isMobileViewingChat;
    get().dropReplyLayer();
    set({ activeChatId: id, isMobileViewingChat: true });
    get().fetchMessages(id);
    // Only push a new back-layer the first time we enter chat view —
    // switching between chats while already inside one shouldn't stack
    // up extra "back" presses.
    if (!wasViewingChat) get().pushBackLayer("chat");
  },

  /** Used when a chat is opened FROM the New Chat drawer — replaces the
   *  drawer's back-layer with "chat" instead of stacking a new one, so
   *  a single back press returns straight to the chat list. */
  selectConversationFromDrawer: (id) => {
    get().markConversationRead(id);
    get().dropReplyLayer();
    set({
      isNewChatDrawerOpen: false,
      activeChatId: id,
      isMobileViewingChat: true,
    });
    get().fetchMessages(id);
    get().replaceTopBackLayer("chat");
  },

  backToList: () => set({ isMobileViewingChat: false }),

  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  sendMessage: async (chatId, text) => {
    if (!text.trim()) return;
    const reply = get().replyTarget;
    get().dropReplyLayer();
    try {
      await waApi.sendText(
        chatId,
        text,
        reply
          ? { replyToWaId: reply.waMessageId, replyToText: reply.text, replyFromMe: reply.fromMe }
          : undefined
      );
      // The sent message itself arrives back via the "wa:message:new"
      // socket event (Baileys echoes our own outgoing messages too), so
      // we don't optimistically insert it here — this avoids duplicate
      // bubbles and keeps ticks/timestamps authoritative from the server.
    } catch (err: any) {
      set({ linkError: err?.response?.data?.message || "Could not send message." });
    }
  },

  sendMediaMessage: async (chatId, file, caption) => {
    const reply = get().replyTarget;
    get().dropReplyLayer();
    try {
      await waApi.sendMedia(
        chatId,
        file,
        caption,
        reply
          ? { replyToWaId: reply.waMessageId, replyToText: reply.text, replyFromMe: reply.fromMe }
          : undefined
      );
    } catch (err: any) {
      set({ linkError: err?.response?.data?.message || "Could not send media." });
    }
  },

  setReplyTarget: (target) => {
    const wasReplying = get().replyTarget !== null;
    set({ replyTarget: target });
    if (target && !wasReplying) get().pushBackLayer("reply");
    if (!target && wasReplying) get().requestBack();
  },

  markConversationRead: (id) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)) })),

  toggleFavorite: (id) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c)),
    })),

  openSettingsDrawer: () => {
    set({ isSettingsDrawerOpen: true });
    get().pushBackLayer("settings");
  },
  closeSettingsDrawer: () => get().requestBack(),
  openNewChatDrawer: () => {
    set({ isNewChatDrawerOpen: true });
    get().pushBackLayer("newchat");
  },
  closeNewChatDrawer: () => get().requestBack(),
  openMediaModal: () => {
    set({ isMediaModalOpen: true });
    get().pushBackLayer("media");
  },
  closeMediaModal: () => get().requestBack(),
  toggleThreeDotMenu: () =>
    set((s) => {
      if (!s.isThreeDotMenuOpen) get().pushBackLayer("menu");
      return { isThreeDotMenuOpen: !s.isThreeDotMenuOpen };
    }),
  closeThreeDotMenu: () => get().requestBack(),

  reset: () => {
    disconnectSocket();
    realtimeInitialized = false;
    set({
      waStatus: "disconnected",
      qrDataUrl: null,
      waPhoneNumber: null,
      waName: null,
      chats: [],
      activeChatId: null,
      isMobileViewingChat: false,
    });
  },
}));
