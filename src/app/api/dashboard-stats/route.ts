import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

// Rewrite (BaseKey audit — dashboard showed only zeroes / dummy data):
// this used to return `{ totalContacts, totalCampaigns, isAiBotActive,
// totalKeys }` — a completely different, much smaller shape than what the
// dashboard page actually reads (data.contacts.total, data.system.*,
// data.outbound.*, data.inbound.*, data.types.*, data.readRate,
// data.chartData) — so every widget rendered its "0" / empty default no
// matter how much real traffic existed. It also silently ignored the
// `range` query param entirely. This version computes everything from real
// rows, scoped to the caller's workspace, honouring the selected range.

const RANGE_TO_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "15d": 15, "30d": 30 };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";
    const days = RANGE_TO_DAYS[range] ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [
      totalContacts,
      importedContacts,
      apiContacts,
      manualContacts,
      settings,
      activeFlows,
      approvedTemplates,
      activeApiKeys,
      activeSessions,
      outboundMessages,
      inboundMessages,
    ] = await Promise.all([
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId, source: "import" } }),
      prisma.contact.count({ where: { organizationId: orgId, source: "api" } }),
      prisma.contact.count({ where: { organizationId: orgId, source: "manual" } }),
      prisma.systemSettings.findUnique({ where: { organizationId: orgId } }),
      prisma.chatFlow.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.template.count({ where: { organizationId: orgId, status: "APPROVED" } }),
      prisma.apiKey.count({ where: { organizationId: orgId, isRevoked: false } }),
      prisma.contact.count({ where: { organizationId: orgId, isSessionActive: true } }),
      prisma.message.findMany({
        where: { direction: "OUTBOUND", timestamp: { gte: since }, contact: { organizationId: orgId } },
        select: { timestamp: true, status: true, source: true, type: true },
      }),
      prisma.message.findMany({
        where: { direction: "INBOUND", timestamp: { gte: since }, contact: { organizationId: orgId } },
        select: { timestamp: true, type: true },
      }),
    ]);

    // ── Outbound breakdown ──
    const outbound = { total: 0, read: 0, delivered: 0, sent: 0, chat: 0, flow: 0, api: 0, campaign: 0 };
    for (const m of outboundMessages) {
      outbound.total++;
      if (m.status === "READ") outbound.read++;
      else if (m.status === "DELIVERED") outbound.delivered++;
      else if (m.status === "SENT") outbound.sent++;
      if (m.source === "CHAT") outbound.chat++;
      else if (m.source === "FLOW") outbound.flow++;
      else if (m.source === "API") outbound.api++;
      else if (m.source === "CAMPAIGN") outbound.campaign++;
    }

    // ── Inbound breakdown ──
    const inbound = { total: 0, text: 0, image: 0, video: 0, document: 0, audio: 0, location: 0, sticker: 0, interactive: 0 };
    for (const m of inboundMessages) {
      inbound.total++;
      const key = m.type.toLowerCase() as keyof typeof inbound;
      if (key in inbound && key !== "total") (inbound[key] as number)++;
    }

    // ── Message-type totals (for the small "types" tiles) ──
    const allMessages = [...outboundMessages, ...inboundMessages];
    const types = {
      template: allMessages.filter((m: any) => m.type === "TEMPLATE").length,
      text: allMessages.filter((m: any) => m.type === "TEXT").length,
      media: allMessages.filter((m: any) => ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "STICKER"].includes(m.type)).length,
      interactive: allMessages.filter((m: any) => m.type === "INTERACTIVE").length,
    };

    // ── Daily chart series (sent vs received, one point per day in range) ──
    const chartBucket = new Map<string, { sent: number; received: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      chartBucket.set(dayKey(d), { sent: 0, received: 0 });
    }
    for (const m of outboundMessages) {
      const k = dayKey(new Date(m.timestamp));
      const bucket = chartBucket.get(k);
      if (bucket) bucket.sent++;
    }
    for (const m of inboundMessages) {
      const k = dayKey(new Date(m.timestamp));
      const bucket = chartBucket.get(k);
      if (bucket) bucket.received++;
    }
    const chartData = Array.from(chartBucket.entries()).map(([date, v]) => ({
      date: date.slice(5), // MM-DD, compact for the x-axis
      sent: v.sent,
      received: v.received,
    }));

    const readRate = outbound.total > 0 ? Math.round((outbound.read / outbound.total) * 100) : 0;

    return NextResponse.json({
      contacts: { total: totalContacts, imported: importedContacts, api: apiContacts, manual: manualContacts },
      system: {
        botActive: settings?.isAiBotActive || false,
        activeFlows,
        approvedTemplates,
        activeApiKeys,
        activeSessions,
      },
      outbound,
      inbound,
      types,
      readRate,
      chartData,
    });
  } catch (error) {
    console.error("[Dashboard Stats Error]:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
