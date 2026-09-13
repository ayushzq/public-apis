"use client";

import { Plus, MoreVertical, RadioTower } from "lucide-react";
import { mockStatuses } from "@/data/mockData";
import { useAuthStore } from "@/store/useAuthStore";
import Avatar from "./Avatar";

export default function StatusTab() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">Status</h1>
        <div className="flex items-center gap-4 text-wa-textSecondary">
          <button aria-label="Menu"><MoreVertical size={20} /></button>
          <button aria-label="Add status"><Plus size={20} /></button>
        </div>
      </div>

      <button className="flex items-center gap-3 px-4 py-3 hover:bg-wa-hover text-left">
        <div className="relative">
          <Avatar name={user?.name || "You"} size={44} />
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-wa-accentBright flex items-center justify-center border-2 border-wa-panelBg">
            <Plus size={11} className="text-wa-panelBg" />
          </span>
        </div>
        <div>
          <p className="text-[15.5px] text-wa-textPrimary">My status</p>
          <p className="text-[13px] text-wa-textSecondary">Click to add status update</p>
        </div>
      </button>

      {mockStatuses.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <RadioTower size={48} className="text-wa-textMuted mb-4" strokeWidth={1.3} />
          <p className="text-[16px] text-wa-textPrimary mb-1.5">Share statuses</p>
          <p className="text-[13px] text-wa-textSecondary leading-relaxed">
            Share photos, videos and text that disappear after 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}
