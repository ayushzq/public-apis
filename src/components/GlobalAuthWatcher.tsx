"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function GlobalAuthWatcher() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoggingOutRef = useRef(false);

  // 1. 🚨 INSTANT DELETE WATCHER (Admin ke delete karte hi Logout)
  useEffect(() => {
    // Verification page par watcher ko activate mat hone do
    if (pathname?.startsWith("/verify")) return;

    if ((session as any)?.error === "UserDeleted" && !isLoggingOutRef.current) {
      isLoggingOutRef.current = true;
      toast.error("Your account has been revoked by the administrator.", {
        id: "account-revoked",
        duration: 5000,
      });
      signOut({ callbackUrl: "/login?error=AccessRevoked" });
    }
  }, [session, pathname]);

  // 2. 🛡️ PERMISSION & EDIT WATCHER (Access chhinne par unallowed page se redirect)
  useEffect(() => {
    // Verification page ya Login page par checking bypass karo
    if (!pathname || pathname.startsWith("/verify") || pathname.startsWith("/login")) {
      return;
    }

    if (status === "authenticated" && session?.user) {
      const role = (session.user as any)?.role;
      const allowedPages: string[] = (session.user as any)?.allowedPages || [];
      const primaryPage: string = (session.user as any)?.primaryPage || "/chat";

      // Admin ke paas har module ka access hota hai; sirf Agent par rules lagao
      if (role === "AGENT") {
        const isAllowed = allowedPages.some((page) => pathname.startsWith(page));

        // Agar admin ne is page ka access hata diya hai
        if (!isAllowed) {
          toast.warning("You do not have permission to access this module.", {
            id: "unauthorized-module",
          });
          router.replace(primaryPage);
        }
      }
    }
  }, [pathname, session, status, router]);

  // 3. 👁️ LIVE PRESENCE & HEARTBEAT (Tab switch par AWAY/ONLINE + Current Page sync)
  useEffect(() => {
    // Unauthenticated ya verification page par tracking call mat bhejo
    if (!pathname || pathname.startsWith("/verify") || status !== "authenticated") {
      return;
    }

    const sendPresencePing = async (presenceStatus: "ONLINE" | "AWAY") => {
      try {
        await fetch("/api/user/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: presenceStatus,
            page: pathname,
          }),
        });
      } catch {
        // Background telemetry errors ko silently ignore karo
      }
    };

    // Tab change detection via HTML5 Visibility API
    const handleVisibilityChange = () => {
      const currentStatus = document.visibilityState === "visible" ? "ONLINE" : "AWAY";
      sendPresencePing(currentStatus);
    };

    // Window focus/blur fallback
    const handleFocus = () => sendPresencePing("ONLINE");
    const handleBlur = () => sendPresencePing("AWAY");

    // Initial load par active update
    sendPresencePing("ONLINE");

    // Har 30 second mein automatic heartbeat ping bhejna
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sendPresencePing("ONLINE");
      }
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [pathname, status]);

  return null;
}
