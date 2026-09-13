"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginForm from "@/components/LoginForm";
import AppShell from "@/components/AppShell";
import { currentUser } from "@/data/mockData";

export default function Home() {
  const { isAuthenticated, hydrate, setSession } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;

  // DEMO_MODE lets you preview the full UI without running the backend.
  // Set NEXT_PUBLIC_DEMO_MODE=false once your Express + Neon backend is
  // live to go through the real Email OTP flow end-to-end.
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  if (!isAuthenticated) {
    if (demoMode) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-wa-bg px-4 gap-4">
          <p className="text-wa-textSecondary text-sm text-center max-w-sm">
            Demo mode: skip real OTP verification and preview the app with mock data,
            or go through the real login flow.
          </p>
          <button
            onClick={() => setSession(currentUser, "demo-token")}
            className="bg-wa-accent text-white rounded-full px-6 py-2.5 text-[15px] font-medium"
          >
            Continue with demo account
          </button>
          <LoginForm />
        </div>
      );
    }
    return <LoginForm />;
  }

  return <AppShell />;
}
