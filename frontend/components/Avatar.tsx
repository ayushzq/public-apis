"use client";

import { initials, cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}

const PALETTE = [
  "#8a4b3b", "#4b6b8a", "#5b7a4b", "#7a4b7a",
  "#4b7a7a", "#8a7a4b", "#6b4b8a", "#8a4b6b",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ name, src, size = 40, online, className }: AvatarProps) {
  const dim = { width: size, height: size };
  return (
    <div className={cn("relative shrink-0", className)} style={dim}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-medium select-none"
          style={{ backgroundColor: colorFor(name), fontSize: size * 0.4 }}
        >
          {initials(name) || "?"}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-wa-accentBright border-2 border-wa-panelBg"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
