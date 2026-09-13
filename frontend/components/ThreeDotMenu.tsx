"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  UsersRound,
  Star,
  CheckSquare,
  CheckCheck,
  Lock,
  LogOut,
} from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";

const ITEMS = [
  { icon: UsersRound, label: "New group" },
  { icon: Star, label: "Starred messages" },
  { icon: CheckSquare, label: "Select chats" },
  { icon: CheckCheck, label: "Mark all as read" },
  { icon: Lock, label: "App lock" },
];

export default function ThreeDotMenu() {
  const { closeThreeDotMenu } = useChatStore();
  const { logout } = useAuthStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeThreeDotMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeThreeDotMenu]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-9 w-56 bg-wa-modalBg rounded-md shadow-2xl border border-wa-border py-1.5 z-50"
    >
      {ITEMS.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={closeThreeDotMenu}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[14.5px] text-wa-textPrimary hover:bg-wa-hover text-left"
        >
          <Icon size={17} className="text-wa-textSecondary" />
          {label}
        </button>
      ))}
      <div className="h-px bg-wa-border my-1" />
      <button
        onClick={() => {
          closeThreeDotMenu();
          logout();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14.5px] text-wa-danger hover:bg-wa-hover text-left"
      >
        <LogOut size={17} />
        Log out
      </button>
    </motion.div>
  );
}
