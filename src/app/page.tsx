"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; 
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { data: session, status } = useSession(); 

  // 🔒 SECURITY FIX (BaseKey audit): the "Agent" branch here used to trust
  // `localStorage.getItem("agent_token")` as if it were a login — that
  // value was never a real session (see Login.tsx / api/team/route.ts).
  // Team members now go through the same NextAuth session as everyone
  // else, so this is just: loading → check session → redirect.
  useEffect(() => {
    if (status === "loading") {
      return; 
    }

    if (status === "authenticated" && session?.user) {
      const primaryPage = (session.user as any)?.primaryPage || "/dashboard";
      router.replace(primaryPage);
    } else if (status === "unauthenticated") {
      router.replace("/login"); 
    }
    
  }, [router, session, status]); 

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner ko premium blue color de diya hai */}
        <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">Checking authentication...</p>
      </div>
    </div>
  );
}
