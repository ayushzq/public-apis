import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

// ─── Node Data Types ──────────────────────────────────────────────────────────

export interface TextNodeData {
  type: "text";
  label: string;
  body: string;
  footer?: string;
}

export interface ButtonNodeData {
  type: "buttons";
  label: string;
  body: string;
  footer?: string;
  buttons: Array<{ id: string; text: string }>;
}

export interface ListNodeData {
  type: "list";
  label: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    id: string;
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface MediaNodeData {
  type: "media";
  label: string;
  mediaType: "image" | "video" | "document";
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

export type WhatsAppNodeData =
  | TextNodeData
  | ButtonNodeData
  | ListNodeData
  | MediaNodeData;

export type WhatsAppNode = Node<WhatsAppNodeData & Record<string, unknown>>;

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface ChatbotStore {
  nodes: WhatsAppNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  isMobilePanelOpen: boolean;

  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Node CRUD
  addNode: (node: WhatsAppNode) => void;
  updateNodeData: (id: string, data: Partial<WhatsAppNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  // Selection
  setSelectedNodeId: (id: string | null) => void;
  getSelectedNode: () => WhatsAppNode | null;

  // Mobile panel
  setMobilePanelOpen: (open: boolean) => void;

  // Export
  exportFlowAsJSON: () => object;

  // Reset
  resetFlow: () => void;

  // Load a previously saved flow (e.g. from Postgres via GET /api/flows)
  loadFlow: (nodes: WhatsAppNode[], edges: Edge[]) => void;
}

// ─── Default Nodes ────────────────────────────────────────────────────────────

const initialNodes: WhatsAppNode[] = [
  {
    id: "start-1",
    type: "textNode",
    position: { x: 200, y: 120 },
    data: {
      type: "text",
      label: "Welcome Message",
      body: "👋 Hello! Welcome to BaseKey. How can I help you today?",
      footer: "Powered by BaseKey",
    },
  },
  {
    id: "buttons-1",
    type: "buttonNode",
    position: { x: 550, y: 80 },
    data: {
      type: "buttons",
      label: "Main Menu",
      body: "Please choose an option below:",
      footer: "",
      buttons: [
        { id: "btn-1", text: "📦 View Products" },
        { id: "btn-2", text: "🛠️ Support" },
        { id: "btn-3", text: "📞 Contact Us" },
      ],
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-start-1",
    source: "start-1",
    target: "buttons-1",
    animated: true,
    style: { stroke: "#25d366", strokeWidth: 2 },
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChatbotStore = create<ChatbotStore>()(
  immer((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    isMobilePanelOpen: false,

    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes) as WhatsAppNode[];
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: (connection) => {
      set((state) => {
        state.edges = addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#25d366", strokeWidth: 2 },
          },
          state.edges
        );
      });
    },

    addNode: (node) => {
      set((state) => {
        state.nodes.push(node);
      });
    },

    updateNodeData: (id, data) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
          Object.assign(node.data, data);
        }
      });
    },

    deleteNode: (id) => {
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== id);
        state.edges = state.edges.filter(
          (e) => e.source !== id && e.target !== id
        );
        if (state.selectedNodeId === id) {
          state.selectedNodeId = null;
          state.isMobilePanelOpen = false;
        }
      });
    },

    duplicateNode: (id) => {
      const node = get().nodes.find((n) => n.id === id);
      if (!node) return;
      const newNode: WhatsAppNode = {
        ...node,
        id: `${node.type}-${Date.now()}`,
        position: {
          x: node.position.x + 40,
          y: node.position.y + 40,
        },
        data: JSON.parse(JSON.stringify(node.data)),
        selected: false,
      };
      set((state) => {
        state.nodes.push(newNode);
      });
    },

    setSelectedNodeId: (id) => {
      set((state) => {
        state.selectedNodeId = id;
        if (id !== null) {
          state.isMobilePanelOpen = true;
        }
      });
    },

    getSelectedNode: () => {
      const { nodes, selectedNodeId } = get();
      return nodes.find((n) => n.id === selectedNodeId) ?? null;
    },

    setMobilePanelOpen: (open) => {
      set((state) => {
        state.isMobilePanelOpen = open;
        if (!open) state.selectedNodeId = null;
      });
    },

    exportFlowAsJSON: () => {
      const { nodes, edges } = get();
      return {
        version: "1.0.0",
        platform: "basekey",
        exportedAt: new Date().toISOString(),
        nodes: nodes.map(({ id, type, position, data }) => ({
          id,
          type,
          position,
          data,
        })),
        edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
          id,
          source,
          target,
          sourceHandle: sourceHandle ?? null,
          targetHandle: targetHandle ?? null,
        })),
      };
    },

    resetFlow: () => {
      set((state) => {
        state.nodes = initialNodes;
        state.edges = initialEdges;
        state.selectedNodeId = null;
        state.isMobilePanelOpen = false;
      });
    },

    loadFlow: (nodes, edges) => {
      set((state) => {
        // Fall back to the defaults if the saved flow is empty (fresh install)
        state.nodes = nodes && nodes.length > 0 ? nodes : initialNodes;
        state.edges = edges && edges.length > 0 ? edges : initialEdges;
        state.selectedNodeId = null;
        state.isMobilePanelOpen = false;
      });
    },
  }))
);
