"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Routes that keep managing their own Sidebar for now (they already embed
// it inside a specific flex-row layout — components/Sidebar.tsx renders as
// a normal-flow flex child on desktop, not position:fixed, so it must sit
// inside each page's own `flex h-[100dvh]` wrapper). Migrating them to this
// shell is a mechanical one-line-removal per page, deferred to a follow-up
// so it can be visually verified page-by-page instead of changed blind.
const SELF_MANAGED_SIDEBAR_PREFIXES = [
  "/campaigns",
  "/contacts",
  "/dashboard",
  "/developers",
  "/help",
  "/template",
];

// Routes that intentionally render full-bleed, without any nav rail:
// - /login, /privacy-policy, /terms-of-service: public, pre-auth pages
// - /chat: WhatsApp-Web-style full-screen layout with its own contact-list
//   sidebar (components/chat/Sidebar) — a different component entirely
// - /chatbot-builder: full-screen canvas with its own dedicated top bar
const NO_SHELL_PREFIXES = [
  "/login",
  "/privacy-policy",
  "/terms-of-service",
  "/chat",
  "/chatbot-builder",
  ...SELF_MANAGED_SIDEBAR_PREFIXES,
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const skipShell = NO_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (skipShell) return <>{children}</>;

  // Sidebar renders as a normal-flow flex child on desktop (w-[220px]/w-[64px],
  // h-full) plus its own fixed bottom bar on mobile — so the shell must be a
  // flex row at full viewport height, matching every page's existing pattern,
  // not a margin-offset wrapper.
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F4F7F6]">
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
