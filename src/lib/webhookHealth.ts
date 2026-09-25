import { prisma } from "@/lib/prisma";

export interface WebhookHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  lastInboundAt: string | null;
  activeSettings: boolean;
  messageCountToday: number;
}

export async function getWebhookHealth(organizationId?: string | null): Promise<WebhookHealth> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔧 Fix: SystemSettings is one row per workspace (unique on
    // organizationId) — the old fixed `id: "main_settings"` lookup never
    // matched any row. Falls back to `findFirst` when no org is known.
    const [lastInboundMessage, todayCount, settings] = await Promise.all([
      prisma.message.findFirst({
        where: { direction: "INBOUND" },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
      prisma.message.count({
        where: {
          direction: "INBOUND",
          timestamp: { gte: today },
        },
      }),
      organizationId
        ? prisma.systemSettings.findUnique({
            where: { organizationId },
            select: { phoneNumberId: true, accessToken: true },
          })
        : prisma.systemSettings.findFirst({
            select: { phoneNumberId: true, accessToken: true },
          }),
    ]);

    const hasCredentials = Boolean(settings?.phoneNumberId && settings?.accessToken);
    let status: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";

    if (!hasCredentials) {
      status = "DOWN";
    } else if (!lastInboundMessage) {
      status = "DEGRADED";
    }

    return {
      status,
      lastInboundAt: lastInboundMessage?.timestamp?.toISOString() || null,
      activeSettings: hasCredentials,
      messageCountToday: todayCount,
    };
  } catch (error) {
    console.error("[Webhook Health Error]", error);
    return {
      status: "DOWN",
      lastInboundAt: null,
      activeSettings: false,
      messageCountToday: 0,
    };
  }
}

export default { getWebhookHealth };
