import { create } from "zustand";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

/**
 * Auth store backed by localStorage for session persistence.
 * In production the token is a JWT issued by the backend after OTP
 * verification (see backend/src/controllers/authController.js).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setSession: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wa_token", token);
      localStorage.setItem("wa_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("wa_token");
      localStorage.removeItem("wa_user");
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("wa_token");
    const userRaw = localStorage.getItem("wa_user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        // corrupted session, ignore
      }
    }
  },
}));
