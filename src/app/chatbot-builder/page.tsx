"use client";
import { toast } from "sonner";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  Save,
  Download,
  RotateCcw,
  ChevronDown,
  Cpu,
  CheckCircle,
  Loader2,
  Code2,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useChatbotStore } from "@/store/useChatbotStore";
// 🔥 NAYA: Firebase imports poori tarah se hata diye gaye hain!
import { useSession } from "next-auth/react"; 

// Dynamic import with fixed path using @/ alias to avoid path issues
const ChatbotCanvas = dynamic(
  () => import("@/components/chatbot/ChatbotCanvas"),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="flex-1 bg-[#F4F7F6] flex items-center justify-center gap-3 w-full h-full">
      <Loader2 className="w-5 h-5 text-[#25D366] animate-spin" />
      <span className="text-sm font-medium text-gray-500">Loading canvas…</span>
    </div>
  );
}

// ─── JSON Preview Modal (Light Theme) ────────────────────────────────────────

function JsonModal({
  json,
  onClose,
}: {
  json: object;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Code2 className="w-4 h-4 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Flow JSON Export</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Database-ready configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                copied 
                  ? "bg-green-50 border-[#25D366]/30 text-[#25D366]" 
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Code Block */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#F9FAFB]">
          <pre className="text-[12px] text-gray-700 rounded-xl overflow-x-auto leading-relaxed font-mono">
            {JSON.stringify(json, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main UI Component (Light Theme & Dedicated Canvas) ──────────────────────

export default function ChatbotBuilderPage() {
  const { data: session } = useSession(); // User session check karne ke liye

  const exportFlowAsJSON = useChatbotStore((s) => s.exportFlowAsJSON);
  const resetFlow = useChatbotStore((s) => s.resetFlow);
  const loadFlow = useChatbotStore((s) => s.loadFlow);
  const nodes = useChatbotStore((s) => s.nodes);
  const edges = useChatbotStore((s) => s.edges);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showJson, setShowJson] = useState(false);
  const [jsonData, setJsonData] = useState<object | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flowName, setFlowName] = useState("Main Chatbot Flow");
  const [isLoadingFlow, setIsLoadingFlow] = useState(true);

  // 🔄 Load the last-saved flow from Postgres on mount, instead of always
  // showing the hardcoded default nodes (BaseKey audit, P0 fix).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flows");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.flow) return;
        loadFlow(data.flow.nodes ?? [], data.flow.edges ?? []);
        setFlowName(data.flow.name ?? "Main Chatbot Flow");
      } catch (error) {
        console.error("Failed to load saved flow:", error);
      } finally {
        if (!cancelled) setIsLoadingFlow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFlow]);

  // 🚀 NAYA BADAAL: Neon PostgreSQL Database Saving Logic (API Route ke zariye)
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    
    try {
      const payload = {
        name: flowName,
        isActive: true,
        nodes: nodes, // Store se seedha nodes bhej rahe hain
        edges: edges, // Store se seedha edges bhej rahe hain
      };

      // API ko POST request bhejenge (Neon DB mein save karne ke liye)
      const res = await fetch("/api/flows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Database mein save nahi ho paya!");
      }

      console.log("✅ Flow successfully saved to Neon Database!");
      setSaveStatus("saved");
    } catch (error) {
      console.error("❌ Save Error:", error);
      toast.error("Failed to save flow. Check console for details.");
    } finally {
      // 2.5 second baad wapas normal state me le aayega
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }, [nodes, edges, flowName]);

  const handleExport = useCallback(() => {
    const json = exportFlowAsJSON();
    setJsonData(json);
    setShowJson(true);
  }, [exportFlowAsJSON]);

  const handleDownload = useCallback(() => {
    const json = exportFlowAsJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `basekey-flow-${Date.now()}.json`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportFlowAsJSON]);

  const handleReset = useCallback(() => {
    if (window.confirm("Are you sure you want to reset the entire flow? This cannot be undone.")) {
      resetFlow();
    }
  }, [resetFlow]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F4F7F6] overflow-hidden font-sans text-gray-900">
      
      {/* ── Top Bar ── */}
      <header className="relative z-20 flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        {/* Brand & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shadow-md border border-[#25D366]/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block">
              <span className="text-sm font-extrabold text-gray-800 tracking-tight">
                Base<span className="text-[#25D366]">Key</span>
              </span>
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-gray-300" />

          {/* Editable Flow Name */}
          <div className="hidden md:flex items-center gap-2 group">
            <input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none focus:text-gray-900 border-b border-transparent focus:border-[#25D366] transition-all min-w-0 w-48 px-1 py-0.5"
            />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>

        {/* Actions & Stats */}
        <div className="flex items-center gap-2.5">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            
            {/* Stats Badge */}
            <div className="flex items-center gap-4 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 mr-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                <span className="text-[11px] font-bold text-gray-500">{nodes.length} nodes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[11px] font-bold text-gray-500">{edges.length} connections</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-300"
            >
              <Code2 className="w-3.5 h-3.5" />
              JSON
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-300"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || nodes.length === 0 || isLoadingFlow}
              className={`
                flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300
                ${
                  saveStatus === "saved"
                    ? "bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] shadow-sm"
                    : "bg-[#25D366] hover:bg-[#1DA851] text-white shadow-md border border-transparent"
                }
                disabled:opacity-70 disabled:cursor-not-allowed
              `}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveStatus === "saved" ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Saved DB!"
                : "Save Flow"}
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || nodes.length === 0 || isLoadingFlow}
              className="flex items-center justify-center w-8 h-8 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg shadow-md transition-all disabled:opacity-60"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === "saved" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${
                mobileMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      <div 
        className={`md:hidden absolute top-[57px] left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-10 overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col p-3 gap-1.5">
          <button
            onClick={() => { handleExport(); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Code2 className="w-4 h-4 text-gray-400" /> View JSON Export
          </button>
          <button
            onClick={() => { handleDownload(); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" /> Download .json
          </button>
          <div className="h-px w-full bg-gray-200 my-1" />
          <button
            onClick={() => { handleReset(); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset Entire Flow
          </button>
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <main className="flex-1 relative overflow-hidden bg-[#F4F7F6]">
        <ChatbotCanvas />
      </main>

      {/* ── Status Bar (Footer) ── */}
      <footer className="hidden md:flex items-center justify-between px-5 py-2 bg-white border-t border-gray-200 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <Cpu className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500">
              WhatsApp Business API · BaseKey AI Engine
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DA851]"></span>
          </div>
          <span className="text-[10px] font-bold tracking-wide text-gray-500 uppercase">Neon DB Connected</span>
        </div>
      </footer>

      {/* JSON Modal */}
      {showJson && jsonData && (
        <JsonModal json={jsonData} onClose={() => setShowJson(false)} />
      )}
    </div>
  );
}
