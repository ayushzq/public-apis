import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

// Central place to react to 401s (expired/invalid session).
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

// ---- Auth endpoints ----
export const authApi = {
  sendOtp: (email: string) => api.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, code: string) =>
    api.post("/auth/verify-otp", { email, code }),
  resendOtp: (email: string) => api.post("/auth/resend-otp", { email }),
};

// ---- Chat endpoints ----
export const chatApi = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (conversationId: string) =>
    api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, text: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { text }),
  createConversation: (participantIds: string[], isGroup = false, name?: string) =>
    api.post("/chat/conversations", { participantIds, isGroup, name }),
};
