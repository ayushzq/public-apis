"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  ExternalLink,
  Phone,
  CornerUpLeft,
  Trash2,
  Bot,
  Type,
  PanelBottom,
  Send,
  Loader2,
  ArrowLeft,
  X,
  Smartphone,
  HelpCircle,
  ListChecks,
  GripVertical,
  CheckCircle2
} from "lucide-react";

import {
  TemplateCategory,
  TemplateLanguage,
  HeaderFormat,
  ButtonType,
  CreateTemplatePayload,
} from "../../types/template.types";
import { validateTemplate, ValidationResult, extractVariableNumbers } from "../../lib/validators/template.validator";
import { FormState, ButtonDraft, uid, buildPayload } from "./formState";
import MediaUploader from "./MediaUploader";
import TemplatePreview from "./TemplatePreview";

const InputCls =
  "w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] text-[#16191f] dark:text-[#eaeded] text-[13px] rounded-sm px-3 py-2.5 placeholder-[#545b64] dark:placeholder-[#879596] focus:outline-none focus:border-[#0073bb] dark:focus:border-[#3b99fc] transition-all shadow-sm";

export default function CreateTemplateForm({
  onSave,
  onBack,
  initialData,
}: {
  onSave: (data: CreateTemplatePayload) => Promise<void>;
  onBack: () => void;
  initialData?: any;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [form, setForm] = useState<FormState>({
    name: initialData?.name || "",
    category: initialData?.category || TemplateCategory.MARKETING,
    language: initialData?.language || TemplateLanguage.ENGLISH_US,
    headerFormat: "NONE",
    headerText: "",
    headerMediaUrl: "",
    bodyText: "",
    footerText: "",
    buttons: [],
    bodyExamples: {},
  });

  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🔥 Split Pane Custom Width State (Adjustable Layout)
  const [leftWidth, setLeftWidth] = useState(55); // Default 55% width

  // ── Load initial data (edit mode) ──
  useEffect(() => {
    if (initialData?.components) {
      const newForm = { ...form };
      initialData.components.forEach((comp: any) => {
        if (comp.type === "HEADER") {
          newForm.headerFormat = comp.format || "NONE";
          if (comp.format === "TEXT") newForm.headerText = comp.text || "";
          if (comp.example?.header_handle?.[0]) newForm.headerMediaUrl = comp.example.header_handle[0];
        }
        if (comp.type === "BODY") {
          newForm.bodyText = comp.text || "";
          const savedExamples = comp.example?.body_text?.[0];
          if (savedExamples?.length) {
            const varNums = extractVariableNumbers(comp.text || "");
            const exampleMap: Record<number, string> = {};
            varNums.forEach((n, i) => { exampleMap[n] = savedExamples[i] || ""; });
            newForm.bodyExamples = exampleMap;
          }
        }
        if (comp.type === "FOOTER") newForm.footerText = comp.text || "";
        if (comp.type === "BUTTONS" && comp.buttons) {
          newForm.buttons = comp.buttons.map((btn: any) => ({
            id: uid(),
            type: btn.type,
            text: btn.text,
            url: btn.url,
            phone_number: btn.phone_number,
          }));
        }
      });
      setForm(newForm);
    }
  }, [initialData]);

  const variableNumbers = useMemo(() => extractVariableNumbers(form.bodyText), [form.bodyText]);
  const payload = useMemo(() => buildPayload(form, variableNumbers), [form, variableNumbers]);
  const validation = useMemo<ValidationResult>(() => validateTemplate(payload), [payload]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setExample = useCallback((varNum: number, value: string) => {
    setForm((prev) => ({ ...prev, bodyExamples: { ...prev.bodyExamples, [varNum]: value } }));
  }, []);

  const addButton = (type: ButtonDraft["type"]) => {
    const qr = form.buttons.filter((b) => b.type === ButtonType.QUICK_REPLY).length;
    const url = form.buttons.filter((b) => b.type === ButtonType.URL).length;
    const phone = form.buttons.filter((b) => b.type === ButtonType.PHONE_NUMBER).length;
    if (form.buttons.length >= 10) return;
    if (type === ButtonType.QUICK_REPLY && qr >= 3) return;
    if (type === ButtonType.URL && url >= 1) return;
    if (type === ButtonType.PHONE_NUMBER && phone >= 1) return;
    setForm((prev) => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        {
          id: uid(),
          type,
          text: "",
          url: type === ButtonType.URL ? "https://" : undefined,
          phone_number: type === ButtonType.PHONE_NUMBER ? "+" : undefined,
        },
      ],
    }));
  };

  const removeButton = (id: string) =>
    setForm((p) => ({ ...p, buttons: p.buttons.filter((b) => b.id !== id) }));
  const updateButton = (id: string, changes: Partial<ButtonDraft>) =>
    setForm((p) => ({ ...p, buttons: p.buttons.map((b) => (b.id === id ? { ...b, ...changes } : b)) }));

  const insertVariable = () => {
    const next = variableNumbers.length > 0 ? Math.max(...variableNumbers) + 1 : 1;
    setField("bodyText", form.bodyText + `{{${next}}}`);
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;
    setIsSubmitting(true);
    try {
      await onSave(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 Split Pane Drag Logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = startWidth + (delta / window.innerWidth) * 100;
      // Restrict between 30% and 75%
      setLeftWidth(Math.max(30, Math.min(75, newWidth)));
    };
    
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    };
    
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [leftWidth]);

  const bodyCharLimit = form.category === TemplateCategory.AUTHENTICATION ? 150 : 1024;
  const fieldError = (field: string) => validation.errors.find((e) => e.field === field)?.message;

  return (
    <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] text-[#16191f] dark:text-[#eaeded] font-sans flex flex-col">
      
      {/* ── AWS Style Header ── */}
      <header className="sticky top-0 z-40 bg-[#232f3e] dark:bg-[#16191f] border-b border-[#232f3e] dark:border-[#414750] px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-sm transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#aab7b8]" />
              {initialData ? "Edit Template" : "Template Builder"}
              <span className="text-[#aab7b8] text-[13px] font-normal hidden sm:inline">| Meta API</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Validation Tag */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold border uppercase tracking-wider ${
            validation.isValid
              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
              : "bg-[#d62728]/10 text-[#d62728] border-[#d62728]/30"
          }`}>
            {validation.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#d62728]" />}
            {validation.isValid ? "Verified" : `${validation.errors.length} Errors`}
          </div>

          <button
            onClick={() => setShowMobilePreview(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-sm text-[12px] font-bold text-white transition"
          >
            <Smartphone className="w-4 h-4" />
            Preview
          </button>

          <button
            onClick={handleSubmit}
            disabled={!validation.isValid || isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-[13px] font-bold transition-all shadow-sm ${
              validation.isValid && !isSubmitting
                ? "bg-[#0073bb] hover:bg-[#005a93] text-white"
                : "bg-[#414750] text-[#aab7b8] cursor-not-allowed border border-[#545b64]"
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isSubmitting ? "Saving..." : initialData ? "Update Payload" : "Submit to Meta"}
            </span>
            <span className="sm:hidden">{isSubmitting ? "..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout (Adjustable Split View) ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        
        {/* Left Side: Form Editor */}
        <div 
          className="flex flex-col overflow-y-auto custom-scrollbar px-4 lg:px-6 py-6 pb-20 w-full lg:w-auto"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${leftWidth}%` : '100%' }}
        >
          <div className="max-w-3xl mx-auto w-full space-y-5">
            
            {/* Identity */}
            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 shadow-sm">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#545b64] dark:text-[#aab7b8] mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Identification
              </h2>
              <div className="mb-4">
                <label className="flex justify-between text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5">
                  Template Name <span className="text-[#545b64] font-normal">{form.name.length}/512</span>
                </label>
                <input
                  className={InputCls}
                  placeholder="e.g. order_confirmation"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                />
                {fieldError("name") ? (
                  <p className="text-[#d62728] text-[11px] mt-1.5 font-bold">{fieldError("name")}</p>
                ) : (
                  <p className="text-[#545b64] dark:text-[#879596] text-[11px] mt-1.5">Lowercase, numbers, underscores only.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5 block">Category</label>
                  <select
                    className={InputCls}
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value as TemplateCategory)}
                  >
                    {Object.values(TemplateCategory).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5 block">Language (ISO)</label>
                  <select
                    className={InputCls}
                    value={form.language}
                    onChange={(e) => setField("language", e.target.value)}
                  >
                    {Object.entries(TemplateLanguage).map(([k, v]) => (
                      <option key={v} value={v}>{k.replace(/_/g, " ")} ({v})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 shadow-sm">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#545b64] dark:text-[#aab7b8] mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Header payload <span className="normal-case font-medium text-[#545b64] tracking-normal">(Optional)</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {(["NONE", ...Object.values(HeaderFormat)] as string[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setField("headerFormat", fmt as FormState["headerFormat"])}
                    className={`px-3 py-1.5 rounded-sm text-[12px] font-bold border transition-all flex items-center gap-1.5 ${
                      form.headerFormat === fmt
                        ? "bg-[#f0f8ff] border-[#0073bb] text-[#0073bb] dark:bg-[#0073bb]/20 dark:border-[#3b99fc] dark:text-[#3b99fc]"
                        : "bg-white dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#545b64] text-[#545b64] dark:text-[#aab7b8] hover:border-[#0073bb] dark:hover:border-[#3b99fc]"
                    }`}
                  >
                    {fmt === "NONE" ? "None" :
                     fmt === HeaderFormat.TEXT ? <><Type className="w-3.5 h-3.5" /> Text</> :
                     fmt === HeaderFormat.IMAGE ? <><ImageIcon className="w-3.5 h-3.5" /> Image</> :
                     fmt === HeaderFormat.VIDEO ? <><Video className="w-3.5 h-3.5" /> Video</> :
                     fmt === HeaderFormat.DOCUMENT ? <><FileText className="w-3.5 h-3.5" /> Document</> :
                     <><MapPin className="w-3.5 h-3.5" /> Location</>}
                  </button>
                ))}
              </div>
              {form.headerFormat === HeaderFormat.TEXT && (
                <div>
                  <label className="flex justify-between text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5">
                    Header Text <span className="text-[#545b64] font-normal">{form.headerText.length}/60</span>
                  </label>
                  <input
                    className={InputCls}
                    placeholder="Enter header text…"
                    value={form.headerText}
                    onChange={(e) => setField("headerText", e.target.value)}
                    maxLength={60}
                  />
                </div>
              )}
              {form.headerFormat !== "NONE" && form.headerFormat !== HeaderFormat.TEXT && (
                <MediaUploader
                  format={form.headerFormat as HeaderFormat}
                  onUpload={(url) => setField("headerMediaUrl", url)}
                  currentUrl={form.headerMediaUrl}
                />
              )}
            </div>

            {/* Body */}
            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 shadow-sm">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#545b64] dark:text-[#aab7b8] mb-3 flex items-center gap-2">
                <Type className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Main Body
              </h2>

              <div className="mb-4 bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/30 rounded-sm p-3 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc] flex-shrink-0 mt-0.5" />
                <div className="text-[11.5px] text-[#005a93] dark:text-[#aab7b8] leading-relaxed">
                  <span className="font-bold text-[#0073bb] dark:text-[#3b99fc]">Variables Rule:</span> Always use sequential variables like{" "}
                  <code className="bg-white dark:bg-[#16191f] px-1 py-0.5 rounded border border-[#0073bb]/20 font-mono">{"{{1}}"}</code>,{" "}
                  <code className="bg-white dark:bg-[#16191f] px-1 py-0.5 rounded border border-[#0073bb]/20 font-mono">{"{{2}}"}</code>. Do not skip numbers.
                </div>
              </div>

              <label className="flex justify-between text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5">
                Body Text{" "}
                <span className={`${form.bodyText.length > bodyCharLimit ? "text-[#d62728] font-bold" : "text-[#545b64]"} font-normal`}>
                  {form.bodyText.length}/{bodyCharLimit}
                </span>
              </label>
              <div className="relative">
                <textarea
                  className={`${InputCls} resize-none min-h-[120px]`}
                  placeholder="Hi {{1}}, your order is confirmed! 🎉"
                  value={form.bodyText}
                  onChange={(e) => setField("bodyText", e.target.value)}
                />
                <button
                  onClick={insertVariable}
                  className="absolute right-2 bottom-3 px-2.5 py-1 text-[11px] font-bold bg-[#16191f] text-white dark:bg-white dark:text-[#16191f] rounded-sm hover:opacity-80 transition shadow-sm"
                >
                  Insert {"{{"}{variableNumbers.length + 1}{"}}"}
                </button>
              </div>
              {fieldError("components.BODY") && (
                <p className="text-[#d62728] text-[11px] mt-1.5 font-bold">{fieldError("components.BODY")}</p>
              )}

              {/* 🔥 Meta Variables Sample Box */}
              {variableNumbers.length > 0 && (
                <div className="mt-4 bg-[#fff8e6] dark:bg-[#ff9900]/10 border border-[#ff9900]/30 rounded-sm p-4">
                  <h3 className="text-[12px] font-bold text-[#e88a00] dark:text-[#ffb347] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4" /> Sample Values for Meta Verification
                  </h3>
                  <p className="text-[11px] text-[#e88a00]/80 dark:text-[#ffb347]/80 mb-3">
                    Provide realistic examples for each variable. Meta reviewers use this to approve your template.
                  </p>
                  <div className="space-y-3">
                    {variableNumbers.map((n) => (
                      <div key={n} className="flex items-center gap-2.5">
                        <span className="text-[13px] font-mono font-bold text-[#e88a00] dark:text-[#ffb347] bg-white dark:bg-[#16191f] border border-[#ff9900]/30 px-2 py-1.5 rounded-sm min-w-[46px] text-center shadow-sm">
                          {`{{${n}}}`}
                        </span>
                        <input
                          className={InputCls}
                          placeholder={`Example: ${n === 1 ? "Rahul Sharma" : n === 2 ? "₹1,499" : "Value here"}`}
                          value={form.bodyExamples[n] || ""}
                          onChange={(e) => setExample(n, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  {fieldError("components.BODY.example") && (
                    <p className="text-[#d62728] text-[11px] mt-2.5 font-bold">{fieldError("components.BODY.example")}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 shadow-sm">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#545b64] dark:text-[#aab7b8] mb-4 flex items-center gap-2">
                <PanelBottom className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Footer <span className="normal-case font-medium text-[#545b64] tracking-normal">(Optional)</span>
              </h2>
              <label className="flex justify-between text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1.5">
                Footer Text <span className="text-[#545b64] font-normal">{form.footerText.length}/60</span>
              </label>
              <input
                className={InputCls}
                placeholder="e.g. Reply STOP to unsubscribe"
                value={form.footerText}
                onChange={(e) => setField("footerText", e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Buttons */}
            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg p-5 shadow-sm">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#545b64] dark:text-[#aab7b8] mb-4 flex items-center gap-2">
                <CornerUpLeft className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Interactive Buttons
              </h2>
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => addButton(ButtonType.QUICK_REPLY)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#aab7b8] dark:border-[#545b64] rounded-sm text-[12px] font-bold text-[#545b64] dark:text-[#eaeded] hover:bg-[#fafafa] dark:hover:bg-[#2a3039] hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-all">
                  <CornerUpLeft className="w-3.5 h-3.5" /> Quick Reply
                </button>
                <button onClick={() => addButton(ButtonType.URL)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#aab7b8] dark:border-[#545b64] rounded-sm text-[12px] font-bold text-[#545b64] dark:text-[#eaeded] hover:bg-[#fafafa] dark:hover:bg-[#2a3039] hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Web URL
                </button>
                <button onClick={() => addButton(ButtonType.PHONE_NUMBER)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#aab7b8] dark:border-[#545b64] rounded-sm text-[12px] font-bold text-[#545b64] dark:text-[#eaeded] hover:bg-[#fafafa] dark:hover:bg-[#2a3039] hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-all">
                  <Phone className="w-3.5 h-3.5" /> Phone Call
                </button>
              </div>
              
              <div className="space-y-3">
                {form.buttons.map((btn, idx) => (
                  <div key={btn.id} className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded-lg p-4 relative">
                    <button onClick={() => removeButton(btn.id)} className="absolute top-3 right-3 text-[#545b64] hover:text-[#d62728] transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] font-extrabold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      {btn.type === ButtonType.QUICK_REPLY ? <><CornerUpLeft className="w-3.5 h-3.5" /> Quick Reply</> :
                       btn.type === ButtonType.URL ? <><ExternalLink className="w-3.5 h-3.5" /> URL Link</> :
                       <><Phone className="w-3.5 h-3.5" /> Phone Action</>} #{idx + 1}
                    </p>
                    <div className="mb-3">
                      <label className="text-[11px] font-bold text-[#16191f] dark:text-[#eaeded] block mb-1">
                        Button Label <span className="text-[#545b64] font-normal">({btn.text.length}/25)</span>
                      </label>
                      <input className={InputCls} placeholder="Label text" value={btn.text} onChange={(e) => updateButton(btn.id, { text: e.target.value })} maxLength={25} />
                    </div>
                    {btn.type === ButtonType.URL && (
                      <div>
                        <label className="text-[11px] font-bold text-[#16191f] dark:text-[#eaeded] block mb-1">Destination URL</label>
                        <input className={InputCls} value={btn.url} onChange={(e) => updateButton(btn.id, { url: e.target.value })} />
                      </div>
                    )}
                    {btn.type === ButtonType.PHONE_NUMBER && (
                      <div>
                        <label className="text-[11px] font-bold text-[#16191f] dark:text-[#eaeded] block mb-1">Phone (International Format)</label>
                        <input className={InputCls} value={btn.phone_number} onChange={(e) => updateButton(btn.id, { phone_number: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Custom Splitter (Drag to Resize) */}
        <div 
          className="hidden lg:flex w-2 cursor-col-resize hover:bg-[#0073bb] active:bg-[#005a93] transition-colors z-20 items-center justify-center flex-col shadow-inner"
          onMouseDown={startResizing}
        >
           <GripVertical className="w-3 h-3 text-[#aab7b8] opacity-50" />
        </div>

        {/* Right Side: Preview Panel */}
        <aside 
          className="hidden lg:flex flex-col border-l border-[#eaeded] dark:border-[#414750] bg-white dark:bg-[#16191f] shadow-[-4px_0_15px_rgba(0,0,0,0.02)] z-10"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `calc(${100 - leftWidth}% - 8px)` : '100%' }}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] uppercase tracking-wider">Device Preview</h2>
              <span className="flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-bold px-2 py-1 rounded-sm uppercase">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" /> WhatsApp UI
              </span>
            </div>
            
            {/* The actual WhatsApp Preview component */}
            <div className="flex justify-center">
               <TemplatePreview form={form} />
            </div>

            <div className="mt-8 bg-[#fafafa] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] rounded-sm p-4">
              <h3 className="text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-widest mb-3">Payload Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[#545b64] font-bold uppercase">Target Name</p>
                  <p className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] truncate">{form.name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#545b64] font-bold uppercase">Locale</p>
                  <p className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">{form.language}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#545b64] font-bold uppercase">Class</p>
                  <p className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">{form.category}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#545b64] font-bold uppercase">Actions</p>
                  <p className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">{form.buttons.length}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Mobile Preview Bottom Sheet ── */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col">
          <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={() => setShowMobilePreview(false)} />
          <div className="bg-[#f2f3f3] dark:bg-[#16191f] rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-[#d5dbdb] dark:bg-[#414750] rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#eaeded] dark:border-[#414750]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" />
                <span className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded]">Live Preview</span>
              </div>
              <button onClick={() => setShowMobilePreview(false)} className="p-2 hover:bg-[#eaeded] dark:hover:bg-[#2a3039] rounded-sm transition">
                <X className="w-5 h-5 text-[#545b64] dark:text-[#aab7b8]" />
              </button>
            </div>
            <div className="flex flex-col items-center py-6 px-4">
              <TemplatePreview form={form} />
              <button onClick={() => setShowMobilePreview(false)} className="mt-6 w-full max-w-[300px] py-3 bg-[#16191f] dark:bg-white text-white dark:text-[#16191f] rounded-sm text-[13px] font-bold shadow-md transition">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
