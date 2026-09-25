"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare, List, Image, FileText, Video } from "lucide-react";
import {
  type TextNodeData,
  type ListNodeData,
  type MediaNodeData,
} from "@/store/useChatbotStore";

// ─── Text Node ────────────────────────────────────────────────────────────────

export const TextNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TextNodeData; // Fix applied here

  return (
    <div
      className={`
        relative min-w-[240px] max-w-[280px] rounded-2xl border transition-all duration-200
        bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl shadow-black/40
        ${selected ? "border-green-400 shadow-green-400/20 shadow-2xl ring-1 ring-green-400/30" : "border-slate-700 hover:border-slate-500"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/70">
            Text Message
          </p>
          <p className="text-xs font-semibold text-slate-200 truncate leading-tight mt-0.5">
            {nodeData.label || "Text Block"}
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-700/60" />

      <div className="mx-3 my-3 rounded-xl bg-[#0b141a] border border-slate-700/50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-b border-slate-700/40">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-slate-300 font-medium">BaseKey Bot</span>
        </div>
        <div className="p-3">
          <div className="bg-[#202c33] rounded-lg rounded-tl-none p-2.5">
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {nodeData.body || "Enter your message..."}
            </p>
            {nodeData.footer && (
              <p className="text-[9px] text-slate-500 mt-1">{nodeData.footer}</p>
            )}
            <p className="text-[8px] text-slate-600 mt-1 text-right">12:00 PM ✓✓</p>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ right: -6 }}
      />
      {selected && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-green-400/20" />
      )}
    </div>
  );
});
TextNode.displayName = "TextNode";

// ─── List Node ────────────────────────────────────────────────────────────────

export const ListNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ListNodeData; // Fix applied here
  const totalRows = (nodeData.sections || []).reduce(
    (acc, s) => acc + (s.rows?.length || 0),
    0
  );

  return (
    <div
      className={`
        relative min-w-[260px] max-w-[300px] rounded-2xl border transition-all duration-200
        bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl shadow-black/40
        ${selected ? "border-green-400 shadow-green-400/20 shadow-2xl ring-1 ring-green-400/30" : "border-slate-700 hover:border-slate-500"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <List className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/70">
            List Message
          </p>
          <p className="text-xs font-semibold text-slate-200 truncate leading-tight mt-0.5">
            {nodeData.label || "List Menu"}
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-700/60" />

      <div className="mx-3 my-3 rounded-xl bg-[#0b141a] border border-slate-700/50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-b border-slate-700/40">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-slate-300 font-medium">BaseKey Bot</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="bg-[#202c33] rounded-lg rounded-tl-none p-2.5">
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {nodeData.body || "Enter message body..."}
            </p>
            <p className="text-[8px] text-slate-600 mt-1 text-right">12:00 PM ✓✓</p>
          </div>
          <button className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-green-500/50 rounded-lg py-1.5 px-3">
            <List className="w-2.5 h-2.5 text-green-400" />
            <span className="text-[10px] font-medium text-green-400">
              {nodeData.buttonText || "View Options"}
            </span>
          </button>
          <p className="text-[9px] text-slate-500 text-center">
            {nodeData.sections?.length || 0} section(s) · {totalRows} item(s)
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ right: -6 }}
      />
      {selected && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-green-400/20" />
      )}
    </div>
  );
});
ListNode.displayName = "ListNode";

// ─── Media Node ───────────────────────────────────────────────────────────────

export const MediaNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as MediaNodeData; // Fix applied here

  const iconMap = {
    image: <Image className="w-3.5 h-3.5 text-amber-400" />,
    video: <Video className="w-3.5 h-3.5 text-amber-400" />,
    document: <FileText className="w-3.5 h-3.5 text-amber-400" />,
  };

  const typeLabel = {
    image: "Image Message",
    video: "Video Message",
    document: "Document Message",
  };

  const mediaType = nodeData.mediaType || "image";

  return (
    <div
      className={`
        relative min-w-[240px] max-w-[280px] rounded-2xl border transition-all duration-200
        bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl shadow-black/40
        ${selected ? "border-green-400 shadow-green-400/20 shadow-2xl ring-1 ring-green-400/30" : "border-slate-700 hover:border-slate-500"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30">
          {iconMap[mediaType]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">
            {typeLabel[mediaType]}
          </p>
          <p className="text-xs font-semibold text-slate-200 truncate leading-tight mt-0.5">
            {nodeData.label || "Media Block"}
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-700/60" />

      <div className="mx-3 my-3 rounded-xl bg-[#0b141a] border border-slate-700/50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-b border-slate-700/40">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-slate-300 font-medium">BaseKey Bot</span>
        </div>
        <div className="p-3">
          {nodeData.mediaUrl ? (
            mediaType === "image" ? (
              <img
                src={nodeData.mediaUrl}
                alt="preview"
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
            ) : (
              <div className="w-full h-16 rounded-lg bg-slate-700 flex items-center justify-center mb-2">
                {iconMap[mediaType]}
                <span className="text-[10px] text-slate-400 ml-1">
                  {nodeData.filename || "media file"}
                </span>
              </div>
            )
          ) : (
            <div className="w-full h-20 rounded-lg bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center mb-2">
              {iconMap[mediaType]}
              <p className="text-[9px] text-slate-500 mt-1">No media uploaded</p>
            </div>
          )}
          {nodeData.caption && (
            <p className="text-[10px] text-slate-400">{nodeData.caption}</p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ right: -6 }}
      />
      {selected && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-green-400/20" />
      )}
    </div>
  );
});
MediaNode.displayName = "MediaNode";
