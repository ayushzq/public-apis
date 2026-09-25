"use client";

import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TemplateBuilderUI from "@/components/template-builder/TemplateBuilderUI";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes"; // 🔥 NAYA: Theme ke liye import

export default function TemplatePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] overflow-hidden pb-[70px] md:pb-0 font-sans text-[#16191f] dark:text-[#eaeded]">
      
      {/* Sidebar Navigation */}
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f2f3f3] dark:bg-[#0f1114]">
        
        {/* 
          TemplateBuilderUI ab khud hi List, Create Form, Firebase API fetch, 
          aur Android URL routing (?step=create) handle karta hai.
          
          Suspense zaroori hai kyunki humare UI component mein Next.js ka 
          useSearchParams() hook use ho raha hai.
        */}
        <Suspense 
          fallback={
            <div className="flex flex-col h-full w-full items-center justify-center bg-[#f2f3f3] dark:bg-[#0f1114] text-[#545b64] dark:text-[#aab7b8]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0073bb] dark:text-[#3b99fc] mb-4" />
              <p className="text-[13px] font-bold uppercase tracking-wider">Loading Template Engine...</p>
            </div>
          }
        >
          <TemplateBuilderUI />
        </Suspense>
        
      </div>
    </div>
  );
}
