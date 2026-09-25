"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  X,
  Trash2,
  Copy,
  Plus,
  GripVertical,
  ChevronDown,
  Upload,
  CloudUpload,
  MessageSquare,
  Zap,
  List,
  Image as ImageIcon,
} from "lucide-react";
import { useChatbotStore } from "@/store/useChatbotStore";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import type {
  TextNodeData,
  ButtonNodeData,
  ListNodeData,
  MediaNodeData,
  WhatsAppNodeData,
} from "@/store/useChatbotStore";

interface PropertiesPanelProps {
  isMobile?: boolean;
}

// ─── Reusable form parts ──────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
    {children}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2
      text-sm text-slate-200 placeholder-slate-600
      focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30
      transition-all duration-150
      ${props.className ?? ""}
    `}
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    rows={3}
    {...props}
    className={`
      w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2
      text-sm text-slate-200 placeholder-slate-600 resize-none
      focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30
      transition-all duration-150
      ${props.className ?? ""}
    `}
  />
);

const SectionTitle = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-6 h-6 rounded-md bg-slate-700 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
      {children}
    </h3>
  </div>
);

// ─── Text Node Editor ─────────────────────────────────────────────────────────

const TextEditor = ({
  id,
  data,
}: {
  id: string;
  data: TextNodeData;
}) => {
  const updateNodeData = useChatbotStore((s) => s.updateNodeData);

  return (
    <div className="space-y-4">
      <SectionTitle icon={<MessageSquare className="w-3.5 h-3.5 text-blue-400" />}>
        Text Message
      </SectionTitle>

      <div>
        <Label>Node Label</Label>
        <Input
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="e.g. Welcome Message"
        />
      </div>

      <div>
        <Label>Message Body</Label>
        <Textarea
          value={data.body}
          onChange={(e) => updateNodeData(id, { body: e.target.value })}
          placeholder="Type your message here..."
          rows={4}
        />
        <p className="text-[10px] text-slate-600 mt-1">{data.body?.length ?? 0} / 4096 chars</p>
      </div>

      <div>
        <Label>Footer (optional)</Label>
        <Input
          value={data.footer ?? ""}
          onChange={(e) => updateNodeData(id, { footer: e.target.value })}
          placeholder="e.g. Powered by BaseKey"
        />
      </div>
    </div>
  );
};

// ─── Button Node Editor ───────────────────────────────────────────────────────

const ButtonEditor = ({
  id,
  data,
}: {
  id: string;
  data: ButtonNodeData;
}) => {
  const updateNodeData = useChatbotStore((s) => s.updateNodeData);

  const updateButton = useCallback(
    (btnId: string, text: string) => {
      const updated = data.buttons.map((b) =>
        b.id === btnId ? { ...b, text } : b
      );
      updateNodeData(id, { buttons: updated });
    },
    [data.buttons, id, updateNodeData]
  );

  const addButton = useCallback(() => {
    if (data.buttons.length >= 3) return;
    const updated = [
      ...data.buttons,
      { id: `btn-${Date.now()}`, text: `Button ${data.buttons.length + 1}` },
    ];
    updateNodeData(id, { buttons: updated });
  }, [data.buttons, id, updateNodeData]);

  const removeButton = useCallback(
    (btnId: string) => {
      updateNodeData(id, {
        buttons: data.buttons.filter((b) => b.id !== btnId),
      });
    },
    [data.buttons, id, updateNodeData]
  );

  return (
    <div className="space-y-4">
      <SectionTitle icon={<Zap className="w-3.5 h-3.5 text-green-400" />}>
        Interactive Buttons
      </SectionTitle>

      <div>
        <Label>Node Label</Label>
        <Input
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="e.g. Main Menu"
        />
      </div>

      <div>
        <Label>Message Body</Label>
        <Textarea
          value={data.body}
          onChange={(e) => updateNodeData(id, { body: e.target.value })}
          placeholder="Message shown above buttons..."
          rows={3}
        />
      </div>

      <div>
        <Label>Footer (optional)</Label>
        <Input
          value={data.footer ?? ""}
          onChange={(e) => updateNodeData(id, { footer: e.target.value })}
          placeholder="e.g. Reply with a button"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Buttons ({data.buttons.length}/3)</Label>
          {data.buttons.length < 3 && (
            <button
              onClick={addButton}
              className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Button
            </button>
          )}
        </div>

        <div className="space-y-2">
          {data.buttons.map((btn, idx) => (
            <div key={btn.id} className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <div className="flex-1 relative">
                <Input
                  value={btn.text}
                  onChange={(e) => updateButton(btn.id, e.target.value)}
                  placeholder={`Button ${idx + 1} text`}
                  maxLength={20}
                />
              </div>
              <button
                onClick={() => removeButton(btn.id)}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {data.buttons.length === 0 && (
            <div className="text-center py-4 border border-dashed border-slate-700 rounded-lg">
              <p className="text-xs text-slate-600">No buttons yet. Add up to 3.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── List Node Editor ─────────────────────────────────────────────────────────

const ListEditor = ({
  id,
  data,
}: {
  id: string;
  data: ListNodeData;
}) => {
  const updateNodeData = useChatbotStore((s) => s.updateNodeData);

  const addSection = () => {
    const sections = [
      ...(data.sections || []),
      {
        id: `sec-${Date.now()}`,
        title: `Section ${(data.sections?.length ?? 0) + 1}`,
        rows: [],
      },
    ];
    updateNodeData(id, { sections });
  };

  const updateSectionTitle = (secId: string, title: string) => {
    const sections = (data.sections || []).map((s) =>
      s.id === secId ? { ...s, title } : s
    );
    updateNodeData(id, { sections });
  };

  const addRow = (secId: string) => {
    const sections = (data.sections || []).map((s) =>
      s.id === secId
        ? {
            ...s,
            rows: [
              ...s.rows,
              {
                id: `row-${Date.now()}`,
                title: `Option ${s.rows.length + 1}`,
                description: "",
              },
            ],
          }
        : s
    );
    updateNodeData(id, { sections });
  };

  const updateRow = (
    secId: string,
    rowId: string,
    field: "title" | "description",
    value: string
  ) => {
    const sections = (data.sections || []).map((s) =>
      s.id === secId
        ? {
            ...s,
            rows: s.rows.map((r) =>
              r.id === rowId ? { ...r, [field]: value } : r
            ),
          }
        : s
    );
    updateNodeData(id, { sections });
  };

  const removeRow = (secId: string, rowId: string) => {
    const sections = (data.sections || []).map((s) =>
      s.id === secId ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) } : s
    );
    updateNodeData(id, { sections });
  };

  const removeSection = (secId: string) => {
    updateNodeData(id, {
      sections: (data.sections || []).filter((s) => s.id !== secId),
    });
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={<List className="w-3.5 h-3.5 text-purple-400" />}>
        List Message
      </SectionTitle>

      <div>
        <Label>Node Label</Label>
        <Input
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="e.g. Product Menu"
        />
      </div>

      <div>
        <Label>Message Body</Label>
        <Textarea
          value={data.body}
          onChange={(e) => updateNodeData(id, { body: e.target.value })}
          placeholder="Describe the list options..."
        />
      </div>

      <div>
        <Label>List Button Text</Label>
        <Input
          value={data.buttonText ?? ""}
          onChange={(e) => updateNodeData(id, { buttonText: e.target.value })}
          placeholder="e.g. View Options"
          maxLength={20}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Sections</Label>
          <button
            onClick={addSection}
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>

        <div className="space-y-3">
          {(data.sections || []).map((section) => (
            <div
              key={section.id}
              className="border border-slate-700 rounded-xl p-3 bg-slate-800/40"
            >
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  placeholder="Section title"
                  className="flex-1 text-xs"
                />
                <button
                  onClick={() => removeSection(section.id)}
                  className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 mb-2">
                {section.rows.map((row) => (
                  <div key={row.id} className="bg-slate-900/50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.title}
                        onChange={(e) =>
                          updateRow(section.id, row.id, "title", e.target.value)
                        }
                        placeholder="Row title"
                        className="text-xs"
                      />
                      <button
                        onClick={() => removeRow(section.id, row.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <Input
                      value={row.description ?? ""}
                      onChange={(e) =>
                        updateRow(section.id, row.id, "description", e.target.value)
                      }
                      placeholder="Description (optional)"
                      className="text-xs mt-1"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => addRow(section.id)}
                className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-purple-400 border border-dashed border-slate-700 hover:border-purple-500/40 rounded-lg py-1.5 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          ))}
          {(!data.sections || data.sections.length === 0) && (
            <div className="text-center py-4 border border-dashed border-slate-700 rounded-lg">
              <p className="text-xs text-slate-600">No sections yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Media Node Editor ────────────────────────────────────────────────────────

const MediaEditor = ({
  id,
  data,
}: {
  id: string;
  data: MediaNodeData;
}) => {
  const updateNodeData = useChatbotStore((s) => s.updateNodeData);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 🔧 Fix (BaseKey audit): this was a dead "TODO: Connect Cloudinary
  // Upload Widget" button. /api/upload (Cloudinary) already existed and is
  // used elsewhere (templates, chat) — this just wires the same route in.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "resource_type",
        data.mediaType === "video" ? "video" : data.mediaType === "document" ? "raw" : "auto"
      );
      formData.append("folder", "chatbot-flow-media");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const uploaded = await res.json();
      updateNodeData(id, { mediaUrl: uploaded.url });
    } catch (error) {
      console.error("Flow media upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={<ImageIcon className="w-3.5 h-3.5 text-amber-400" />}>
        Media Message
      </SectionTitle>

      <div>
        <Label>Node Label</Label>
        <Input
          value={data.label}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="e.g. Product Image"
        />
      </div>

      <div>
        <Label>Media Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["image", "video", "document"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateNodeData(id, { mediaType: t })}
              className={`
                py-2 rounded-lg text-[11px] font-semibold capitalize border transition-all
                ${
                  data.mediaType === t
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Media URL</Label>
        <Input
          value={data.mediaUrl ?? ""}
          onChange={(e) => updateNodeData(id, { mediaUrl: e.target.value })}
          placeholder="https://example.com/media.jpg"
        />
      </div>

      {/* Cloudinary Upload */}
      <div>
        <Label>Upload via Cloudinary</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept={data.mediaType === "video" ? "video/*" : data.mediaType === "document" ? "*" : "image/*"}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-dashed border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/5 rounded-xl py-4 transition-all duration-200 group disabled:opacity-60"
        >
          {isUploading ? (
            <ClipLoader size={16} color="#fbbf24" />
          ) : (
            <CloudUpload className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          )}
          <div className="text-left">
            <p className="text-xs font-semibold text-amber-400">
              {isUploading ? "Uploading..." : "Upload Media"}
            </p>
            <p className="text-[10px] text-slate-500">Click to upload via Cloudinary</p>
          </div>
        </button>
      </div>

      <div>
        <Label>Caption (optional)</Label>
        <Textarea
          value={data.caption ?? ""}
          onChange={(e) => updateNodeData(id, { caption: e.target.value })}
          placeholder="Caption for your media..."
          rows={2}
        />
      </div>

      {data.mediaType === "document" && (
        <div>
          <Label>Filename</Label>
          <Input
            value={data.filename ?? ""}
            onChange={(e) => updateNodeData(id, { filename: e.target.value })}
            placeholder="e.g. invoice.pdf"
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Properties Panel ────────────────────────────────────────────────────

export default function PropertiesPanel({ isMobile = false }: PropertiesPanelProps) {
  const selectedNodeId = useChatbotStore((s) => s.selectedNodeId);
  const isMobilePanelOpen = useChatbotStore((s) => s.isMobilePanelOpen);
  const setMobilePanelOpen = useChatbotStore((s) => s.setMobilePanelOpen);
  const setSelectedNodeId = useChatbotStore((s) => s.setSelectedNodeId);
  const getSelectedNode = useChatbotStore((s) => s.getSelectedNode);
  const deleteNode = useChatbotStore((s) => s.deleteNode);
  const duplicateNode = useChatbotStore((s) => s.duplicateNode);

  const node = getSelectedNode();

  const handleClose = () => {
    setMobilePanelOpen(false);
    setSelectedNodeId(null);
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    if (confirm("Delete this node?")) deleteNode(selectedNodeId);
  };

  const handleDuplicate = () => {
    if (!selectedNodeId) return;
    duplicateNode(selectedNodeId);
    handleClose();
  };

  const renderEditor = () => {
    if (!node) return null;
    const { id, data } = node;
    switch (data.type) {
      case "text":
        return <TextEditor id={id} data={data as TextNodeData} />;
      case "buttons":
        return <ButtonEditor id={id} data={data as ButtonNodeData} />;
      case "list":
        return <ListEditor id={id} data={data as ListNodeData} />;
      case "media":
        return <MediaEditor id={id} data={data as MediaNodeData} />;
      default:
        return <p className="text-xs text-slate-500">Unknown node type.</p>;
    }
  };

  // Desktop panel
  if (!isMobile) {
    if (!node) {
      return (
        <div className="w-72 h-full bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Click a node on the canvas to edit its properties
          </p>
        </div>
      );
    }

    return (
      <div className="w-72 h-full bg-slate-900 border-l border-slate-800 flex flex-col">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Properties
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDuplicate}
              title="Duplicate"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              title="Delete"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {renderEditor()}
        </div>
      </div>
    );
  }

  // Mobile bottom sheet
  return (
    <>
      {/* Backdrop */}
      {isMobilePanelOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700
          rounded-t-3xl transition-transform duration-300 ease-out
          ${isMobilePanelOpen ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ maxHeight: "80vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200">
            {node ? "Edit Node" : "Properties"}
          </h2>
          <div className="flex items-center gap-2">
            {node && (
              <>
                <button
                  onClick={handleDuplicate}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(80vh - 90px)" }}>
          {node ? (
            renderEditor()
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              Select a node to edit
            </p>
          )}
        </div>
      </div>
    </>
  );
}
