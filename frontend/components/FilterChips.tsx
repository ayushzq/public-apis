"use client";

import { Plus } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { FilterChip } from "@/types";
import { cn } from "@/lib/utils";

const CHIPS: FilterChip[] = ["All", "Unread", "Favorites", "Groups"];

export default function FilterChips() {
  const { activeFilter, setActiveFilter } = useChatStore();

  return (
    <div className="flex items-center gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
      {CHIPS.map((chip) => {
        const active = activeFilter === chip;
        return (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-wa-chipActive text-white"
                : "bg-wa-chipBg text-wa-textSecondary hover:bg-wa-hover"
            )}
          >
            {chip}
          </button>
        );
      })}
      <button
        className="ml-auto w-7 h-7 rounded-full bg-wa-chipBg flex items-center justify-center text-wa-textSecondary hover:bg-wa-hover shrink-0"
        aria-label="More filters"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
