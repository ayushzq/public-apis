"use client";

import React from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  MapPin,
  CornerUpLeft,
  ExternalLink,
  Phone,
  Code2,
  Info,
  Bot
} from "lucide-react";
import { useTheme } from "next-themes";
import { MetaTemplateRecord } from "../../types/template.types";

export default function TemplateViewModal({
  template,
  onClose,
}: {
  template: MetaTemplateRecord | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!template) return null;

  const headerComp: any = template.components?.find((c: any) => c.type === "HEADER");
  const bodyComp: any = template.components?.find((c: any) => c.type === "BODY");
  const footerComp: any = template.components?.find((c: any) => c.type === "FOOTER");
  const buttonsComp: any = template.components?.find((c: any) => c.type === "BUTTONS");

  // Format Body Text with Examples for Preview
  let previewBodyText = bodyComp?.text || "";
  const bodyExamples = bodyComp?.example?.body_text?.[0] || [];
  bodyExamples.forEach((val: string, i: number) => {
    previewBodyText = previewBodyText.replace(`{{${i + 1}}}`, `${val}`);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30";
      case "REJECTED": return "bg-[#fff5f5] dark:bg-[#d62728]/10 text-[#d62728] border-[#d62728]/30";
      default: return "bg-[#fff8e6] dark:bg-[#e88a00]/10 text-[#e88a00] border-[#e88a00]/30";
    }
  };

  return (
    <div className="fixed inset-0 bg-[#16191f]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" />
              {template.name}
            </h2>
            <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] mt-0.5">Official Meta Template Configuration</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#eaeded] dark:hover:bg-[#2a3039] rounded-sm transition text-[#545b64] dark:text-[#aab7b8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Split Layout) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Left Column: Details & JSON */}
          <div className="w-full md:w-1/2 flex flex-col overflow-y-auto custom-scrollbar p-6 border-r border-[#eaeded] dark:border-[#414750]">
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={`text-[11px] px-2.5 py-1 rounded-sm font-bold border uppercase tracking-wider ${getStatusStyle(template.status || "PENDING")}`}>
                {template.status || "PENDING"}
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-sm font-bold bg-[#f2f3f3] dark:bg-[#2a3039] text-[#545b64] dark:text-[#aab7b8] border border-[#d5dbdb] dark:border-[#545b64] uppercase tracking-wider">
                {template.category}
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-sm font-bold bg-[#f2f3f3] dark:bg-[#2a3039] text-[#545b64] dark:text-[#aab7b8] border border-[#d5dbdb] dark:border-[#545b64] uppercase tracking-wider">
                {template.language}
              </span>
            </div>

            {/* Variable Mapping Info */}
            {bodyExamples.length > 0 && (
              <div className="mb-6 bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/30 rounded-lg p-4">
                <p className="text-[11px] font-bold text-[#0073bb] dark:text-[#3b99fc] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Mapped Variables
                </p>
                <div className="space-y-2">
                  {bodyExamples.map((val: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-[12px]">
                      <span className="font-mono font-bold text-[#545b64] dark:text-[#aab7b8] bg-white dark:bg-[#16191f] px-1.5 py-0.5 rounded border border-[#eaeded] dark:border-[#414750]">
                        {`{{${i + 1}}}`}
                      </span>
                      <span className="text-[#16191f] dark:text-[#eaeded]">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Components List */}
            <div className="space-y-3 flex-1">
              <p className="text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider mb-2">Block Definitions</p>
              
              {template.components?.map((comp: any, idx: number) => (
                <div key={idx} className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded-lg p-3">
                  <p className="text-[10px] font-extrabold text-[#545b64] dark:text-[#879596] uppercase tracking-widest mb-1.5">{comp.type}</p>
                  
                  {comp.type === "HEADER" && (
                    <div className="text-[12px] text-[#16191f] dark:text-[#eaeded] font-medium">
                      Format: <span className="font-bold text-[#0073bb] dark:text-[#3b99fc]">{comp.format}</span>
                    </div>
                  )}
                  {comp.type === "BODY" && (
                    <div className="text-[12px] text-[#545b64] dark:text-[#aab7b8] line-clamp-2">
                      {comp.text}
                    </div>
                  )}
                  {comp.type === "BUTTONS" && (
                    <div className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                      {comp.buttons?.length || 0} Actions Configured
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Raw JSON Toggle */}
            <div className="mt-6 pt-4 border-t border-[#eaeded] dark:border-[#414750]">
              <details className="group">
                <summary className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] cursor-pointer hover:text-[#0073bb] dark:hover:text-[#3b99fc] flex items-center gap-1.5 select-none">
                  <Code2 className="w-4 h-4" /> View Developer Payload (JSON)
                </summary>
                <pre className="mt-3 bg-[#16191f] dark:bg-[#0f1114] text-[#10B981] text-[11px] p-4 rounded-lg overflow-x-auto border border-[#414750] shadow-inner font-mono">
                  {JSON.stringify(template, null, 2)}
                </pre>
              </details>
            </div>
          </div>

          {/* Right Column: Meta WhatsApp Preview */}
          <div className="w-full md:w-1/2 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden">
            
            {/* WhatsApp Chat Header Mock */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-[#d1d7db] dark:border-[#111b21] shadow-sm z-10 shrink-0">
               <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                 <Bot className="w-5 h-5 text-white" />
               </div>
               <div>
                 <p className="text-[14px] font-bold text-[#111b21] dark:text-[#e9edef] leading-tight">Business Account</p>
                 <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">Template Preview</p>
               </div>
            </div>

            {/* WhatsApp Chat Background (The actual preview) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col relative z-0">
               {/* Pattern Overlay */}
               <div className="absolute inset-0 opacity-10 dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: "400px" }}></div>
               
               {/* Message Bubble */}
               <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tl-none p-2 max-w-[90%] md:max-w-[85%] shadow-sm relative z-10 self-start">
                  
                  {/* Header Render */}
                  {headerComp && headerComp.format !== "NONE" && (
                    <div className="mb-2">
                      {headerComp.format === "TEXT" && headerComp.text && (
                        <p className="text-[14px] font-bold text-[#111b21] dark:text-[#e9edef] leading-snug">
                          {headerComp.text}
                        </p>
                      )}
                      {(headerComp.format === "IMAGE" || headerComp.format === "VIDEO" || headerComp.format === "DOCUMENT") && (
                        <div className="w-full h-32 bg-black/10 dark:bg-black/20 rounded-md flex items-center justify-center overflow-hidden">
                          {headerComp.example?.header_handle?.[0] ? (
                            headerComp.format === "VIDEO" ? (
                              <video src={headerComp.example.header_handle[0]} className="w-full h-full object-cover" />
                            ) : (
                              <img src={headerComp.example.header_handle[0]} alt="Header" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="flex flex-col items-center text-[#54656f] dark:text-[#aebac1]">
                              {headerComp.format === "IMAGE" && <ImageIcon className="w-6 h-6 mb-1" />}
                              {headerComp.format === "VIDEO" && <Video className="w-6 h-6 mb-1" />}
                              {headerComp.format === "DOCUMENT" && <FileText className="w-6 h-6 mb-1" />}
                              <span className="text-[10px] uppercase font-bold tracking-widest">{headerComp.format}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body Render */}
                  {bodyComp && (
                    <div className="text-[14px] text-[#111b21] dark:text-[#e9edef] leading-snug whitespace-pre-wrap">
                      {/* 🔥 FIX: Added types for part and i */}
                      {previewBodyText.split(/(\*.*?\*)/g).map((part: string, i: number) => {
                        if (part.startsWith('*') && part.endsWith('*')) {
                          return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
                        }
                        return part;
                      })}
                    </div>
                  )}

                  {/* Footer Render */}
                  {footerComp && footerComp.text && (
                    <div className="mt-1.5 text-[12px] text-[#667781] dark:text-[#8696a0]">
                      {footerComp.text}
                    </div>
                  )}

                  {/* WhatsApp Time stamp mock */}
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
               </div>

               {/* Buttons Render (Outside the main bubble in modern Meta UI) */}
               {buttonsComp && buttonsComp.buttons && (
                  <div className="mt-1 space-y-1 w-[90%] md:w-[85%] self-start relative z-10">
                    {buttonsComp.buttons.map((btn: any, bIdx: number) => (
                      <div key={bIdx} className="bg-white dark:bg-[#202c33] rounded-lg p-2.5 flex items-center justify-center gap-2 shadow-sm border border-transparent dark:border-[#111b21]">
                        {btn.type === "QUICK_REPLY" && <CornerUpLeft className="w-4 h-4 text-[#00a884]" />}
                        {btn.type === "URL" && <ExternalLink className="w-4 h-4 text-[#00a884]" />}
                        {btn.type === "PHONE_NUMBER" && <Phone className="w-4 h-4 text-[#00a884]" />}
                        <span className="text-[14px] font-medium text-[#00a884] dark:text-[#00a884]">{btn.text}</span>
                      </div>
                    ))}
                  </div>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
