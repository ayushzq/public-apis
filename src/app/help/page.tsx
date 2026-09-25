"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar"; 
import { useTheme } from "next-themes";
import { 
  HelpCircle, Mail, BookOpen, ChevronDown, 
  ExternalLink, FileText, MessageSquare, Zap, Terminal, Activity
} from "lucide-react";

const FAQS = [
  {
    q: "How do I sync my Google Contacts?",
    a: "Navigate to the Audience & Contacts page, click on 'Import Contacts', and select 'Sync Google Contacts'. Approve the OAuth consent screen to securely fetch and store your phonebook numbers in your PostgreSQL database."
  },
  {
    q: "How can I upload contacts using an Excel or CSV file?",
    a: "On the Contacts page, click 'Import Contacts' and choose 'Upload CSV'. Ensure your file has standard headers (e.g., Name, Phone, Email) with the phone number in international format (e.g., 919876543210)."
  },
  {
    q: "How does the Campaign broadcast system work?",
    a: "Campaigns allow you to dispatch approved Meta templates to your synced contact lists in bulk. BaseKey CRM manages the batching and provides live delivery and read-rate analytics."
  },
  {
    q: "Is my data secure and where is it stored?",
    a: "Yes. BaseKey CRM is fully upgraded. All your contacts, configurations, and message logs are securely encrypted and stored in a private Neon PostgreSQL database, not Firebase. Your Meta Access Tokens never leave the server."
  },
  {
    q: "How do I trigger messages from my own application?",
    a: "Go to the Developers & API section. Generate an Authentication Token bound to your approved template, and use the provided cURL snippet to make POST requests to the BaseKey Trigger Endpoint."
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] overflow-hidden pb-[70px] md:pb-0 font-sans text-[#16191f] dark:text-[#eaeded] relative">
      
      {/* ─── Sidebar Navigation ─── */}
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      {/* ─── Main Content Area (Scrollable) ─── */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
        
        {/* --- AWS Style Top Bar --- */}
        <div className="bg-[#232f3e] dark:bg-[#16191f] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm border-b border-[#232f3e] dark:border-[#414750]">
          <div>
            <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
              Support Center <span className="text-[#aab7b8] text-[14px] font-normal hidden sm:inline">| BaseKey CRM</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="mailto:support@basekey.in" 
              className="flex items-center gap-1.5 px-4 py-1.5 bg-transparent border border-[#545b64] hover:bg-[#2a3039] rounded-sm text-[13px] font-bold text-white transition"
            >
              <Mail className="w-3.5 h-3.5" /> Contact Support
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
          
          {/* Top Banner (Enterprise Status) */}
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0073bb] opacity-5 rounded-full blur-3xl pointer-events-none" />
            <div className="z-10 w-full md:w-auto">
              <h2 className="text-[18px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0073bb] dark:text-[#3b99fc]" />
                How can we help you today?
              </h2>
              <p className="text-[13px] text-[#545b64] dark:text-[#aab7b8] mt-1.5 max-w-xl">
                Browse our official documentation, explore API references, or contact our dedicated enterprise support team for technical assistance.
              </p>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto z-10">
              <div className="flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] px-4 py-3 rounded-lg min-w-[120px]">
                <Activity className="w-5 h-5 text-[#10B981] mb-1" />
                <span className="text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider">API Status</span>
                <span className="text-[14px] font-bold text-[#10B981] mt-0.5">All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <a href="/developers" className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-colors group">
               <Terminal className="w-5 h-5 text-[#545b64] dark:text-[#aab7b8] group-hover:text-[#0073bb] dark:group-hover:text-[#3b99fc] mb-3 transition-colors" />
               <h3 className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1">Developer API</h3>
               <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">Generate API tokens and view webhook documentation.</p>
             </a>
             <a href="/template" className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-colors group">
               <MessageSquare className="w-5 h-5 text-[#545b64] dark:text-[#aab7b8] group-hover:text-[#0073bb] dark:group-hover:text-[#3b99fc] mb-3 transition-colors" />
               <h3 className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1">Message Templates</h3>
               <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">Learn how to create and get Meta approval for templates.</p>
             </a>
             <a href="/settings" className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-colors group">
               <Zap className="w-5 h-5 text-[#545b64] dark:text-[#aab7b8] group-hover:text-[#0073bb] dark:group-hover:text-[#3b99fc] mb-3 transition-colors" />
               <h3 className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1">System Integrations</h3>
               <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">Configure your WABA ID and Meta App credentials securely.</p>
             </a>
          </div>

          {/* FAQs Section */}
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] p-6 space-y-5">
            <h2 className="text-[16px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0073bb] dark:text-[#3b99fc]" /> Official Knowledge Base
            </h2>

            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index} className={`border rounded-lg overflow-hidden transition-all duration-200 ${isOpen ? "border-[#0073bb]/30 dark:border-[#3b99fc]/30 bg-[#f0f8ff]/50 dark:bg-[#0073bb]/5" : "border-[#eaeded] dark:border-[#414750] bg-white dark:bg-[#16191f]"}`}>
                    <button 
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-5 py-4 text-left font-bold text-[#16191f] dark:text-[#eaeded] text-[13px] flex items-center justify-between hover:bg-[#fafafa] dark:hover:bg-[#2a3039] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-[#545b64] dark:text-[#aab7b8] transition-transform duration-300 ${isOpen ? "rotate-180 text-[#0073bb] dark:text-[#3b99fc]" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 py-4 text-[13px] text-[#545b64] dark:text-[#aab7b8] border-t border-[#eaeded] dark:border-[#414750] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Contact */}
          <div className="text-center py-6">
            <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">
              Can't find what you're looking for? 
              <a href="mailto:support@basekey.in" className="text-[#0073bb] dark:text-[#3b99fc] font-bold ml-1 hover:underline">
                Contact Developer Support
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
