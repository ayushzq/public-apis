"use client";

import { Plus, Radio } from "lucide-react";

export default function ChannelsTab() {
  return (
    <div className="flex flex-col h-full bg-wa-panelBg">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-wa-textPrimary">Channels</h1>
        <button aria-label="Add channel" className="text-wa-textSecondary"><Plus size={20} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-wa-chipBg flex items-center justify-center mb-4">
          <Radio size={32} className="text-wa-accentBright" strokeWidth={1.4} />
        </div>
        <p className="text-[15px] text-wa-textPrimary mb-1.5">No channels followed</p>
        <p className="text-[13px] text-wa-textSecondary leading-relaxed">
          Channel discovery isn&apos;t part of the Baileys protocol yet, so this stays
          empty rather than showing made-up channels.
        </p>
      </div>
    </div>
  );
}
