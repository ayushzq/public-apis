"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import { Palette, Check, X, Sparkles, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

// ─── Types ────────────────────────────────────────────────────────────────

export interface ChatTheme {
  id: string;
  name: string;
  /** Full-resolution URL for the chat background */
  bgUrl: string;
  /** Low-res thumbnail URL */
  thumbUrl: string;
  /** Dominant accent colour derived from the author's username hash */
  accent: string;
}

// ─── Picsum API ─────────────────────────────────────────────────────────────

interface PicsumPhoto {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
}

const PAGE_LIMIT = 20;

/** Hash a string to a hex colour – used to give each wallpaper a unique accent */
function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 52%)`;
}

function picsumToTheme(photo: PicsumPhoto): ChatTheme {
  return {
    id: photo.id,
    name: photo.author,
    bgUrl: `https://picsum.photos/id/${photo.id}/800/1400`,
    thumbUrl: `https://picsum.photos/id/${photo.id}/144/256`,
    accent: hashToColor(photo.author + photo.id),
  };
}

async function fetchPage(page: number): Promise<ChatTheme[]> {
  const res = await fetch(
    `https://picsum.photos/v2/list?page=${page}&limit=${PAGE_LIMIT}`
  );
  if (!res.ok) throw new Error("Picsum fetch failed");
  const data: PicsumPhoto[] = await res.json();
  return data.map(picsumToTheme);
}

// ─── 3-D Tilt Card ──────────────────────────────────────────────────────────

function TiltCard({
  theme,
  isSelected,
  onSelect,
  index,
}: {
  theme: ChatTheme;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useTransform(my, [-40, 40], [8, -8]);
  const rotateY = useTransform(mx, [-40, 40], [-8, 8]);
  const springX = useSpring(rotateX, { stiffness: 400, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 400, damping: 30 });

  const onMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left - rect.width / 2);
    my.set(e.clientY - rect.top - rect.height / 2);
  };

  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const delay = Math.min(index * 0.035, 0.6);

  return (
    <motion.button
      ref={ref}
      onClick={onSelect}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 24, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 380, damping: 26 }}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex flex-col items-center gap-1.5 focus:outline-none group w-full"
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-md transition-shadow duration-300 group-hover:shadow-2xl"
        style={{
          aspectRatio: "9/16",
          boxShadow: isSelected
            ? `0 0 0 3px ${theme.accent}, 0 8px 32px ${theme.accent}44`
            : undefined,
        }}
      >
        <img
          src={theme.thumbUrl}
          alt={theme.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/5 to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-2 gap-1">
          <div className="self-end bg-white/85 backdrop-blur-sm rounded-xl rounded-br-sm px-2 py-1 w-14 h-2 shadow-sm" />
          <div
            className="self-start rounded-xl rounded-bl-sm px-2 py-1 w-10 h-2 shadow-sm"
            style={{ backgroundColor: `${theme.accent}DD` }}
          />
          <div className="self-end bg-white/85 backdrop-blur-sm rounded-xl rounded-br-sm px-2 py-1 w-16 h-2 shadow-sm" />
        </div>

        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: theme.accent }}
            >
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
          }}
          initial={{ x: "-100%" }}
          whileHover={{ x: "200%", transition: { duration: 0.55, ease: "easeInOut" } }}
        />
      </div>

      <span className="text-[10px] font-semibold text-gray-400 group-hover:text-gray-700 transition-colors duration-200 text-center leading-tight w-full truncate px-1">
        {theme.name}
      </span>
    </motion.button>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-5 h-5 text-gray-400" />
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
// Purely presentational: the selected theme is *controlled* from the parent
// (app/chat/page.tsx), which persists it per-contact via chatLogic's
// `setContactWallpaper`. This component no longer touches localStorage or
// any storage layer itself — it just renders and reports selection.

export interface ThemeSelectorProps {
  currentTheme?: ChatTheme | null;
  onChange: (theme: ChatTheme) => void;
}

export default function ThemeSelector({ currentTheme, onChange }: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);

  const [wallpapers, setWallpapers] = useState<ChatTheme[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (loading || !hasMore) return;
      setLoading(true);
      setError(null);
      try {
        const items = await fetchPage(pageNum);
        if (items.length < PAGE_LIMIT) setHasMore(false);
        setWallpapers((prev) => {
          const existingIds = new Set(prev.map((w) => w.id));
          const fresh = items.filter((w) => !existingIds.has(w.id));
          return [...prev, ...fresh];
        });
        setPage(pageNum + 1);
      } catch (err) {
        setError("Failed to load wallpapers. Tap to retry.");
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore]
  );

  useEffect(() => {
    if (open && wallpapers.length === 0) {
      loadPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadPage(page);
        }
      },
      { root: scrollRef.current, rootMargin: "0px 0px 120px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, page, loadPage]);

  const handleSelect = (theme: ChatTheme) => {
    onChange(theme);
  };

  const accentColor = currentTheme?.accent ?? "#00A884";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200",
            open ? "bg-[#00A884]/15 text-[#00A884]" : "text-[#54656F] hover:bg-gray-200"
          )}
          title="Chat Wallpaper"
        >
          <Palette className="w-5 h-5" />
          <motion.span
            className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: accentColor }}
            animate={{ scale: open ? 1.4 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          />
        </motion.button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={8} avoidCollisions className="z-[100] outline-none" asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn(
              "w-[360px] max-h-[560px] rounded-3xl overflow-hidden",
              "bg-white/82 backdrop-blur-3xl",
              "shadow-[0_32px_80px_rgba(0,0,0,0.20),0_2px_8px_rgba(0,0,0,0.06)]",
              "border border-white/60",
              "flex flex-col"
            )}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/80 shrink-0">
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, 18, -18, 0] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.5 }}>
                  <Sparkles className="w-4 h-4 text-[#00A884]" />
                </motion.div>
                <h3 className="text-[15px] font-bold text-gray-800 tracking-tight">Wallpaper</h3>
              </div>

              <div className="flex items-center gap-2">
                {currentTheme && (
                  <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1 max-w-[110px]">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-white/40"
                      style={{ backgroundImage: `url(${currentTheme.thumbUrl})`, backgroundSize: "cover" }}
                    />
                    <span className="text-[11px] font-semibold text-gray-500 truncate">{currentTheme.name}</span>
                  </div>
                )}

                <Popover.Close asChild>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </motion.button>
                </Popover.Close>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                {wallpapers.map((theme, i) => (
                  <TiltCard
                    key={theme.id}
                    theme={theme}
                    isSelected={currentTheme?.id === theme.id}
                    onSelect={() => handleSelect(theme)}
                    index={i}
                  />
                ))}
              </div>

              {error && (
                <button onClick={() => loadPage(page)} className="w-full py-4 text-sm text-red-400 hover:text-red-600 transition-colors font-medium">
                  {error}
                </button>
              )}

              <div ref={sentinelRef} className="w-full">
                {loading && <Spinner />}
              </div>

              {!hasMore && !loading && (
                <p className="text-center text-[11px] text-gray-300 py-4 font-medium tracking-wide">You've seen them all ✦</p>
              )}

              <div className="h-3" />
            </div>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
