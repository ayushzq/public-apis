"use client";

import { useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";

/**
 * Makes the hardware/browser back button behave like the real WhatsApp
 * app: it closes exactly one open layer at a time (three-dot menu →
 * modal → drawer → mobile chat view → …) instead of leaving the page.
 * Only once every open layer is closed does a further back press fall
 * through to normal browser navigation (leaving/exiting the app) —
 * mirroring how WhatsApp exits on back from the root chat list.
 *
 * Mount this once near the app root (see components/AppShell.tsx and
 * components/LoginForm.tsx, which both render it).
 */
export default function useBackButtonHandler() {
  const popBackLayer = useChatStore((s) => s.popBackLayer);

  useEffect(() => {
    const handlePopState = () => {
      popBackLayer();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [popBackLayer]);
}
