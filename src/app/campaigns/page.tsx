"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Plus, Search, RefreshCw, Send, CheckCircle2, 
  AlertCircle, BarChart3, Trash2, FileText, 
  Users, Filter, Calendar, Loader2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

import CampaignWizardModal from "@/components/campaigns/CampaignWizardModal";
import CampaignAnalyticsDrawer from "@/components/campaigns/CampaignAnalyticsDrawer";

interface CampaignItem {
  id: string;
  name: string;
  templateName: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED";
  totalRecipients: number;
  sentCount: number;
  deliveredCount?: number;
  failedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals & Drawers state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Custom Delete Dialog State (No browser default popup)
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real Database Fetcher (Zero Fallback / Zero Dummy)
  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.campaigns || [];
        setCampaigns(list);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // Auto refresh while any campaign is active
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Format Date & Time (e.g. 19 Sep 2026, 06:15 PM)
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
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

  // Custom Confirm Delete Execution
  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/campaigns?id=${campaignToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete.id));
        toast.success(`Campaign "${campaignToDelete.name}" deleted successfully.`);
        setCampaignToDelete(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("Network error while deleting campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  // Real Metrics Calculation
  const totalBroadcasts = campaigns.length;
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount ?? c.sentCount ?? 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failedCount ?? 0), 0);
  const totalAttempts = totalDelivered + totalFailed;
  const overallSuccessRate = totalAttempts > 0 
    ? Math.round((totalDelivered / totalAttempts) * 100) 
    : 0;

  // Filter logic
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.templateName || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && c.status.toUpperCase() !== statusFilter) return false;
    return true;
  });

  const handleOpenDrawer = (id: string) => {
    setSelectedCampaignId(id);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] overflow-hidden pb-[70px] md:pb-0 font-sans text-[#16191f] dark:text-[#eaeded] relative select-none">
      {/* Universal BaseKey Sidebar */}
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
        
        {/* Top Header */}
        <div className="bg-[#232f3e] dark:bg-[#16191f] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm border-b border-[#232f3e] dark:border-[#414750]">
          <div>
            <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
              Broadcast Campaigns <span className="text-[#aab7b8] text-[14px] font-normal">| WhatsApp Engine</span>
            </h1>
            <p className="text-[11px] text-[#aab7b8] mt-0.5">
              Enterprise queue dispatcher with real-time delivery and read receipt tracking
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCampaigns}
              className="bg-transparent hover:bg-[#2a3039] text-[#aab7b8] hover:text-white p-2 rounded-sm border border-[#414750] transition cursor-pointer"
              title="Refresh Campaigns"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#0073bb]" : ""}`} />
            </button>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-[#0073bb] hover:bg-[#005a93] text-white px-4 py-2 rounded-sm text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Broadcast
            </button>
          </div>
        </div>

        {/* Main Dashboard Container */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
          
          {/* Top 4 Real KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] block">
                Total Broadcasts
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[24px] font-bold text-[#16191f] dark:text-[#eaeded] font-mono">{totalBroadcasts}</span>
                <Send className="w-4 h-4 text-[#0073bb]" />
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] block">
                Total Delivered
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[24px] font-bold text-[#10B981] font-mono">{totalDelivered}</span>
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] block">
                Meta Delivery Rate
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[24px] font-bold text-[#0073bb] dark:text-[#3b99fc] font-mono">{overallSuccessRate}%</span>
                <span className={`text-[11px] font-bold ${
                  overallSuccessRate >= 80 
                    ? "text-[#10B981]" 
                    : overallSuccessRate > 0 
                    ? "text-[#e88a00]" 
                    : "text-[#879596]"
                }`}>
                  {overallSuccessRate >= 80 ? "Healthy" : overallSuccessRate > 0 ? "Normal" : "No Activity"}
                </span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] block">
                Failed Messages
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[24px] font-bold text-[#d62728] font-mono">{totalFailed}</span>
                <AlertCircle className="w-4 h-4 text-[#d62728]" />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-[#16191f] rounded-sm shadow-xs border border-[#eaeded] dark:border-[#414750] overflow-hidden flex flex-col">
            
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fafafa] dark:bg-[#1c2128]">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-[#879596] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter campaigns by name or template..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] pl-9 pr-3 py-1.5 text-[12px] rounded-sm outline-none focus:border-[#0073bb]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-[#545b64] dark:text-[#aab7b8]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] px-3 py-1.5 text-[12px] font-bold rounded-sm outline-none focus:border-[#0073bb] flex-1 sm:flex-initial"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RUNNING">Running / Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750]">
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Campaign & Template</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Launch Time</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Live Progress</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Audience</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaeded] dark:divide-[#414750] text-[13px]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#0073bb] mx-auto mb-2" />
                        <span className="text-xs text-[#879596]">Loading broadcast records...</span>
                      </td>
                    </tr>
                  ) : filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[#545b64] dark:text-[#879596] text-[13px]">
                        No broadcast campaigns found. Click "Create Broadcast" to launch a campaign.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((camp) => {
                      const total = camp.totalRecipients || 0;
                      const sent = camp.sentCount || 0;
                      const percent = total > 0
                        ? Math.round(((sent + camp.failedCount) / total) * 100)
                        : 0;

                      return (
                        <tr 
                          key={camp.id} 
                          className="hover:bg-[#fafafa] dark:hover:bg-[#1c2128]/60 transition-colors"
                        >
                          {/* Name & Template */}
                          <td className="px-5 py-4">
                            <div>
                              <span 
                                onClick={() => handleOpenDrawer(camp.id)}
                                className="font-bold text-[#16191f] dark:text-[#eaeded] hover:text-[#0073bb] dark:hover:text-[#3b99fc] cursor-pointer"
                              >
                                {camp.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#545b64] dark:text-[#879596]">
                                <FileText className="w-3 h-3" />
                                <span className="font-mono text-[#0073bb] dark:text-[#3b99fc]">{camp.templateName}</span>
                              </div>
                            </div>
                          </td>

                          {/* Launch Timestamp */}
                          <td className="px-5 py-4 whitespace-nowrap text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#879596]" />
                              {formatDateTime(camp.startedAt || camp.createdAt)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider border ${
                              camp.status === "RUNNING"
                                ? "bg-[#f0f8ff] dark:bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] border-[#0073bb]/30"
                                : camp.status === "COMPLETED"
                                ? "bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                                : camp.status === "FAILED"
                                ? "bg-[#fff5f5] dark:bg-[#3f1919] text-[#d62728] border-[#d62728]/30"
                                : "bg-[#fafafa] dark:bg-[#1c2128] text-[#545b64] dark:text-[#aab7b8] border-[#d5dbdb] dark:border-[#414750]"
                            }`}>
                              {camp.status === "RUNNING" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0073bb] dark:bg-[#3b99fc] animate-pulse" />
                              )}
                              {camp.status}
                            </span>
                          </td>

                          {/* Live Progress Bar */}
                          <td className="px-5 py-4 w-56">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>{camp.sentCount} / {total} Sent</span>
                                <span className="text-[#0073bb] dark:text-[#3b99fc] font-mono">{percent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#eaeded] dark:bg-[#0f1114] rounded-full overflow-hidden flex">
                                <div 
                                  className="bg-[#10B981] transition-all duration-300" 
                                  style={{ width: `${(camp.sentCount / (total || 1)) * 100}%` }}
                                />
                                <div 
                                  className="bg-[#d62728] transition-all duration-300" 
                                  style={{ width: `${(camp.failedCount / (total || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Audience Count */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-1.5 text-xs">
                              <Users className="w-3.5 h-3.5 text-[#879596]" /> {total} Leads
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenDrawer(camp.id)}
                                className="bg-[#f0f8ff] dark:bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] border border-[#0073bb]/30 hover:bg-[#0073bb] hover:text-white px-3 py-1.5 rounded-sm text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> View Analytics
                              </button>
                              
                              <button
                                onClick={() => setCampaignToDelete({ id: camp.id, name: camp.name })}
                                className="p-1.5 rounded-sm border border-[#d5dbdb] dark:border-[#414750] text-[#879596] hover:text-[#d62728] hover:border-[#d62728]/40 hover:bg-[#d62728]/10 transition cursor-pointer"
                                title="Delete Campaign"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {campaignToDelete && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#16191f]/75 dark:bg-black/85 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#16191f] rounded-lg border border-[#eaeded] dark:border-[#414750] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Strip */}
            <div className="bg-[#d62728]/10 border-b border-[#d62728]/20 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#d62728]/20 flex items-center justify-center text-[#d62728] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#16191f] dark:text-white">Delete Campaign</h3>
                <p className="text-[11px] text-[#545b64] dark:text-[#aab7b8]">This action is irreversible</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              <p className="text-[13px] text-[#545b64] dark:text-[#aab7b8] leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-[#16191f] dark:text-white">"{campaignToDelete.name}"</strong>?
              </p>
              <div className="p-3 bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded text-[11px] text-[#879596]">
                All queue history, recipient delivery statuses, and WAMID logs tied to this campaign will be purged from Neon PostgreSQL.
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fafafa] dark:bg-[#1c2128] border-t border-[#eaeded] dark:border-[#414750] px-6 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCampaignToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-sm border border-[#d5dbdb] dark:border-[#414750] text-[#545b64] dark:text-[#aab7b8] hover:text-[#16191f] dark:hover:text-white text-[12px] font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-[#d62728] hover:bg-[#b51d1e] text-white px-5 py-1.5 rounded-sm text-[12px] font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Wizard Modal (4 Steps) --- */}
      <CampaignWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          fetchCampaigns();
          toast.success("Broadcast engine activated!");
        }}
      />

      {/* --- Live Tracking Analytics Drawer --- */}
      <CampaignAnalyticsDrawer
        campaignId={selectedCampaignId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCampaignId(null);
        }}
      />
    </div>
  );
}
