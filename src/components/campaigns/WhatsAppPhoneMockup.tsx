"use client";

import React from "react";
import { CheckCheck, Phone, Video, MoreVertical, ChevronLeft, Globe, ExternalLink } from "lucide-react";

interface ButtonItem {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phoneNumber?: string;
}

interface WhatsAppPhoneMockupProps {
  businessName?: string;
  headerImageUrl?: string | null;
  bodyText: string;
  footerText?: string;
  buttons?: ButtonItem[];
}

export default function WhatsAppPhoneMockup({
  businessName = "BaseKey Verified Business",
  headerImageUrl,
  bodyText,
  footerText,
  buttons = [],
}: WhatsAppPhoneMockupProps) {
  // Current time for message bubble
  const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Basic bold formatting support (*text*)
  const formatBody = (text: string) => {
    if (!text) return "Select a template to view real-time WhatsApp preview...";
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return <strong key={index} className="font-bold">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="w-[310px] sm:w-[330px] rounded-[36px] bg-[#111b21] p-3 shadow-2xl border-4 border-[#2a3942] relative select-none shrink-0 font-sans">
      {/* Top Mobile Speaker & Camera Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#202c33] rounded-full flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#111b21]"></div>
        <div className="w-8 h-1 rounded-full bg-[#111b21]"></div>
      </div>

      {/* Screen Frame */}
      <div className="rounded-[28px] overflow-hidden flex flex-col h-[520px] bg-[#0b141a] text-[#e9edef] mt-2 relative border border-[#202c33]">
        
        {/* WhatsApp App Header Bar */}
        <div className="bg-[#202c33] px-3 py-2.5 flex items-center justify-between text-white border-b border-[#2a3942]">
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4 text-[#aebac1]" />
            <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-[11px] font-bold text-white shadow-inner">
              BK
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-[#e9edef] truncate max-w-[120px]">{businessName}</p>
              <span className="text-[9px] text-[#00a884] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] inline-block"></span> Official Account
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#aebac1]">
            <Video className="w-3.5 h-3.5" />
            <Phone className="w-3.5 h-3.5" />
            <MoreVertical className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* WhatsApp Chat Body with Classic Pattern Look */}
        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col justify-end bg-[radial-gradient(#202c33_1px,transparent_1px)] [background-size:12px_12px]">
          
          {/* WhatsApp Message Bubble */}
          <div className="bg-[#202c33] max-w-[92%] rounded-lg rounded-tl-none shadow-md border border-[#2a3942]/60 overflow-hidden self-start">
            
            {/* Optional Header Media */}
            {headerImageUrl && (
              <div className="w-full h-36 bg-[#111b21] overflow-hidden relative border-b border-[#2a3942]">
                <img
                  src={headerImageUrl}
                  alt="Template Header"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Message Body Content */}
            <div className="p-2.5 text-[12px] text-[#e9edef] leading-relaxed whitespace-pre-wrap break-words">
              {formatBody(bodyText)}

              {/* Optional Footer */}
              {footerText && (
                <p className="text-[10px] text-[#8696a0] mt-2 pt-1 border-t border-[#2a3942]/40">
                  {footerText}
                </p>
              )}

              {/* Timestamp & Double Checkmarks */}
              <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696a0]">
                <span>{timeString}</span>
                <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
              </div>
            </div>

            {/* Quick Reply & CTA Buttons */}
            {buttons.length > 0 && (
              <div className="border-t border-[#2a3942] divide-y divide-[#2a3942]">
                {buttons.map((btn, idx) => (
                  <div
                    key={idx}
                    className="py-2 px-3 text-center text-[11px] font-semibold text-[#53bdeb] hover:bg-[#182229] transition flex items-center justify-center gap-1.5 cursor-default"
                  >
                    {btn.type === "URL" && <Globe className="w-3 h-3" />}
                    {btn.type === "PHONE_NUMBER" && <Phone className="w-3 h-3" />}
                    <span>{btn.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fake Chat Input Bar */}
        <div className="p-2 bg-[#202c33] flex items-center gap-2 border-t border-[#2a3942]">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-[#8696a0]">
            Reply as customer...
          </div>
        </div>
      </div>
    </div>
  );
}
