"use client";

import React, { useState, useMemo } from "react";
import { RefreshCw, Eye, Pencil, FileText, AlertCircle, Loader2, Plus } from "lucide-react";
import { TemplateCategory, MetaTemplateRecord } from "../../types/template.types";
import TemplateViewModal from "./TemplateViewModal";
import { useTheme } from "next-themes"; // 🔥 NAYA: Theme ke liye import

export default function TemplateList({
  templates,
  loading,
  errorMsg,
  onSync,
  onCreateNew,
  onEdit,
}: {
  templates: MetaTemplateRecord[];
  loading: boolean;
  errorMsg: string;
  onSync: () => void;
  onCreateNew: () => void;
  onEdit: (tpl: MetaTemplateRecord) => void;
}) {
  const [viewTemplate, setViewTemplate] = useState<MetaTemplateRecord | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const filteredTemplates = useMemo(() => {
    if (filterCategory === "ALL") return templates;
    return templates.filter((t) => t.category === filterCategory);
  }, [templates, filterCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: templates.length };
    templates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  return (
    <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] text-[#16191f] dark:text-[#eaeded] font-sans pb-20">
      {viewTemplate && (
        <TemplateViewModal template={viewTemplate} onClose={() => setViewTemplate(null)} />
      )}

      {/* --- Enterprise / AWS Style Header --- */}
      <div className="flex items-center justify-between px-5 lg:px-6 py-3 border-b border-[#eaeded] dark:border-[#414750] bg-[#232f3e] dark:bg-[#16191f] sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
            Message Templates <span className="text-[#aab7b8] text-[14px] font-normal hidden sm:inline">| BaseKey CRM</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSync}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#545b64] hover:bg-[#2a3039] rounded-sm text-[13px] font-bold text-white disabled:opacity-50 transition"
            title="Sync from Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0073bb] hover:bg-[#005a93] text-white rounded-sm text-[13px] font-bold transition disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Template</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="px-5 lg:px-6 pt-5 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...Object.values(TemplateCategory)] as string[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-bold border transition-all ${
                filterCategory === cat
                  ? "bg-[#0073bb] text-white border-[#0073bb]"
                  : "bg-white dark:bg-[#16191f] text-[#545b64] dark:text-[#aab7b8] border-[#eaeded] dark:border-[#414750] hover:border-[#0073bb] hover:text-[#0073bb] dark:hover:border-[#3b99fc] dark:hover:text-[#3b99fc]"
              }`}
            >
              {cat !== "ALL" && filterCategory !== cat && (
                <span className={`w-1.5 h-1.5 rounded-full ${
                  cat === "MARKETING" ? "bg-[#e77c40]" :
                  cat === "UTILITY" ? "bg-[#0073bb]" :
                  "bg-[#2ca02c]"
                }`} />
              )}
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
              {categoryCounts[cat] > 0 && (
                <span className={`ml-0.5 ${filterCategory === cat ? "opacity-80 text-white" : "opacity-60 text-[#aab7b8]"}`}>
                  ({categoryCounts[cat]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-5 lg:p-6 max-w-7xl mx-auto">
        {errorMsg ? (
          <div className="text-center py-10 bg-[#fff5f5] dark:bg-[#3f1919] border border-[#d62728]/20 rounded-lg text-[#d62728] font-bold">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {errorMsg}
          </div>
        ) : loading ? (
          // Fallback UI (Skeleton actually handles this now, but kept for safety)
          <div className="flex flex-col items-center justify-center py-20 text-[#545b64] dark:text-[#aab7b8]">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#0073bb] dark:text-[#3b99fc]" />
            <p className="text-[13px] font-bold uppercase tracking-wider">Syncing Meta API...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#d5dbdb] dark:border-[#545b64] rounded-lg bg-[#fafafa] dark:bg-[#16191f] shadow-sm">
            <div className="w-12 h-12 bg-white dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded-sm flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-[#545b64] dark:text-[#aab7b8]" />
            </div>
            <p className="text-[#16191f] dark:text-[#eaeded] font-bold text-[14px] mb-1">
              {filterCategory !== "ALL"
                ? `No ${filterCategory.toLowerCase()} templates found.`
                : "No templates found"}
            </p>
            <p className="text-[#545b64] dark:text-[#879596] text-[12px] mb-5">
              {filterCategory !== "ALL"
                ? "Try a different category filter."
                : "Create your first template or import from Meta"}
            </p>
            <button
              onClick={onCreateNew}
              className="bg-[#0073bb] hover:bg-[#005a93] text-white px-5 py-2 rounded-sm font-bold text-[13px] shadow-sm transition disabled:opacity-50"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 hover:shadow-md hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3
                      className="font-bold text-[15px] text-[#16191f] dark:text-[#eaeded] truncate pr-2 leading-tight"
                      title={tpl.name}
                    >
                      {tpl.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-sm font-bold tracking-wider uppercase flex-shrink-0 border ${
                        tpl.status === "APPROVED"
                          ? "bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                          : tpl.status === "REJECTED"
                          ? "bg-[#fff5f5] dark:bg-[#d62728]/10 text-[#d62728] border-[#d62728]/30"
                          : "bg-[#fff8e6] dark:bg-[#e88a00]/10 text-[#e88a00] border-[#e88a00]/30"
                      }`}
                    >
                      {tpl.status || "PENDING"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                      Class: <span className="font-bold text-[#16191f] dark:text-[#eaeded] ml-1">{tpl.category}</span>
                    </p>
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                      Locale: <span className="font-bold text-[#16191f] dark:text-[#eaeded] ml-1">{tpl.language}</span>
                    </p>
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                      Payload: <span className="font-bold text-[#16191f] dark:text-[#eaeded] ml-1">{tpl.components?.length || 0} blocks</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-5 pt-4 border-t border-[#eaeded] dark:border-[#414750]">
                  <button
                    onClick={() => setViewTemplate(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#fafafa] dark:bg-[#0f1114] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] border border-[#d5dbdb] dark:border-[#545b64] rounded-sm text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => onEdit(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#f0f8ff] dark:bg-[#0073bb]/10 hover:bg-[#0073bb]/20 border border-[#0073bb]/30 rounded-sm text-[12px] font-bold text-[#0073bb] dark:text-[#3b99fc] transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
