import { create } from "zustand";

// TypeScript Interfaces for strict type checking
export interface Message {
  id: String;
  body: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "INTERACTIVE";
  direction: "INBOUND" | "OUTBOUND";
  status: "SENT" | "DELIVERED" | "READ";
  mediaUrl?: string | null;
  timestamp: string;
}

export interface Contact {
  id: string;
  phoneNumber: string;
  name: string | null;
  unreadCount: number;
  lastMessageAt: string;
  isSessionActive: boolean;
  messages?: Message[];
}

interface ChatState {
  contacts: Contact[];
  activeContact: Contact | null;
  setContacts: (contacts: Contact[]) => void;
  setActiveContact: (contact: Contact | null) => void;
  addMessageToActiveChat: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: "SENT" | "DELIVERED" | "READ") => void;
  updateContactSession: (contactId: string, isActive: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  contacts: [],
  activeContact: null,

  setContacts: (contacts) => set({ contacts }),
  
  setActiveContact: (contact) => set((state) => {
    // Jab kisi chat par click ho, toh uske unread count ko 0 kar dein
    const updatedContacts = state.contacts.map((c) =>
      c.id === contact?.id ? { ...c, unreadCount: 0 } : c
    );
    return { contacts: updatedContacts, activeContact: contact };
  }),

  addMessageToActiveChat: (message) => set((state) => {
    if (!state.activeContact) return {};

    // 1. Agar message active contact ka hai, toh chat window mein jod dein
    const updatedActiveContact = {
      ...state.activeContact,
      messages: [...(state.activeContact.messages || []), message],
    };

    // 2. Sidebar mein bhi list ko update karein aur last message ka time badlein
    const updatedContacts = state.contacts.map((c) =>
      c.id === state.activeContact?.id
        ? { ...c, lastMessageAt: message.timestamp }
        : c
    );

    return { activeContact: updatedActiveContact, contacts: updatedContacts };
  }),

  updateMessageStatus: (messageId, status) => set((state) => {
    if (!state.activeContact || !state.activeContact.messages) return {};

    // Chat bubble ke gray/blue ticks ko real-time mein badlein
    const updatedMessages = state.activeContact.messages.map((m) =>
      m.id === messageId ? { ...m, status } : m
    );

    return {
      activeContact: { ...state.activeContact, messages: updatedMessages },
    };
  }),

  updateContactSession: (contactId, isActive) => set((state) => {
    // 24-hour session window status update karne ke liye
    const updatedContacts = state.contacts.map((c) =>
      c.id === contactId ? { ...c, isSessionActive: isActive } : c
    );
    const updatedActive = state.activeContact?.id === contactId 
      ? { ...state.activeContact, isSessionActive: isActive } 
      : state.activeContact;

    return { contacts: updatedContacts, activeContact: updatedActive };
  }),
}));
