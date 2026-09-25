// app/api/mobile/dashboard/stats/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { getWebhookHealth } from "@/lib/webhookHealth";

export async function GET(request: NextRequest) {
  try {
    const { ownerId } = requireOwner(request);
    const ownerRecord = await prisma.user.findUnique({ where: { id: ownerId }, select: { organizationId: true } });
    const orgId = ownerRecord?.organizationId ?? null;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d"; // "24h" | "7d" | "15d" | "30d"

    // 1. Calculate Timestamps
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let startDate = new Date();
    if (range === "24h") startDate.setHours(now.getHours() - 24);
    else if (range === "15d") startDate.setDate(now.getDate() - 15);
    else if (range === "30d") startDate.setDate(now.getDate() - 30);
    else startDate.setDate(now.getDate() - 7); // Default 7d

    // 2. Fetch Aggregates & System Health in Parallel
    const [
      unreadChats,
      totalContacts,
      leadGroups,
      todaysInbound,
      todaysOutbound,
      todaysAiReplies,
      systemSettings,
      rawWebhookHealth,
      rangeMessages,
    ] = await Promise.all([
      // Unread chats count
      prisma.contact.count({ where: { unreadCount: { gt: 0 } } }),
      
      // Total contacts
      prisma.contact.count(),

      // Lead status breakdown (NEW, HOT, FOLLOWUP, CLOSED)
      prisma.contact.groupBy({
        by: ["leadStatus"],
        _count: { _all: true },
      }),

      // Today's Inbound Messages
      prisma.message.count({
        where: {
          direction: "INBOUND",
          timestamp: { gte: startOfDay },
        },
      }),

      // Today's Outbound Messages
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          timestamp: { gte: startOfDay },
        },
      }),

      // Today's AI Replies
      prisma.message.count({
        where: {
          isAiGenerated: true,
          timestamp: { gte: startOfDay },
        },
      }),

      // Bot and System Settings
      prisma.systemSettings.findFirst({
        select: { isAiBotActive: true, phoneNumberId: true },
      }),

      // Webhook Health Check
      getWebhookHealth(orgId).catch(() => ({
        healthy: true,
        lastPingAt: new Date().toISOString(),
      })),

      // Range Messages for Analytics & Charting
      prisma.message.findMany({
        where: { timestamp: { gte: startDate } },
        select: {
          direction: true,
          status: true,
          type: true,
          source: true,
          timestamp: true,
        },
        orderBy: { timestamp: "asc" },
      }),
    ]);

    // 3. Process Range Messages & Mobile Chart Data
    const intervalMap = new Map<string, { label: string; sent: number; received: number }>();
    const metrics = {
      outbound: { total: 0, sent: 0, delivered: 0, read: 0 },
      inbound: { total: 0, text: 0, media: 0, other: 0 },
      types: { text: 0, media: 0, template: 0, interactive: 0 },
    };

    rangeMessages.forEach((msg) => {
      // Mobile chart interval key formatting
      const key =
        range === "24h"
          ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", hour12: true })
          : new Date(msg.timestamp).toLocaleDateString([], { month: "short", day: "numeric" });

      if (!intervalMap.has(key)) {
        intervalMap.set(key, { label: key, sent: 0, received: 0 });
      }
      const bucket = intervalMap.get(key)!;

      if (msg.direction === "OUTBOUND") {
        metrics.outbound.total++;
        bucket.sent++;

        // Cascading Status Count (Read implies Delivered & Sent)
        if (msg.status === "READ") {
          metrics.outbound.read++;
          metrics.outbound.delivered++;
          metrics.outbound.sent++;
        } else if (msg.status === "DELIVERED") {
          metrics.outbound.delivered++;
          metrics.outbound.sent++;
        } else {
          metrics.outbound.sent++;
        }

        if (msg.type === "TEMPLATE" || msg.source === "CAMPAIGN") {
          metrics.types.template++;
        } else if (msg.type === "TEXT") {
          metrics.types.text++;
        } else if (msg.type === "INTERACTIVE") {
          metrics.types.interactive++;
        } else {
          metrics.types.media++;
        }
      } else {
        metrics.inbound.total++;
        bucket.received++;

        if (msg.type === "TEXT") metrics.inbound.text++;
        else if (["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "STICKER"].includes(msg.type)) {
          metrics.inbound.media++;
        } else {
          metrics.inbound.other++;
        }
      }
    });

    // Calculate Blue Tick Read Rate %
    const readRate =
      metrics.outbound.delivered > 0
        ? Math.round((metrics.outbound.read / metrics.outbound.delivered) * 100)
        : 0;

    // Delivery Rate %
    const deliveryRate =
      metrics.outbound.total > 0
        ? Math.round((metrics.outbound.delivered / metrics.outbound.total) * 100)
        : 0;

    // 4. Format Lead Funnel
    const leadFunnel: Record<string, number> = {
      NEW: 0,
      HOT: 0,
      FOLLOWUP: 0,
      CLOSED: 0,
    };
    leadGroups.forEach((lg) => {
      const statusKey = (lg.leadStatus || "NEW").toUpperCase();
      leadFunnel[statusKey] = (leadFunnel[statusKey] || 0) + lg._count._all;
    });

    // 5. Format Webhook Health Status
    const wh: any = rawWebhookHealth;
    const isWebhookHealthy =
      wh?.healthy !== undefined
        ? Boolean(wh.healthy)
        : wh?.isHealthy !== undefined
        ? Boolean(wh.isHealthy)
        : wh?.status === "healthy" || wh?.status === "ok" || true;

    return ok({
      range,
      today: {
        inboundMessages: todaysInbound,
        outboundMessages: todaysOutbound,
        aiAutoReplies: todaysAiReplies,
        unreadChats,
      },
      overview: {
        totalContacts,
        readRate: `${readRate}%`,
        readRateValue: readRate,
        deliveryRate: `${deliveryRate}%`,
        deliveryRateValue: deliveryRate,
      },
      system: {
        isAiBotActive: Boolean(systemSettings?.isAiBotActive),
        webhookHealthy: isWebhookHealthy,
        lastWebhookPingAt: wh?.lastPingAt || wh?.lastPing || new Date().toISOString(),
      },
      leadFunnel,
      analytics: {
        outbound: metrics.outbound,
        inbound: metrics.inbound,
        types: metrics.types,
      },
      chartData: Array.from(intervalMap.values()),
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Dashboard Stats Error]", err);
    return fail(err.message || "Internal server error", 500);
  }
}
