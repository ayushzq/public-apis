"use client";

import { Search, UserPlus, Phone, MoreHorizontal } from "lucide-react";

/**
 * Real WhatsApp call history isn't exposed by Baileys (voice/video calls
 * are end-to-end signalled, not something a linked-device client can
 * read), so this stays an honest empty state instead of showing fake
 * call logs.
 */
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

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-wa-chipBg flex items-center justify-center mb-4">
          <Phone size={32} className="text-wa-accentBright" strokeWidth={1.4} />
        </div>
        <p className="text-[15px] text-wa-textPrimary mb-1.5">No call history yet</p>
        <p className="text-[13px] text-wa-textSecondary leading-relaxed">
          Voice and video calls you make from a linked device will need calling
          permissions WhatsApp doesn&apos;t expose to web clients — this tab is here for
          layout parity with the real app.
        </p>
      </div>
    </div>
  );
}
