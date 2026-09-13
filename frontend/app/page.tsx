"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginForm from "@/components/LoginForm";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;

  // No demo mode, no mock data: signing in always goes through the real
  // Email OTP flow, and the app then walks you through linking your
  // real WhatsApp account (QR code or phone number) before showing any
  // chats — see components/AppShell.tsx + WhatsAppLinkScreen.tsx.
  return isAuthenticated ? <AppShell /> : <LoginForm />;
}
