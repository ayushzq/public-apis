"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  User as UserIcon,
  KeyRound,
  Lock,
  MessageSquare,
  Bell,
  Keyboard,
  HelpCircle,
  LogOut,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";

const MENU = [
  { icon: UserIcon, label: "Profile", sub: "Name, profile picture, username" },
  { icon: KeyRound, label: "Account", sub: "Security notifications, account info" },
  { icon: Lock, label: "Privacy", sub: "Blocked contacts, disappearing messages" },
  { icon: MessageSquare, label: "Chats", sub: "Theme, wallpaper, chat settings" },
  { icon: Bell, label: "Notifications", sub: "Messages, groups, sounds" },
  { icon: Keyboard, label: "Keyboard shortcuts", sub: "Quick actions" },
  { icon: HelpCircle, label: "Help and feedback", sub: "Help center, contact us, privacy policy" },
];

export default function SettingsDrawer() {
  const { isSettingsDrawerOpen, closeSettingsDrawer, theme, toggleTheme } = useChatStore();
  const { user, logout } = useAuthStore();

  return (
    <AnimatePresence>
      {isSettingsDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettingsDrawer}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed left-0 top-0 h-full w-full sm:w-[400px] bg-wa-panelBg z-50 flex flex-col shadow-2xl"
          >
            <div className="px-4 py-4 flex items-center gap-4 border-b border-wa-border">
              <p className="text-xl font-medium text-wa-textPrimary">{user?.name || "Settings"}</p>
            </div>

            <div className="px-4 pb-2 pt-2">
              <div className="flex items-center gap-3 bg-wa-header rounded-lg px-3 py-1.5">
                <Search size={16} className="text-wa-textSecondary" />
                <input placeholder="Search" className="bg-transparent outline-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary w-full" />
              </div>
            </div>

            <div className="flex flex-col items-center py-4">
              <Avatar name={user?.name || "You"} size={96} />
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-wa-chipBg text-wa-textPrimary text-[13px]"
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                Switch to {theme === "dark" ? "light" : "dark"} mode
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {MENU.map(({ icon: Icon, label, sub }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-wa-hover"
                >
                  <Icon size={20} className="text-wa-textSecondary shrink-0" />
                  <div>
                    <p className="text-[15px] text-wa-textPrimary">{label}</p>
                    <p className="text-[12.5px] text-wa-textSecondary">{sub}</p>
                  </div>
                </button>
              ))}
              <div className="h-px bg-wa-border my-1" />
              <button
                onClick={() => {
                  closeSettingsDrawer();
                  logout();
                }}
                className="w-full flex items-center gap-4 px-5 py-3 text-left text-wa-danger hover:bg-wa-hover"
              >
                <LogOut size={20} />
                <p className="text-[15px]">Log out</p>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
