"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  X, ChevronRight, ChevronLeft, Send, Loader2, Sparkles, 
  Clock, Sliders, Image as ImageIcon, FileText, CheckCircle2, 
  AlertTriangle, ShieldCheck, UploadCloud, Users, Edit3, PlusCircle, Globe
} from "lucide-react";

import WhatsAppPhoneMockup from "./WhatsAppPhoneMockup";
import VariableMapper from "./VariableMapper";
import AudienceSelector, { ContactItem } from "./AudienceSelector";

export interface ParsedTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body: string;
  footer?: string;
  requiresMedia: boolean;
  buttons: Array<{ type: "URL" | "QUICK_REPLY"; text: string; url?: string }>;
  variables: string[];
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Global International Phone Sanitizer
// International format support: preserves country code if present, applies fallback only for bare local numbers
function cleanInternationalPhone(raw: string, defaultCountryCode: string = "91"): string {
  if (!raw) return "";
  let digits = String(raw).trim().replace(/\D/g, "");
  
  // Agar user ne leading 0 lagaya ho (local trunk prefix)
  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  // Bare national number (e.g. 10 digits in US/India) bina country code ke enter ho
  if (digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }

  return digits;
}

// Meta Template Parser
function parseTemplateData(raw: any): ParsedTemplate {
  let comps = raw.components;
  if (typeof comps === "string") {
    try {
      comps = JSON.parse(comps);
    } catch {
      comps = [];
    }
  }
  if (!Array.isArray(comps)) comps = [];

  const bodyComp = comps.find((c: any) => c.type?.toUpperCase() === "BODY");
  const headerComp = comps.find((c: any) => c.type?.toUpperCase() === "HEADER");
  const footerComp = comps.find((c: any) => c.type?.toUpperCase() === "FOOTER");
  const buttonsComp = comps.find((c: any) => c.type?.toUpperCase() === "BUTTONS");

  const bodyText: string = bodyComp?.text || raw.body || `Template: ${raw.name}`;
  const footerText: string = footerComp?.text || raw.footer || "";
  const requiresMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(
    headerComp?.format?.toUpperCase()
  );

  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  const variables: string[] = Array.from(new Set(matches));

  const buttons = (buttonsComp?.buttons || []).map((btn: any) => ({
    type: btn.type === "URL" ? "URL" : "QUICK_REPLY",
    text: btn.text || "Action",
    url: btn.url,
  }));

  return {
    id: raw.id || raw.name,
    name: raw.name,
    language: raw.language || "en",
    category: raw.category || "UTILITY",
    status: raw.status || "APPROVED",
    body: bodyText,
    footer: footerText,
    requiresMedia,
    buttons,
    variables,
  };
}

