"use client";

import { Plus, BadgeCheck, Grid2x2, Layers } from "lucide-react";
import { mockChannels } from "@/data/mockData";
import Avatar from "./Avatar";

export default function ChannelsTab() {
  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">Channels</h1>
        <button aria-label="Add channel" className="text-wa-textSecondary"><Plus size={20} /></button>
      </div>

      <div className="px-4 pb-3">
        <p className="text-[15px] font-medium text-wa-textPrimary mb-0.5">Stay updated on your favorite topics</p>
        <p className="text-[13px] text-wa-textSecondary">Find channels to follow below</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mockChannels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={ch.name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[15px] text-wa-textPrimary truncate">{ch.name}</p>
                {ch.verified && <BadgeCheck size={14} className="text-wa-accentBright shrink-0" />}
              </div>
              <p className="text-[12.5px] text-wa-textSecondary">{ch.followers}</p>
            </div>
            <button className="px-4 py-1.5 rounded-full bg-wa-chipBg text-wa-accentBright text-[13.5px] font-medium hover:bg-wa-hover">
              Follow
            </button>
          </div>
        ))}

        <button className="w-full flex items-center gap-3 px-4 py-3 text-wa-accentBright text-[14.5px] hover:bg-wa-hover">
          <Grid2x2 size={18} /> Discover more
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-wa-accentBright text-[14.5px] hover:bg-wa-hover">
          <Layers size={18} /> Create channel
        </button>
      </div>
    </div>
  );
}
