"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  type ReactFlowInstance,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageSquare,
  Zap,
  List,
  Image as ImageIcon,
  Plus,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useChatbotStore } from "../../store/useChatbotStore";
import ButtonNode from "./nodes/ButtonNode";
import { TextNode, ListNode, MediaNode } from "./nodes/OtherNodes";
import PropertiesPanel from "./PropertiesPanel";
import type { WhatsAppNodeData } from "../../store/useChatbotStore";

// ─── Node type map ────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  textNode: TextNode,
  buttonNode: ButtonNode,
  listNode: ListNode,
  mediaNode: MediaNode,
};

// ─── Node palette config ──────────────────────────────────────────────────────

const NODE_PALETTE = [
  {
    type: "textNode",
    label: "Text Message",
    description: "Simple text reply",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "blue",
    defaultData: (): WhatsAppNodeData => ({
      type: "text",
      label: "Text Message",
      body: "Enter your message...",
      footer: "",
    }),
  },
  {
    type: "buttonNode",
    label: "Buttons",
    description: "Up to 3 reply buttons",
    icon: <Zap className="w-4 h-4" />,
    color: "green",
    defaultData: (): WhatsAppNodeData => ({
      type: "buttons",
      label: "Button Menu",
      body: "Choose an option:",
      footer: "",
      buttons: [{ id: `btn-${Date.now()}`, text: "Option 1" }],
    }),
  },
  {
    type: "listNode",
    label: "List Menu",
    description: "Scrollable list options",
    icon: <List className="w-4 h-4" />,
    color: "purple",
    defaultData: (): WhatsAppNodeData => ({
      type: "list",
      label: "List Menu",
      body: "Please select from the list:",
      footer: "",
      buttonText: "View Options",
      sections: [
        {
          id: `sec-${Date.now()}`,
          title: "Section 1",
          rows: [{ id: `row-${Date.now()}`, title: "Option 1", description: "" }],
        },
      ],
    }),
  },
  {
    type: "mediaNode",
    label: "Media",
    description: "Image, video or document",
    icon: <ImageIcon className="w-4 h-4" />,
    color: "amber",
    defaultData: (): WhatsAppNodeData => ({
      type: "media",
      label: "Media Message",
      mediaType: "image",
      mediaUrl: "",
      caption: "",
    }),
  },
];

const colorMap: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  green: "text-green-400 bg-green-500/20 border-green-500/30",
  purple: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  amber: "text-amber-400 bg-amber-500/20 border-amber-500/30",
};

// ─── Draggable Palette Item ───────────────────────────────────────────────────

const PaletteItem = ({
  item,
}: {
  item: (typeof NODE_PALETTE)[number];
}) => {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow-type", item.type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600 cursor-grab active:cursor-grabbing transition-all duration-150 group"
    >
      <div
        className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[item.color]}`}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
          {item.label}
        </p>
        <p className="text-[10px] text-slate-600 truncate">{item.description}</p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
    </div>
  );
};

// ─── Canvas (inner, uses useReactFlow) ───────────────────────────────────────

function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const nodes = useChatbotStore((s) => s.nodes);
  const edges = useChatbotStore((s) => s.edges);
  const onNodesChange = useChatbotStore((s) => s.onNodesChange);
  const onEdgesChange = useChatbotStore((s) => s.onEdgesChange);
  const onConnect = useChatbotStore((s) => s.onConnect);
  const addNode = useChatbotStore((s) => s.addNode);
  const setSelectedNodeId = useChatbotStore((s) => s.setSelectedNodeId);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow-type");
      if (!type || !rfInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const paletteItem = NODE_PALETTE.find((n) => n.type === type);
      if (!paletteItem) return;

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: paletteItem.defaultData(),
      };

      addNode(newNode as any);
      setMobileSidebarOpen(false);
    },
    [rfInstance, addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <div
          className={`
            h-full bg-slate-900 border-r border-slate-800 flex flex-col
            transition-all duration-300 flex-shrink-0
            ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}
          `}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Node Library
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {NODE_PALETTE.map((item) => (
              <PaletteItem key={item.type} item={item} />
            ))}
            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className="text-[9px] text-slate-600 text-center leading-relaxed">
                Drag nodes onto the canvas to build your flow
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar toggle button ── */}
      {!isMobile && (
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-slate-800 border border-slate-700 border-l-0 rounded-r-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all"
          style={{ left: sidebarOpen ? "224px" : "0px" }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      )}

      {/* ── Canvas ── */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 h-full"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes as any}
          edges={edges as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Delete"
          className="bg-slate-950"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#25d366", strokeWidth: 2 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1e293b"
          />
          <Controls
            className="!bg-slate-800 !border-slate-700 !rounded-xl !overflow-hidden"
            showInteractive={false}
          />
          {!isMobile && (
            <MiniMap
              className="!bg-slate-900 !border-slate-700 !rounded-xl"
              nodeColor="#25d366"
              maskColor="rgba(0,0,0,0.6)"
            />
          )}
        </ReactFlow>
      </div>

      {/* ── Desktop Properties Panel ── */}
      {!isMobile && <PropertiesPanel isMobile={false} />}

      {/* ── Mobile: FAB to open node library ── */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="absolute bottom-6 left-5 z-30 flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-green-500/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>

          {/* Mobile node library bottom sheet */}
          <>
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}
            <div
              className={`
                fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-3xl
                transition-transform duration-300 ease-out
                ${mobileSidebarOpen ? "translate-y-0" : "translate-y-full"}
              `}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-700" />
              </div>
              <div className="px-5 pt-2 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">Add a Node</h3>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
              <div className="px-5 pb-8 space-y-2">
                {NODE_PALETTE.map((item) => (
                  <button
                    key={item.type}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/60 active:bg-slate-700 transition-colors"
                    onClick={() => {
                      const center = rfInstance?.getViewport();
                      const position = rfInstance
                        ? rfInstance.screenToFlowPosition({
                            x: window.innerWidth / 2,
                            y: window.innerHeight / 2,
                          })
                        : { x: 200, y: 200 };

                      const newNode = {
                        id: `${item.type}-${Date.now()}`,
                        type: item.type,
                        position,
                        data: item.defaultData(),
                      };
                      addNode(newNode as any);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[item.color]}`}
                    >
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        </>
      )}

      {/* Mobile properties panel */}
      {isMobile && <PropertiesPanel isMobile={true} />}
    </div>
  );
}

// ─── Exported wrapper with ReactFlowProvider ──────────────────────────────────

export default function ChatbotCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