export default function CampaignWizardModal({
  isOpen,
  onClose,
  onSuccess,
}: CampaignWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campaign State
  const [campaignName, setCampaignName] = useState("");

  // Audience State: CRM vs Manual
  const [audienceMode, setAudienceMode] = useState<"crm" | "manual">("crm");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // International Fallback Country Code (Default 91, configurable)
  const [fallbackCountryCode, setFallbackCountryCode] = useState("91");
  const [manualPhoneInput, setManualPhoneInput] = useState("");

  // Meta Templates State
  const [templates, setTemplates] = useState<ParsedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Clean Variable State (user custom input or field mapping, zero hardcoded values)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const [pacingSeconds, setPacingSeconds] = useState(2);

  // Parse manual phone numbers entered by user (handles all international formats)
  const parsedManualPhones = useMemo(() => {
    if (!manualPhoneInput.trim()) return [];
    const rawTokens = manualPhoneInput.split(/[\n,;]+/).map((t) => t.trim());
    const valid: string[] = [];
    rawTokens.forEach((token) => {
      const cleaned = cleanInternationalPhone(token, fallbackCountryCode);
      // Valid E.164 lengths without prefix are between 10 to 15 digits
      if (cleaned.length >= 10 && cleaned.length <= 15 && !valid.includes(cleaned)) {
        valid.push(cleaned);
      }
    });
    return valid;
  }, [manualPhoneInput, fallbackCountryCode]);

  // Total Audience count calculation
  const totalAudienceCount = useMemo(() => {
    return audienceMode === "crm" ? selectedContactIds.length : parsedManualPhones.length;
  }, [audienceMode, selectedContactIds.length, parsedManualPhones.length]);

  // 1. Fetch Real Contacts & Meta Approved Templates
  useEffect(() => {
    if (!isOpen) return;

    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const res = await fetch("/api/contacts", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.contacts || [];
          setContacts(list);
          setSelectedContactIds(list.map((c: any) => c.id));
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    const fetchApprovedTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/whatsapp/templates", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data) ? data : data.templates || data.data || [];
          
          const approvedOnly = rawList.filter(
            (t: any) => String(t.status || "").toUpperCase() === "APPROVED"
          );

          const listToUse = approvedOnly.length > 0 ? approvedOnly : rawList;
          const parsed = listToUse.map((item: any) => parseTemplateData(item));

          setTemplates(parsed);
          if (parsed.length > 0) {
            setSelectedTemplateName(parsed[0].name);
            const initVars: Record<string, string> = {};
            parsed[0].variables.forEach((v: string, idx: number) => {
              // Default parameter 1 mapping to contact name, others empty for user input
              initVars[v] = idx === 0 ? "{{name}}" : "";
            });
            setVariableValues(initVars);
          }
        } else {
          console.error("Failed to load templates:", res.statusText);
        }
      } catch (err) {
        console.error("Meta Template fetch error:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchContacts();
    fetchApprovedTemplates();
  }, [isOpen]);

  const currentTemplate = useMemo(() => {
    return (
      templates.find((t) => t.name === selectedTemplateName) ||
      templates[0] || {
        id: "none",
        name: "No Template Found",
        language: "en",
        category: "UTILITY",
        status: "APPROVED",
        body: "Please select an approved template.",
        requiresMedia: false,
        buttons: [],
        variables: [],
      }
    );
  }, [templates, selectedTemplateName]);

  const handleTemplateChange = (tplName: string) => {
    setSelectedTemplateName(tplName);
    const target = templates.find((t) => t.name === tplName);
    if (target) {
      const newVars: Record<string, string> = {};
      target.variables.forEach((v: string, idx: number) => {
        newVars[v] = idx === 0 ? "{{name}}" : "";
      });
      setVariableValues(newVars);
    }
  };

  // Real-Time Simulator Text Interpolation (No fake defaults)
  const simulatedBodyText = useMemo(() => {
    let text = currentTemplate.body;
    (currentTemplate.variables || []).forEach((variableKey: string) => {
      const mappedVal = variableValues[variableKey];
      let replacement = variableKey;
      if (mappedVal === "{{name}}") {
        replacement = "Ayush Raj";
      } else if (mappedVal === "{{phone}}") {
        replacement = "+91 98765 43210";
      } else if (mappedVal && mappedVal.trim().length > 0) {
        replacement = mappedVal;
      }
      text = text.replace(variableKey, replacement);
    });
    return text;
  }, [currentTemplate, variableValues]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Header image size must be less than 5MB");
    }

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "campaign-headers");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Media upload failed");

      setHeaderMediaUrl(data.secure_url || data.url);
      toast.success("Broadcast header media attached!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload header media");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleVariableChange = (variableKey: string, mappedValue: string) => {
    setVariableValues((prev) => ({ ...prev, [variableKey]: mappedValue }));
  };

  const canProceed = () => {
    if (currentStep === 1) return campaignName.trim().length > 2;
    if (currentStep === 2) {
      return audienceMode === "crm" ? selectedContactIds.length > 0 : parsedManualPhones.length > 0;
    }
    if (currentStep === 3) {
      if (!templates.length) return false;
      if (currentTemplate.requiresMedia && !headerMediaUrl) return false;
      return true;
    }
    return true;
  };

  // Dispatch Campaign
  const handleLaunchCampaign = async () => {
    setIsSubmitting(true);
    try {
      let targetContacts: Array<{ id: string; name: string; phone: string; customAttributes?: any }> = [];

      if (audienceMode === "crm") {
        const filtered = contacts.filter((c) => selectedContactIds.includes(c.id));
        targetContacts = filtered
          .map((c: any) => ({
            id: c.id,
            name: c.name || "Customer",
            phone: cleanInternationalPhone(c.phone || c.phoneNumber || "", fallbackCountryCode),
            customAttributes: { tag: c.tags?.[0] || "" },
          }))
          .filter((c) => c.phone.length >= 10);
      } else {
        targetContacts = parsedManualPhones.map((ph, idx) => ({
          id: `manual_${idx}_${ph}`,
          name: `Recipient ${idx + 1}`,
          phone: ph,
          customAttributes: { tag: "Manual Entry" },
        }));
      }

      if (targetContacts.length === 0) {
        throw new Error("No valid international phone numbers found in audience.");
      }

      // Check if all variables are provided by user
      const unmapped = currentTemplate.variables.filter(
        (v) => !variableValues[v] || variableValues[v].trim() === ""
      );
      if (unmapped.length > 0) {
        throw new Error(`Please specify a value or contact field for ${unmapped.join(", ")}`);
      }

      const payload = {
        campaignName,
        templateName: currentTemplate.name,
        languageCode: currentTemplate.language,
        headerMediaUrl: headerMediaUrl || null,
        bodyVariables: currentTemplate.variables.map(
          (v: string) => variableValues[v] || ""
        ),
        contacts: targetContacts,
        pacingSeconds,
      };

      const res = await fetch("/api/campaigns/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch campaign");
      }

      toast.success(
        `Broadcast launched! Queued ${
          data.data?.totalQueued || targetContacts.length
        } messages.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Launch Error:", err);
      toast.error(err.message || "Something went wrong launching the campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalEstimatedSeconds = totalAudienceCount * pacingSeconds;
  const estimatedMinutes = (totalEstimatedSeconds / 60).toFixed(1);

  return (
    <div className="fixed inset-0 bg-[#16191f]/75 dark:bg-black/85 z-[100] flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs font-sans text-[#16191f] dark:text-[#eaeded] animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-2xl w-full max-w-5xl border border-[#eaeded] dark:border-[#414750] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-[#232f3e] px-6 py-3.5 flex justify-between items-center text-white border-b border-[#232f3e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#0073bb] flex items-center justify-center font-bold text-white shadow-sm transition-transform hover:scale-105">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight">Create WhatsApp Broadcast Campaign</h2>
              <p className="text-[11px] text-[#aab7b8]">Enterprise queue dispatcher with anti-ban pacing</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#aab7b8] hover:text-white p-1 rounded-sm hover:bg-[#2a3039] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Indicator Bar */}
        <div className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750] px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          {[
            { step: 1, label: "Campaign Info" },
            { step: 2, label: "Audience Target" },
            { step: 3, label: "Template & Personalization" },
            { step: 4, label: "Pacing & Dispatch" },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-2 text-[12px] font-bold transition-all duration-300 ${
                currentStep === item.step 
                  ? "text-[#0073bb] dark:text-[#3b99fc] scale-[1.02]" 
                  : currentStep > item.step 
                  ? "text-[#10B981]" 
                  : "text-[#879596]"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${
                  currentStep === item.step 
                    ? "bg-[#0073bb] text-white shadow-sm" 
                    : currentStep > item.step 
                    ? "bg-[#10B981] text-white" 
                    : "border border-[#879596] text-[#879596]"
                }`}>
                  {currentStep > item.step ? "✓" : item.step}
                </span>
                <span>{item.label}</span>
              </div>
              {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-[#aab7b8] shrink-0" />}
            </div>
          ))}
        </div>

        {/* Main Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 1: CAMPAIGN INFO */}
          {currentStep === 1 && (
            <div className="max-w-xl mx-auto space-y-5 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-[#eaeded] dark:border-[#414750] pb-3">
                <h3 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded]">Step 1: Campaign Details</h3>
                <p className="text-[12px] text-[#545b64] dark:text-[#879596] mt-1">
                  Name your broadcast campaign for tracking and delivery reporting.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8]">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Customer Notification / Product Release"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] p-2.5 rounded-sm text-[13px] text-[#16191f] dark:text-[#eaeded] outline-none focus:border-[#0073bb] transition-colors"
                  autoFocus
                />
              </div>

              <div className="bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/20 p-3.5 rounded-sm flex items-start gap-3 transition-all hover:bg-[#0073bb]/15">
                <ShieldCheck className="w-5 h-5 text-[#0073bb] dark:text-[#3b99fc] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#545b64] dark:text-[#aab7b8] space-y-1">
                  <p className="font-bold text-[#16191f] dark:text-[#eaeded]">Meta Cloud API Compliance</p>
                  <p>Messages are delivered via verified Meta Cloud endpoints with rate-limited queueing.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AUDIENCE TARGET (CRM vs MANUAL PHONE ENTRY WITH WORLDWIDE SUPPORT) */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Audience Mode Switch Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaeded] dark:border-[#414750] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceMode("crm")}
                    className={`px-4 py-2 text-xs font-bold rounded-sm transition flex items-center gap-2 cursor-pointer ${
                      audienceMode === "crm"
                        ? "bg-[#0073bb] text-white shadow-xs"
                        : "bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] text-[#545b64] dark:text-[#aab7b8] hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Select from CRM Contacts ({contacts.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceMode("manual")}
                    className={`px-4 py-2 text-xs font-bold rounded-sm transition flex items-center gap-2 cursor-pointer ${
                      audienceMode === "manual"
                        ? "bg-[#0073bb] text-white shadow-xs"
                        : "bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] text-[#545b64] dark:text-[#aab7b8] hover:text-white"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Manual Phone Numbers {parsedManualPhones.length > 0 && `(${parsedManualPhones.length})`}
                  </button>
                </div>

                {/* Worldwide Fallback Country Code Selector */}
                <div className="flex items-center gap-2 text-xs text-[#545b64] dark:text-[#aab7b8]">
                  <Globe className="w-3.5 h-3.5 text-[#0073bb]" />
                  <span>Default Country Code:</span>
                  <div className="flex items-center bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] rounded px-2 py-1">
                    <span className="font-mono text-xs text-[#879596] mr-0.5">+</span>
                    <input
                      type="text"
                      value={fallbackCountryCode}
                      onChange={(e) => setFallbackCountryCode(e.target.value.replace(/\D/g, ""))}
                      className="w-10 bg-transparent text-xs font-bold text-white outline-none font-mono"
                      title="Used only when a 10-digit number without country code is entered"
                    />
                  </div>
                </div>
              </div>

              {/* MODE 1: CRM Contacts Selector */}
              {audienceMode === "crm" && (
                <div className="space-y-3">
                  <AudienceSelector
                    contacts={contacts}
                    selectedContactIds={selectedContactIds}
                    onSelectionChange={setSelectedContactIds}
                    isLoading={loadingContacts}
                  />
                </div>
              )}

              {/* MODE 2: Manual Phone Numbers Box */}
              {audienceMode === "manual" && (
                <div className="max-w-2xl mx-auto space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-[#0073bb]" />
                        Enter International Phone Numbers
                      </span>
                      <span className="text-[11px] font-mono text-[#10B981] font-bold">
                        {parsedManualPhones.length} Verified Numbers
                      </span>
                    </label>

                    <textarea
                      rows={5}
                      placeholder="Enter numbers with country code or bare 10-digits:&#10;+14155552671 (USA)&#10;+447911123456 (UK)&#10;+971501234567 (UAE)&#10;9876543210 (Uses default +91)"
                      value={manualPhoneInput}
                      onChange={(e) => setManualPhoneInput(e.target.value)}
                      className="w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] p-3 rounded-sm text-[13px] font-mono text-[#16191f] dark:text-[#eaeded] outline-none focus:border-[#0073bb] transition-colors"
                      autoFocus
                    />
                    <p className="text-[11px] text-[#879596]">
                      Supports worldwide international numbers separated by comma, spaces, or line breaks.
                    </p>
                  </div>

                  {/* Clean Numbers Preview Chips */}
                  {parsedManualPhones.length > 0 && (
                    <div className="p-3 bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded-sm space-y-2">
                      <span className="text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] block">
                        Verified WhatsApp Delivery Numbers:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {parsedManualPhones.map((phone) => (
                          <span
                            key={phone}
                            className="px-2 py-0.5 rounded bg-[#0073bb]/15 border border-[#0073bb]/30 font-mono text-[11px] text-[#0073bb] dark:text-[#3b99fc] font-semibold"
                          >
                            +{phone}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TEMPLATE & PERSONALIZATION WITH LIVE SIMULATOR */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Left Column: Real Meta Templates */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2 bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0073bb]" /> Select Approved WhatsApp Template
                    </span>
                    {loadingTemplates && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0073bb]" />
                    )}
                  </label>

                  {loadingTemplates ? (
                    <div className="flex items-center gap-2.5 p-3 bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded text-xs text-[#879596] animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0073bb]" />
                      Loading approved templates from Meta WhatsApp Cloud API...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      No approved templates returned by Meta.
                    </div>
                  ) : (
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] p-2.5 rounded-sm text-[13px] text-[#16191f] dark:text-[#eaeded] outline-none focus:border-[#0073bb] transition-colors"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.category} - {t.language.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Header Media Upload */}
                {currentTemplate.requiresMedia && (
                  <div className="space-y-2 bg-white dark:bg-[#16191f] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750] shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#0073bb]" /> Broadcast Header Media *
                      </label>
                      {headerMediaUrl && (
                        <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 animate-in fade-in duration-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Media Ready
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 pt-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="campaignMediaInput"
                        onChange={handleMediaUpload} 
                        className="hidden" 
                      />
                      <label
                        htmlFor="campaignMediaInput"
                        className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] hover:border-[#0073bb] text-[#545b64] dark:text-[#eaeded] px-4 py-2 rounded-sm text-[12px] font-bold cursor-pointer transition-all active:scale-[0.98] flex items-center gap-2"
                      >
                        {isUploadingMedia ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#0073bb]" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                        {headerMediaUrl ? "Replace Image" : "Upload Banner Image"}
                      </label>
                      <span className="text-[11px] text-[#879596]">Max 5MB (JPG, PNG, WebP)</span>
                    </div>
                  </div>
                )}

                {/* Dynamic Variable Mapper (Allows typing custom values or selecting CRM fields) */}
                <VariableMapper
                  detectedVariables={currentTemplate.variables}
                  variableValues={variableValues}
                  onVariableChange={handleVariableChange}
                />
              </div>

              {/* Right Column: Real-Time WhatsApp Phone Simulator */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#aab7b8] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0073bb]" /> Real-Time Recipient Preview
                </p>
                <WhatsAppPhoneMockup
                  headerImageUrl={headerMediaUrl}
                  bodyText={simulatedBodyText}
                  footerText={currentTemplate.footer}
                  buttons={currentTemplate.buttons}
                />
              </div>
            </div>
          )}

          {/* STEP 4: PACING & LAUNCH REVIEW */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-[#eaeded] dark:border-[#414750] pb-3">
                <h3 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded]">Step 4: Smart Anti-Ban Pacing & Final Review</h3>
                <p className="text-[12px] text-[#545b64] dark:text-[#879596] mt-0.5">
                  Configure delivery frequency to ensure organic pacing and maximum WhatsApp deliverability.
                </p>
              </div>

              <div className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] p-4 rounded-sm space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0073bb]" />
                    Anti-Ban Pacing Speed
                  </label>
                  <span className="text-[13px] font-bold font-mono text-[#0073bb] dark:text-[#3b99fc] bg-white dark:bg-[#16191f] px-2.5 py-0.5 rounded border border-[#d5dbdb] dark:border-[#414750] transition-all">
                    {pacingSeconds} sec / message
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={pacingSeconds}
                  onChange={(e) => setPacingSeconds(Number(e.target.value))}
                  className="w-full accent-[#0073bb] cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-[#879596] font-medium">
                  <span>Fast (1s - High throughput)</span>
                  <span>Recommended (2s - Organic)</span>
                  <span>Safe (5s - Conservative)</span>
                </div>
              </div>

              {/* Summary Audit Card */}
              <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-sm p-4 divide-y divide-[#eaeded] dark:divide-[#414750] text-[12px] shadow-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#545b64] dark:text-[#aab7b8]">Campaign Name</span>
                  <span className="font-bold text-[#16191f] dark:text-[#eaeded]">{campaignName}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#545b64] dark:text-[#aab7b8]">Target Recipients</span>
                  <span className="font-bold text-[#10B981]">
                    {totalAudienceCount} Verified {audienceMode === "manual" ? "Manual Numbers" : "CRM Contacts"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#545b64] dark:text-[#aab7b8]">Template Name</span>
                  <span className="font-mono text-[11px] text-[#0073bb] dark:text-[#3b99fc]">{currentTemplate.name}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-[#545b64] dark:text-[#aab7b8]">Estimated Duration</span>
                  <span className="font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#e88a00]" /> ~{estimatedMinutes} Minutes
                  </span>
                </div>
              </div>

              <div className="bg-[#fff9e6] dark:bg-[#2b2111] border border-[#e88a00]/30 p-3 rounded-sm flex items-start gap-2.5 text-[11px] text-[#7a4f01] dark:text-[#ffd699]">
                <AlertTriangle className="w-4 h-4 text-[#e88a00] shrink-0 mt-0.5" />
                <span>Once launched, jobs are dispatched to Upstash QStash. You can safely close your browser; messages deliver in background.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-6 py-3.5 bg-[#fafafa] dark:bg-[#1c2128] border-t border-[#eaeded] dark:border-[#414750] flex justify-between items-center shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                disabled={isSubmitting}
                className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#414750] hover:bg-[#f2f3f3] text-[#16191f] dark:text-[#eaeded] px-4 py-1.5 rounded-sm text-[12px] font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-[#545b64] dark:text-[#aab7b8] hover:text-[#16191f] dark:hover:text-white text-[12px] font-bold px-3 py-1.5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={!canProceed()}
                className="bg-[#0073bb] hover:bg-[#005a93] disabled:opacity-40 text-white px-5 py-1.5 rounded-sm text-[12px] font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={isSubmitting || totalAudienceCount === 0}
                className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-white px-6 py-1.5 rounded-sm text-[12px] font-bold transition-all active:scale-[0.98] flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Dispatching to Queue...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Launch Broadcast Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
