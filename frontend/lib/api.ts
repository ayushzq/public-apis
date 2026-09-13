import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Attach JWT to every outgoing request once the user is logged in.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("wa_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("wa_token");
      localStorage.removeItem("wa_user");
    }
    return Promise.reject(error);
  }
);

// ---- Auth endpoints (Email + OTP — unchanged) ----
export const authApi = {
  sendOtp: (email: string) => api.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, code: string) =>
    api.post("/auth/verify-otp", { email, code }),
  resendOtp: (email: string) => api.post("/auth/resend-otp", { email }),
};

// ---- Real WhatsApp endpoints (Baileys-backed) ----
export const waApi = {
  connect: (phoneNumber?: string) => api.post("/wa/connect", phoneNumber ? { phoneNumber } : {}),
  status: () => api.get("/wa/status"),
  logout: () => api.post("/wa/logout"),
  getChats: () => api.get("/wa/chats"),
  startChat: (phoneNumber: string) => api.post("/wa/chats/start", { phoneNumber }),
  getMessages: (chatId: string) => api.get(`/wa/chats/${chatId}/messages`),
  sendText: (
    chatId: string,
    text: string,
    reply?: { replyToWaId: string; replyToText: string; replyFromMe: boolean }
  ) => api.post(`/wa/chats/${chatId}/messages`, { text, ...reply }),
  sendMedia: (
    chatId: string,
    file: File,
    caption?: string,
    reply?: { replyToWaId: string; replyToText: string; replyFromMe: boolean }
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    if (reply?.replyToWaId) {
      form.append("replyToWaId", reply.replyToWaId);
      form.append("replyToText", reply.replyToText);
      form.append("replyFromMe", String(reply.replyFromMe));
    }
    return api.post(`/wa/chats/${chatId}/media`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
