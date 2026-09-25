"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
// Dono naye components ko import kar rahe hain
import Anymation from "@/components/login/Anymation";
import LoginComponent from "@/components/login/Login";

export default function LoginPage() {
  // 🔒 SECURITY FIX (BaseKey audit): this page used to decide "already
  // logged in?" by checking `localStorage.getItem("agent_token")` — a
  // value that was never a real session (see Login.tsx / api/team/route.ts
  // fixes). It's now the real NextAuth session, the same source of truth
  // middleware.ts uses to protect every other page.
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState(0); // 0: Cluster, 1: Splash Logo, 2: Login Screen

  const isAuthed = status === "authenticated" && !!session?.user;

  useEffect(() => {
    setIsMounted(true);

    // Animation ki timing set ki hai (Pehle Icons, Phir Logo, Phir Login screen)
    const t1 = setTimeout(() => setPhase(1), 1600);
    const t2 = setTimeout(() => setPhase(2), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Jab animation poora ho jaye aur user logged in ho, tabhi redirect karo (Hang hone se bachayega)
  useEffect(() => {
    if (phase === 2 && isAuthed) {
      const primaryPage = (session?.user as any)?.primaryPage || "/chat";
      window.location.href = primaryPage;
    }
  }, [phase, isAuthed, session]);

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-black font-sans relative overflow-hidden">
      
      {/* 1. ANIMATION COMPONENT (Phase 0 aur Phase 1 yahan chalenge) */}
      <Anymation phase={phase} />

      {/* 2. LOGIN FORM COMPONENT (Phase 2 aane par yeh dikhega) */}
      {phase === 2 && !isAuthed && (
        <LoginComponent />
      )}

    </div>
  );
}
