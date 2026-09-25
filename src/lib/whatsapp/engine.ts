// lib/whatsapp/engine.ts
//
// 🔧 P0 FIX (BaseKey Audit): this engine used to read/write flow state from
// Firebase Realtime Database, while the Flow Builder saves via Prisma to
// Postgres (see app/api/flows/save/route.ts) — two different databases that
// could never talk to each other, and firebase-admin was never even
// initialized, so every call threw (silently swallowed by the webhook's
// try/catch). This version reads the flow via Prisma's `ChatFlow` table and
// tracks the conversation cursor on the `Contact.activeFlowNodeId` column
// that already existed in the schema but was unused. No Firebase anywhere.
import { db } from "@/prisma/lib/db";
import type { WhatsAppNode, WhatsAppNodeData } from "@/store/useChatbotStore";
import type { Edge } from "@xyflow/react";
import { sendWhatsAppMessage } from "./sender";

interface FlowGraph {
  nodes: WhatsAppNode[];
  edges: Edge[];
}

interface IncomingSignal {
  type: "text" | "button_reply" | "list_reply" | "start";
  value: string; // text body, OR button/list reply id
}

// ─── 1. Load the active flow from Postgres via Prisma ───
// Bug fix (BaseKey audit — P0, cross-tenant leak): this used to load a
// single hardcoded `id: "main_flow"` row — every workspace's chatbot ran
// off the exact same shared flow. Resolves the caller's own organization
// via its WhatsApp phoneId (unique per workspace) and loads that org's own
// `ChatFlow` row instead (`ChatFlow.organizationId` is also unique).
async function getActiveFlow(phoneId: string): Promise<FlowGraph | null> {
  const settings = await db.systemSettings.findUnique({ where: { phoneNumberId: phoneId } });
  if (!settings?.organizationId) return null;

  const flow = await db.chatFlow.findUnique({ where: { organizationId: settings.organizationId } });
  if (!flow || !flow.isActive) return null;

  return {
    nodes: (flow.nodes as unknown as WhatsAppNode[]) || [],
    edges: (flow.edges as unknown as Edge[]) || [],
  };
}

// ─── 2. Find the entry node: the one node nobody points TO ───
function findEntryNode(graph: FlowGraph): WhatsAppNode | null {
  const targets = new Set(graph.edges.map((e) => e.target));
  return graph.nodes.find((n) => !targets.has(n.id)) ?? graph.nodes[0] ?? null;
}

// ─── 3. Given current node + signal, find which edge to follow ───
function resolveNextEdge(node: WhatsAppNode, signal: IncomingSignal, graph: FlowGraph): Edge | null {
  const outgoing = graph.edges.filter((e) => e.source === node.id);
  if (outgoing.length === 0) return null;

  if (node.data.type === "buttons" && signal.type === "button_reply") {
    const handleId = `btn-${signal.value}`;
    return outgoing.find((e) => e.sourceHandle === handleId) ?? outgoing.find((e) => e.sourceHandle === "default") ?? outgoing[0];
  }

  if (node.data.type === "list" && signal.type === "list_reply") {
    const handleId = `row-${signal.value}`;
    return outgoing.find((e) => e.sourceHandle === handleId) ?? outgoing.find((e) => e.sourceHandle === "default") ?? outgoing[0];
  }

  // Plain text/media nodes just fall through
  return outgoing.find((e) => e.sourceHandle === "default") ?? outgoing[0];
}

// ─── 4. Render + send a node's content via Meta API, return true if PAUSES ───
async function renderNode(node: WhatsAppNode, phoneId: string, to: string): Promise<boolean> {
  const data = node.data as WhatsAppNodeData;

  switch (data.type) {
    case "text":
      await sendWhatsAppMessage(phoneId, to, { type: "text", text: { body: data.body } });
      return false; // auto-continue to next node

    case "media":
      await sendWhatsAppMessage(phoneId, to, {
        type: data.mediaType,
        [data.mediaType]: { link: data.mediaUrl, caption: data.caption },
      });
      return false;

    case "buttons":
      await sendWhatsAppMessage(phoneId, to, {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: data.body },
          footer: data.footer ? { text: data.footer } : undefined,
          action: {
            buttons: data.buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.text.slice(0, 20) }, // Meta caps button titles at 20 chars
            })),
          },
        },
      });
      return true; // PAUSE — waiting for user tap

    case "list":
      await sendWhatsAppMessage(phoneId, to, {
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: data.body },
          action: {
            button: data.buttonText,
            sections: data.sections.map((s) => ({
              title: s.title,
              rows: s.rows.map((r) => ({ id: r.id, title: r.title, description: r.description })),
            })),
          },
        },
      });
      return true; // PAUSE — waiting for user selection
  }
}

// ─── 5. THE ENGINE — call this from the webhook ───
// `contactId` is the Prisma Contact.id (the webhook already upserts the
// Contact before calling this, so it has it on hand).
export async function runFlowEngine(phoneId: string, contactId: string, from: string, signal: IncomingSignal) {
  const graph = await getActiveFlow(phoneId);
  if (!graph) return; // no published/active flow — do nothing

  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.isBotPaused) return; // agent has taken over — don't interrupt

  let currentNode: WhatsAppNode | null = null;

  if (!contact.activeFlowNodeId) {
    // Fresh conversation — start at entry node
    currentNode = findEntryNode(graph);
  } else {
    // Resume from where the user left off
    const cursor = graph.nodes.find((n) => n.id === contact.activeFlowNodeId) ?? null;
    if (cursor) {
      const edge = resolveNextEdge(cursor, signal, graph);
      currentNode = edge ? graph.nodes.find((n) => n.id === edge.target) ?? null : null;
    } else {
      // Saved cursor no longer exists in the flow (it was edited/deleted) — restart safely
      currentNode = findEntryNode(graph);
    }
  }

  // Walk forward, auto-rendering non-interactive nodes, until we hit a PAUSE or dead end
  while (currentNode) {
    const paused = await renderNode(currentNode, phoneId, from);

    // Persist the cursor back to Postgres (Contact.activeFlowNodeId), not Firebase
    await db.contact.update({
      where: { id: contactId },
      data: { activeFlowNodeId: paused ? currentNode.id : null },
    });

    if (paused) return; // stop and wait for the next inbound message (webhook)

    const nextEdge = graph.edges.find((e) => e.source === currentNode!.id);
    currentNode = nextEdge ? graph.nodes.find((n) => n.id === nextEdge.target) ?? null : null;
  }
}
