"use client";

import { Plus, Users } from "lucide-react";

export default function CommunitiesTab() {
  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">Communities</h1>
        <button aria-label="Add community" className="text-wa-textSecondary"><Plus size={20} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-2xl bg-wa-chipBg flex items-center justify-center mb-5">
          <Users size={40} className="text-wa-accentBright" strokeWidth={1.4} />
        </div>
        <p className="text-[16px] text-wa-textPrimary mb-2">Stay connected with a community</p>
        <p className="text-[13px] text-wa-textSecondary leading-relaxed mb-4">
          Communities bring members together in topic-based groups, and make it easy to get admin
          announcements. Any community you&apos;re added to will appear here.
        </p>
        <button className="px-5 py-2 rounded-full bg-wa-accent text-white text-[14px] font-medium">
          Start your community
        </button>
      </div>
    </div>
  );
}
