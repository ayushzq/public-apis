"use client";

import { FileText, UserPlus, Video, Sparkles, Laptop, Phone } from "lucide-react";

const QUICK_ACTIONS = [
  { icon: FileText, label: "Send document" },
  { icon: UserPlus, label: "Add contact" },
  { icon: Video, label: "New call" },
  { icon: Sparkles, label: "Ask Meta AI" },
];

export default function EmptyState() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center chat-bg-pattern px-6">
      <div className="bg-wa-panelBg rounded-2xl px-10 py-10 flex flex-col items-center max-w-sm text-center shadow-panel">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <Laptop size={56} className="text-wa-textSecondary" strokeWidth={1.3} />
          <Phone size={28} className="absolute -bottom-1 -right-1 text-wa-accent" strokeWidth={1.5} />
        </div>
        <h2 className="text-[17px] font-medium text-wa-textPrimary mb-2">
          Voice and video calling is now available
        </h2>
        <p className="text-[13.5px] text-wa-textSecondary leading-relaxed">
          Now you can make and join calls on WhatsApp Web.
        </p>
      </div>

      <div className="flex items-center gap-6 mt-10">
        {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-2 text-wa-textSecondary hover:text-wa-textPrimary transition-colors"
          >
            <span className="w-12 h-12 rounded-full bg-wa-panelBg flex items-center justify-center">
              <Icon size={20} />
            </span>
            <span className="text-[11px] whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
