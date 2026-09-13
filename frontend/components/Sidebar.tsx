"use client";

import {
  MessageSquare,
  Phone,
  CircleDot,
  Radio,
  Users,
  Settings,
} from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";
import { ActiveRailTab } from "@/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { tab: ActiveRailTab; icon: typeof MessageSquare; label: string; badge?: number }[] = [
  { tab: "chats", icon: MessageSquare, label: "Chats", badge: 1 },
  { tab: "calls", icon: Phone, label: "Calls" },
  { tab: "status", icon: CircleDot, label: "Status" },
  { tab: "channels", icon: Radio, label: "Channels" },
  { tab: "communities", icon: Users, label: "Communities" },
];

export default function Sidebar() {
  const { activeRailTab, setActiveRailTab, openSettingsDrawer, isMobileViewingChat } = useChatStore();
  const { user } = useAuthStore();

  return (
    <nav
      className={cn(
        "flex-col items-center justify-between w-[68px] bg-wa-navRail py-4 shrink-0 border-r border-wa-border",
        isMobileViewingChat ? "hidden md:flex" : "flex"
      )}
      aria-label="Primary"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        {NAV_ITEMS.map(({ tab, icon: Icon, label, badge }) => {
          const active = activeRailTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveRailTab(tab)}
              aria-label={label}
              className={cn(
                "relative w-12 h-12 flex items-center justify-center rounded-lg transition-colors",
                active ? "bg-wa-active text-wa-textPrimary" : "text-wa-textSecondary hover:bg-wa-hover"
              )}
            >
              <Icon size={23} strokeWidth={1.8} />
              {badge ? (
                <span className="absolute top-1 right-1.5 bg-wa-accent text-[10px] leading-[16px] w-4 h-4 rounded-full text-white text-center font-medium">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={openSettingsDrawer}
          aria-label="Settings"
          className={cn(
            "w-12 h-12 flex items-center justify-center rounded-lg transition-colors text-wa-textSecondary hover:bg-wa-hover"
          )}
        >
          <Settings size={22} strokeWidth={1.8} />
        </button>
        <button onClick={openSettingsDrawer} aria-label="Profile" className="mb-1">
          <Avatar name={user?.name || "You"} src={user?.avatar} size={32} />
        </button>
      </div>
    </nav>
  );
}
