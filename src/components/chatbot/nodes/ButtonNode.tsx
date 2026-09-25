"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare, Zap, ChevronRight } from "lucide-react";
import { type ButtonNodeData } from "@/store/useChatbotStore";

const ButtonNode = memo(({ data, selected }: NodeProps) => {
const nodeData = data as unknown as ButtonNodeData;

  return (
    <div
      className={`
        relative min-w-[260px] max-w-[300px] rounded-2xl border transition-all duration-200
        bg-gradient-to-b from-slate-800 to-slate-900
        shadow-xl shadow-black/40
        ${
          selected
            ? "border-green-400 shadow-green-400/20 shadow-2xl ring-1 ring-green-400/30"
            : "border-slate-700 hover:border-slate-500"
        }
      `}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ left: -6 }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30">
          <Zap className="w-3.5 h-3.5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400/70">
            Interactive Buttons
          </p>
          <p className="text-xs font-semibold text-slate-200 truncate leading-tight mt-0.5">
            {nodeData.label || "Button Message"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-slate-700/60" />

      {/* WhatsApp Phone Mock */}
      <div className="mx-3 my-3 rounded-xl bg-[#0b141a] border border-slate-700/50 overflow-hidden">
        {/* Phone header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-b border-slate-700/40">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-slate-300 font-medium">BaseKey Bot</span>
          <div className="ml-auto flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>

        {/* Message bubble */}
        <div className="p-3 space-y-2">
          <div className="bg-[#202c33] rounded-lg rounded-tl-none p-2.5 max-w-[90%]">
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {nodeData.body || "Enter your message body here..."}
            </p>
            {nodeData.footer && (
              <p className="text-[9px] text-slate-500 mt-1">{nodeData.footer}</p>
            )}
            <p className="text-[8px] text-slate-600 mt-1 text-right">12:00 PM ✓✓</p>
          </div>

          {/* Buttons */}
          <div className="space-y-1">
            {(nodeData.buttons || []).map((btn, idx) => (
              <div
                key={btn.id}
                className="relative flex items-center justify-between bg-[#202c33] border border-slate-600/40 rounded-lg px-3 py-2 group"
              >
                <span className="text-[10px] font-medium text-green-400 flex-1 truncate">
                  {btn.text || `Button ${idx + 1}`}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1" />
                {/* Per-button source handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`btn-${btn.id}`}
                  className="!w-2.5 !h-2.5 !bg-green-400 !border-2 !border-slate-900 !rounded-full !opacity-0 group-hover:!opacity-100 transition-opacity"
                  style={{ right: -14 }}
                />
              </div>
            ))}
            {(!nodeData.buttons || nodeData.buttons.length === 0) && (
              <div className="text-[9px] text-slate-600 italic text-center py-2">
                No buttons added
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom source handle (fallthrough) */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900 !rounded-full"
        style={{ right: -6 }}
      />

      {/* Selection glow */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-green-400/20" />
      )}
    </div>
  );
});

ButtonNode.displayName = "ButtonNode";
export default ButtonNode;
