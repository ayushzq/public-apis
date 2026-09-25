"use client";
import { toast } from "sonner";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Bot, Plus, RefreshCw, ServerCrash } from "lucide-react";
import { useTheme } from "next-themes"; // 🔥 NAYA: Theme Toggle

import { CreateTemplatePayload, MetaTemplateRecord } from "../../types/template.types";
import TemplateList from "./TemplateList";
import CreateTemplateForm from "./CreateTemplateForm";

// ─── AWS Style Skeleton Loader (For List View) ───
const TemplateSkeleton = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-5">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-4">
         <div className="h-6 w-48 bg-[#eaeded] dark:bg-[#2a3039] rounded-sm animate-pulse" />
         <div className="h-8 w-32 bg-[#eaeded] dark:bg-[#2a3039] rounded-sm animate-pulse" />
      </div>
      
      {/* Cards Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 flex flex-col gap-4 animate-pulse shadow-sm">
            <div className="flex justify-between items-start">
               <div className="w-10 h-10 bg-[#f2f3f3] dark:bg-[#2a3039] rounded-sm" />
               <div className="w-16 h-4 bg-[#eaeded] dark:bg-[#2a3039] rounded-full" />
            </div>
            <div className="h-4 w-3/4 bg-[#eaeded] dark:bg-[#2a3039] rounded-sm" />
            <div className="h-3 w-1/2 bg-[#f2f3f3] dark:bg-[#2a3039] rounded-sm mt-2" />
            <div className="mt-auto pt-4 flex gap-2">
               <div className="h-8 flex-1 bg-[#f2f3f3] dark:bg-[#2a3039] rounded-sm" />
               <div className="h-8 flex-1 bg-[#f2f3f3] dark:bg-[#2a3039] rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TemplateBuilderUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "list";
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: session, status } = useSession();

  const [templates, setTemplates] = useState<MetaTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [editTemplate, setEditTemplate] = useState<MetaTemplateRecord | null>(null);

  // ─── Auth guard ───
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ─── Fetch templates (server-side, Neon-backed) ───
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/whatsapp/templates");
      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || "Failed to fetch templates.");
        setTemplates([]);
      } else {
        setTemplates(result.templates || []);
      }
    } catch {
      setErrorMsg("Failed to connect to Meta servers.");
    } finally {
      // Skeleton thodi der dikhane ke liye fake timeout (AWS jaisa feel)
      setTimeout(() => setLoading(false), 500); 
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && currentStep === "list") {
      fetchTemplates();
    }
  }, [status, currentStep, fetchTemplates]);

  // ─── Create ───
  const handleSaveTemplateToMeta = async (payload: CreateTemplatePayload) => {
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Meta Error: " + data.error);
      } else {
        toast.success("Template successfully submitted to Meta!");
        router.push("?step=list");
        fetchTemplates();
      }
    } catch {
      toast.error("Network Error: Failed to submit template.");
    }
  };

  // ─── Edit (delete + recreate) ───
  const handleEditTemplate = async (payload: CreateTemplatePayload) => {
    if (!editTemplate) return;
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: editTemplate.name, payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Meta Error: " + data.error);
      } else {
        toast.success("Template successfully updated!");
        setEditTemplate(null);
        fetchTemplates();
      }
    } catch {
      toast.error("Network Error: Failed to update template.");
    }
  };

  // ─── Render Handling ───
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#f2f3f3] dark:bg-[#0f1114] text-[#545b64] dark:text-[#aab7b8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0073bb] dark:text-[#3b99fc] mb-4" />
        <p className="text-[13px] font-bold uppercase tracking-wider">Authenticating...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f2f3f3] dark:bg-[#0f1114] text-[#d62728] font-bold text-[13px]">
        Authentication Required. Please log in.
      </div>
    );
  }

  if (editTemplate) {
    return (
      <div className="h-full bg-[#f2f3f3] dark:bg-[#0f1114]">
        <CreateTemplateForm
          onSave={handleEditTemplate}
          onBack={() => setEditTemplate(null)}
          initialData={editTemplate}
        />
      </div>
    );
  }

  if (currentStep === "create") {
    return (
      <div className="h-full bg-[#f2f3f3] dark:bg-[#0f1114]">
        <CreateTemplateForm 
          onSave={handleSaveTemplateToMeta} 
          onBack={() => router.push("?step=list")} 
        />
      </div>
    );
  }

  // List View Handlers
  if (loading) {
    return <TemplateSkeleton />;
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#f2f3f3] dark:bg-[#0f1114]">
         <div className="bg-white dark:bg-[#16191f] border border-[#d62728]/30 p-8 rounded-lg shadow-sm text-center max-w-md">
            <div className="w-12 h-12 bg-[#d62728]/10 text-[#d62728] rounded-full flex items-center justify-center mx-auto mb-4">
              <ServerCrash className="w-6 h-6" />
            </div>
            <h2 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded] mb-2">Connection Error</h2>
            <p className="text-[13px] text-[#545b64] dark:text-[#aab7b8] mb-6">{errorMsg}</p>
            <button 
              onClick={fetchTemplates} 
              className="px-4 py-2 bg-[#16191f] dark:bg-white text-white dark:text-[#16191f] rounded-sm text-[13px] font-bold flex items-center gap-2 mx-auto hover:opacity-80 transition"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
         </div>
      </div>
    );
  }

  return (
    <TemplateList
      templates={templates}
      loading={loading}
      errorMsg={errorMsg}
      onSync={fetchTemplates}
      onCreateNew={() => router.push("?step=create")}
      onEdit={(tpl) => setEditTemplate(tpl)}
    />
  );
}
