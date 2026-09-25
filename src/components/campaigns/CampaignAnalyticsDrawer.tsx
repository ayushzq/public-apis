"use client";

import React, { useState, useEffect } from "react";
import { 
  X, RefreshCw, CheckCircle2, AlertCircle, Clock, 
  CheckCheck, Phone, Search, Calendar, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

interface CampaignLogItem {
  id: string;
  phoneNumber: string;
  recipientName?: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  messageId?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt: string;
}

interface CampaignDetail {
  id: string;
  name: string;
  templateName: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED";
  totalRecipients: number;
  sentCount: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

interface CampaignAnalyticsDrawerProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignAnalyticsDrawer({
  campaignId,
  isOpen,
  onClose,
}: CampaignAnalyticsDrawerProps) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [logs, setLogs] = useState<CampaignLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 📱 ANDROID HARDWARE / GESTURE BACK BUTTON INTERCEPTOR
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ drawerOpen: true }, "");

    const handleAndroidBack = () => {
      onClose();
    };

    window.addEventListener("popstate", handleAndroidBack);
    return () => {
      window.removeEventListener("popstate", handleAndroidBack);
    };
  }, [isOpen, onClose]);

  // Date & Time Formatter
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Real Database Logs & Metrics Fetcher
  const fetchDetails = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign || data);
        
        const rawLogs = data.logs || data.campaign?.logs || [];
        const formattedLogs: CampaignLogItem[] = rawLogs.map((l: any) => ({
          id: l.id,
          phoneNumber: l.recipientPhone || l.phoneNumber || l.contact?.phone || "N/A",
          recipientName: l.recipientName || l.contact?.name || "Customer",
          status: (l.status || "QUEUED").toUpperCase(),
          messageId: l.wamid || l.messageId,
          errorMessage: l.errorMessage || l.error,
          createdAt: l.createdAt,
          updatedAt: formatDateTime(l.updatedAt || l.createdAt),
        }));

        setLogs(formattedLogs);
      }
    } catch (err) {
      console.error("Error fetching campaign details from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchDetails();
      const interval = setInterval(() => {
        fetchDetails();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, campaignId]);

  const handleCopyNumber = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success(`Copied +${phone} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy All Filtered Numbers Button Handler
  const handleCopyAllNumbers = () => {
    const phonesToCopy = filteredLogs.map((l) => `+${l.phoneNumber}`).join("\n");
    if (!phonesToCopy) {
      toast.error("No numbers found to copy");
      return;
    }
    navigator.clipboard.writeText(phonesToCopy);
    setCopiedAll(true);
    toast.success(`Copied ${filteredLogs.length} numbers to clipboard!`);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (!isOpen) return null;

  const total = campaign?.totalRecipients || logs.length;
  const sent = campaign?.sentCount || logs.filter(l => l.status === "SENT" || l.status === "DELIVERED" || l.status === "READ").length;
  const failed = campaign?.failedCount || logs.filter(l => l.status === "FAILED").length;
  const progressPercent = total > 0 ? Math.min(100, Math.round(((sent + failed) / total) * 100)) : 0;
  const launchTimestamp = campaign?.startedAt || campaign?.createdAt;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.recipientName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      log.phoneNumber.includes(searchQuery);

    if (!matchesSearch) return false;
    
    // Robust status filtering
    if (filterStatus !== "ALL") {
      if (filterStatus === "SENT" && log.status !== "SENT" && log.status !== "DELIVERED" && log.status !== "READ") return false;
      if (filterStatus === "QUEUED" && log.status !== "QUEUED") return false;
      if (filterStatus === "FAILED" && log.status !== "FAILED") return false;
      if (filterStatus === "DELIVERED" && log.status !== "DELIVERED" && log.status !== "SENT" && log.status !== "READ") return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] flex justify-end font-sans">
      <div 
        className="fixed inset-0 bg-[#16191f]/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-[#16191f] text-[#16191f] dark:text-[#eaeded] shadow-2xl border-l border-[#eaeded] dark:border-[#414750] flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="bg-[#232f3e] px-6 py-4 flex items-center justify-between text-white border-b border-[#232f3e] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                campaign?.status === "COMPLETED" 
                  ? "bg-[#10B981] text-white" 
                  : campaign?.status === "RUNNING"
                  ? "bg-[#0073bb] text-white animate-pulse"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {campaign?.status || "LIVE"}
              </span>
              <h3 className="text-[16px] font-bold tracking-tight">{campaign?.name || "Campaign Analytics"}</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#aab7b8] mt-1.5 font-medium">
              <span>
                Template: <strong className="font-mono text-white">{campaign?.templateName || "N/A"}</strong>
              </span>
              <span className="flex items-center gap-1 text-[#3b99fc] bg-[#0073bb]/20 px-2 py-0.5 rounded">
                <Calendar className="w-3 h-3" />
                Launched: <strong className="text-white">{formatDateTime(launchTimestamp)}</strong>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Copy All Numbers Button */}
            <button
              onClick={handleCopyAllNumbers}
              className="bg-[#0073bb] hover:bg-[#005a93] text-white px-3 py-1.5 rounded-sm text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="Copy all currently filtered numbers"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "Copied!" : "Copy All"}
            </button>

            <button 
              onClick={fetchDetails}
              disabled={loading}
              className="p-2 rounded-sm hover:bg-[#2a3039] text-[#aab7b8] hover:text-white transition cursor-pointer"
              title="Refresh Analytics Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#0073bb]" : ""}`} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-sm hover:bg-[#2a3039] text-[#aab7b8] hover:text-white transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Broadcast Progress Bar */}
        <div className="p-5 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] shrink-0">
          <div className="flex items-center justify-between text-[12px] font-bold mb-1.5">
            <span className="text-[#545b64] dark:text-[#aab7b8]">Live Delivery Progress</span>
            <span className="text-[#0073bb] dark:text-[#3b99fc] font-mono">{progressPercent}% Completed</span>
          </div>
          
          <div className="w-full h-2.5 bg-[#eaeded] dark:bg-[#0f1114] rounded-full overflow-hidden border border-[#d5dbdb] dark:border-[#414750] flex">
            <div 
              className="bg-[#10B981] transition-all duration-500" 
              style={{ width: `${total > 0 ? (sent / total) * 100 : 0}%` }}
            />
            <div 
              className="bg-[#d62728] transition-all duration-500" 
              style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white dark:bg-[#16191f] p-2.5 rounded-sm border border-[#eaeded] dark:border-[#414750] text-center">
              <span className="text-[10px] uppercase font-bold text-[#545b64] dark:text-[#879596] block">Total Target</span>
              <span className="text-[16px] font-bold text-[#16191f] dark:text-[#eaeded]">{total}</span>
            </div>
            <div className="bg-white dark:bg-[#16191f] p-2.5 rounded-sm border border-[#eaeded] dark:border-[#414750] text-center">
              <span className="text-[10px] uppercase font-bold text-[#10B981] block">Sent / Delivered</span>
              <span className="text-[16px] font-bold text-[#10B981]">{sent}</span>
            </div>
            <div className="bg-white dark:bg-[#16191f] p-2.5 rounded-sm border border-[#eaeded] dark:border-[#414750] text-center">
              <span className="text-[10px] uppercase font-bold text-[#d62728] block">Failed</span>
              <span className="text-[16px] font-bold text-[#d62728]">{failed}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] flex items-center gap-3 bg-white dark:bg-[#16191f] shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#879596] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] pl-8 pr-3 py-1.5 text-[12px] rounded-sm outline-none focus:border-[#0073bb]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] px-3 py-1.5 text-[12px] font-bold rounded-sm outline-none focus:border-[#0073bb]"
          >
            <option value="ALL">All Status</option>
            <option value="SENT">Sent / Delivered</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Recipient Messages Audit Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading && logs.length === 0 ? (
            <div className="p-12 text-center text-[#545b64] dark:text-[#879596] text-[12px] flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#0073bb]" />
              <span>Fetching live delivery logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#545b64] dark:text-[#879596] text-[12px]">
              <Clock className="w-8 h-8 mx-auto mb-2 text-[#879596] opacity-40" />
              <p className="font-semibold text-slate-300">No message delivery logs found.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] hover:border-[#0073bb] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#16191f] dark:text-[#eaeded]">{log.recipientName}</span>
                    
                    {/* 1-Click Copy Number Button */}
                    <button
                      onClick={() => handleCopyNumber(log.phoneNumber, log.id)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-[#232f3e] text-[#3b99fc] hover:bg-[#0073bb] hover:text-white transition cursor-pointer"
                      title="Click to copy phone number"
                    >
                      <Phone className="w-3 h-3" />
                      +{log.phoneNumber}
                      {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                    </button>
                  </div>

                  {log.messageId && (
                    <p className="text-[10px] font-mono text-[#879596] mt-0.5 truncate max-w-sm" title={log.messageId}>
                      WAMID: {log.messageId}
                    </p>
                  )}

                  {log.errorMessage && (
                    <p className="text-[11px] text-[#d62728] mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {log.errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider border ${
                    log.status === "READ" || log.status === "DELIVERED" || log.status === "SENT"
                      ? "bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                      : log.status === "QUEUED"
                      ? "bg-[#f0f8ff] dark:bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] border-[#0073bb]/30"
                      : "bg-[#fff5f5] dark:bg-[#3f1919] text-[#d62728] border-[#d62728]/30"
                  }`}>
                    {log.status === "FAILED" ? <AlertCircle className="w-3 h-3" /> : <CheckCheck className="w-3 h-3 text-[#10B981]" />}
                    {log.status}
                  </span>
                  
                  <span className="text-[10px] text-[#879596]">{log.updatedAt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
