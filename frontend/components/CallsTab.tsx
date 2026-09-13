"use client";

import { Search, UserPlus, PhoneMissed, PhoneIncoming, PhoneOutgoing, Video, MoreHorizontal } from "lucide-react";
import { mockCallLogs } from "@/data/mockData";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

export default function CallsTab() {
  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">Calls</h1>
        <div className="flex items-center gap-4 text-wa-textSecondary">
          <button aria-label="Add favorite"><UserPlus size={20} /></button>
          <button aria-label="More"><MoreHorizontal size={20} /></button>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-3 bg-wa-header rounded-lg px-3 py-1.5">
          <Search size={16} className="text-wa-textSecondary shrink-0" />
          <input
            placeholder="Search name, number or @username"
            className="bg-transparent outline-none text-[15px] text-wa-textPrimary placeholder:text-wa-textSecondary w-full"
          />
        </div>
      </div>

      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[15px] font-medium text-wa-textPrimary">Favorites</span>
      </div>
      <button className="flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-hover">
        <span className="w-9 h-9 rounded-full bg-wa-accent/20 flex items-center justify-center text-wa-accentBright">
          <UserPlus size={17} />
        </span>
        <span className="text-[14.5px] text-wa-accentBright">Add favorite</span>
      </button>

      <div className="px-4 pt-3 pb-1">
        <span className="text-[15px] font-medium text-wa-textPrimary">Recent</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mockCallLogs.map((log) => {
          const Icon = log.type === "video" ? Video : log.direction === "missed" ? PhoneMissed : log.direction === "outgoing" ? PhoneOutgoing : PhoneIncoming;
          return (
            <button key={log.id} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-hover">
              <Avatar name={log.name} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-[15.5px] text-wa-textPrimary truncate">{log.name}</p>
                <div className="flex items-center gap-1 text-[13px]">
                  <Icon size={14} className={cn(log.direction === "missed" ? "text-wa-danger" : "text-wa-textSecondary")} />
                  <span className={cn(log.direction === "missed" ? "text-wa-danger" : "text-wa-textSecondary")}>
                    {log.direction === "missed" ? "Missed" : log.direction === "outgoing" ? "Outgoing" : "Incoming"}
                    {log.count > 1 ? ` (${log.count})` : ""}
                  </span>
                </div>
              </div>
              <span className="text-[12px] text-wa-textSecondary">{log.timestamp}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
