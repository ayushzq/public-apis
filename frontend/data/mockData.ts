import { Conversation, User, CallLogEntry, StatusUpdate, ChannelSummary } from "@/types";

export const currentUser: User = {
  id: "u0",
  email: "you@example.com",
  name: "You",
  avatar: null,
  about: "Hey there! I am using WhatsApp.",
  onlineStatus: true,
  themePreference: "dark",
};

const makeUser = (id: string, name: string, online = false): User => ({
  id,
  email: `${name.toLowerCase().replace(/\s/g, "")}@example.com`,
  name,
  avatar: null,
  about: "Available",
  onlineStatus: online,
  themePreference: "dark",
});

const contacts = {
  papa: makeUser("u1", "Papa ❤️", true),
  mom: makeUser("u2", "Mummy"),
  denny: makeUser("u3", "Denny", true),
  sanjeet: makeUser("u4", "Sanjeet Sir"),
  kishan: makeUser("u5", "Kishan"),
  arbind: makeUser("u6", "Arbind Uncle"),
  scienceGroup: makeUser("u7", "Inter Sciences Group"),
};

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60000).toISOString();

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    isGroup: false,
    createdAt: minutesAgo(600),
    participants: [
      { userId: "u0", conversationId: "c1", role: "member", user: currentUser },
      { userId: "u1", conversationId: "c1", role: "member", user: contacts.papa },
    ],
    unreadCount: 0,
    isFavorite: true,
    messages: [
      {
        id: "m1",
        conversationId: "c1",
        senderId: "u1",
        text: "Agla mahina paisa nahi jayega, paper banana hai",
        status: "read",
        timestamp: minutesAgo(120),
      },
      {
        id: "m2",
        conversationId: "c1",
        senderId: "u0",
        text: "Okay",
        status: "read",
        timestamp: minutesAgo(118),
      },
      {
        id: "m3",
        conversationId: "c1",
        senderId: "u1",
        text: "Ghar aane ke liye bata dena",
        status: "delivered",
        timestamp: minutesAgo(30),
      },
    ],
  },
  {
    id: "c2",
    isGroup: false,
    createdAt: minutesAgo(1440),
    participants: [
      { userId: "u0", conversationId: "c2", role: "member", user: currentUser },
      { userId: "u3", conversationId: "c2", role: "member", user: contacts.denny },
    ],
    unreadCount: 1,
    messages: [
      {
        id: "m4",
        conversationId: "c2",
        senderId: "u3",
        text: "8 page h kya sir, bheje mujhe",
        status: "delivered",
        timestamp: minutesAgo(1400),
      },
    ],
  },
  {
    id: "c3",
    isGroup: false,
    createdAt: minutesAgo(2000),
    participants: [
      { userId: "u0", conversationId: "c3", role: "member", user: currentUser },
      { userId: "u4", conversationId: "c3", role: "member", user: contacts.sanjeet },
    ],
    unreadCount: 0,
    messages: [
      {
        id: "m5",
        conversationId: "c3",
        senderId: "u4",
        mediaType: "image",
        mediaUrl: "",
        text: "8 photos",
        status: "read",
        timestamp: minutesAgo(1900),
      },
    ],
  },
  {
    id: "c4",
    isGroup: true,
    name: "Inter Sciences Students Group",
    createdAt: minutesAgo(3000),
    participants: [
      { userId: "u0", conversationId: "c4", role: "member", user: currentUser },
      { userId: "u3", conversationId: "c4", role: "admin", user: contacts.denny },
      { userId: "u4", conversationId: "c4", role: "member", user: contacts.sanjeet },
    ],
    unreadCount: 0,
    messages: [
      {
        id: "m6",
        conversationId: "c4",
        senderId: "u3",
        text: "8 photos",
        mediaType: "image",
        status: "read",
        timestamp: minutesAgo(2900),
      },
    ],
  },
  {
    id: "c5",
    isGroup: false,
    createdAt: minutesAgo(4000),
    participants: [
      { userId: "u0", conversationId: "c5", role: "member", user: currentUser },
      { userId: "u2", conversationId: "c5", role: "member", user: contacts.mom },
    ],
    unreadCount: 0,
    messages: [
      {
        id: "m7",
        conversationId: "c5",
        senderId: "u0",
        text: "Hu",
        status: "sent",
        timestamp: minutesAgo(3900),
      },
    ],
  },
  {
    id: "c6",
    isGroup: false,
    createdAt: minutesAgo(5000),
    participants: [
      { userId: "u0", conversationId: "c6", role: "member", user: currentUser },
      { userId: "u5", conversationId: "c6", role: "member", user: contacts.kishan },
    ],
    unreadCount: 0,
    messages: [
      {
        id: "m8",
        conversationId: "c6",
        senderId: "u5",
        text: "5 photos",
        mediaType: "image",
        status: "read",
        timestamp: minutesAgo(4900),
      },
    ],
  },
  {
    id: "c7",
    isGroup: false,
    createdAt: minutesAgo(6000),
    participants: [
      { userId: "u0", conversationId: "c7", role: "member", user: currentUser },
      { userId: "u6", conversationId: "c7", role: "member", user: contacts.arbind },
    ],
    unreadCount: 0,
    messages: [
      {
        id: "m9",
        conversationId: "c7",
        senderId: "u6",
        text: "Kal milte hain",
        status: "read",
        timestamp: minutesAgo(5900),
      },
    ],
  },
];

export const mockCallLogs: CallLogEntry[] = [
  { id: "cl1", name: "Papa ❤️", type: "video", direction: "missed", count: 2, timestamp: "10:19 AM" },
  { id: "cl2", name: "Papa ❤️", type: "video", direction: "incoming", count: 1, timestamp: "7:20 AM" },
  { id: "cl3", name: "Papa ❤️", type: "video", direction: "incoming", count: 1, timestamp: "Yesterday" },
  { id: "cl4", name: "Papa ❤️", type: "video", direction: "outgoing", count: 1, timestamp: "Yesterday" },
  { id: "cl5", name: "Denny", type: "voice", direction: "missed", count: 1, timestamp: "Friday" },
];

export const mockStatuses: StatusUpdate[] = [];

export const mockChannels: ChannelSummary[] = [
  { id: "ch1", name: "FIFA World Cup", avatar: null, followers: "18.5M followers", verified: true },
  { id: "ch2", name: "Exam Updates Daily", avatar: null, followers: "278K followers", verified: false },
  { id: "ch3", name: "Learn Korean", avatar: null, followers: "545K followers", verified: false },
  { id: "ch4", name: "Rockstar Games", avatar: null, followers: "6.7M followers", verified: true },
];
