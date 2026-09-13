"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Search, FileText, Link2, Download } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { cn } from "@/lib/utils";

type Tab = "media" | "docs" | "links";

const DOCS = [
  { name: "Assignment-01.pdf", size: "2 MB · PDF" },
  { name: "Notes-Chapter-5.pdf", size: "720 KB · PDF" },
];

const LINKS = [
  { title: "Interesting article of the week", domain: "example.com" },
];

export default function MediaModal() {
  const { isMediaModalOpen, closeMediaModal } = useChatStore();
  const [tab, setTab] = useState<Tab>("media");

  return (
    <AnimatePresence>
      {isMediaModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={closeMediaModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-wa-modalBg rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
              <div>
                <p className="text-[16px] text-wa-textPrimary font-medium">Media, links and docs</p>
                <p className="text-[12px] text-wa-textSecondary">From this chat</p>
              </div>
              <div className="flex items-center gap-4 text-wa-textSecondary">
                <button aria-label="Search"><Search size={18} /></button>
                <button aria-label="Close" onClick={closeMediaModal}><X size={20} /></button>
              </div>
            </div>

            <div className="flex border-b border-wa-border">
              {(["media", "docs", "links"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-3 text-[14px] capitalize border-b-2 transition-colors",
                    tab === t ? "text-wa-accentBright border-wa-accentBright" : "text-wa-textSecondary border-transparent"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "media" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-wa-chipBg rounded-sm" />
                  ))}
                </div>
              )}

              {tab === "docs" && (
                <div className="flex flex-col gap-1">
                  {DOCS.map((d) => (
                    <div key={d.name} className="flex items-center gap-3 py-2.5">
                      <span className="w-10 h-10 rounded bg-wa-danger/20 flex items-center justify-center text-wa-danger">
                        <FileText size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-wa-textPrimary truncate">{d.name}</p>
                        <p className="text-[12px] text-wa-textSecondary">{d.size}</p>
                      </div>
                      <button aria-label="Download" className="text-wa-textSecondary">
                        <Download size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === "links" && (
                <div className="flex flex-col gap-1">
                  {LINKS.map((l) => (
                    <div key={l.title} className="flex items-center gap-3 py-2.5">
                      <span className="w-10 h-10 rounded bg-wa-chipBg flex items-center justify-center text-wa-textSecondary">
                        <Link2 size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] text-wa-textPrimary truncate">{l.title}</p>
                        <p className="text-[12px] text-wa-textSecondary">{l.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
