import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// 🚀 QStash Client Initialization
const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL || "https://qstash-eu-central-1.upstash.io",
});

// 📞 Utility: E.164 International Phone Number Sanitizer
function sanitizePhoneNumber(phone: string, defaultCountryCode = "91"): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1️⃣ Security & Auth Check
    // Security fix (BaseKey audit — P0, cross-tenant abuse): this used to
    // accept any caller's own session plus an arbitrary `campaignId` with
    // NO check that the campaign belonged to them — letting any logged-in
    // user of ANY workspace force-dispatch messages against a DIFFERENT
    // workspace's campaign (sent using that victim's own WhatsApp number
    // and budget, to whatever audience the attacker supplied). Now
    // resolved via getTenantContext() and the campaignId (if provided) is
    // verified to belong to the caller's own organization before anything
    // is queued.
    const ctx = await getTenantContext();
    if (ctx.error || !ctx.orgId) return NextResponse.json({ error: ctx.error || "Unauthorized" }, { status: ctx.status });
    const orgId = ctx.orgId;

    const body = await req.json();
    const {
      campaignId,
      campaignName = "Quick Broadcast",
      templateName,
      languageCode = "en",
      headerMediaUrl,
      bodyVariables = [], // Template default parameters
      contacts = [], // Array of { id, name, phone, customAttributes }
      pacingSeconds = 2, // Default 2 seconds gap between messages
    } = body;

    // 2️⃣ Mandatory Validation
    if (!templateName) {
      return NextResponse.json({ error: "templateName is required" }, { status: 400 });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Contact list cannot be empty" }, { status: 400 });
    }

    // 3️⃣ Sanitize & Validate Body Variables (Meta Empty Parameter Prevention Fix)
    const sanitizedBodyVariables = (Array.isArray(bodyVariables) ? bodyVariables : []).map(
      (val: string, idx: number) => {
        const trimmed = String(val || "").trim();
        if (!trimmed || trimmed.length === 0) {
          return `Value ${idx + 1}`; // Meta safe fallback
        }
        return trimmed;
      }
    );

    // 4️⃣ Audience Sanitization & Deduplication (Enterprise Rule)
    const validAudience: Array<{
      contactId?: string;
      name: string;
      phone: string;
      customAttributes?: Record<string, any>;
    }> = [];
    const seenNumbers = new Set<string>();
    let invalidCount = 0;

    for (const c of contacts) {
      const formattedPhone = sanitizePhoneNumber(c.phone);
      if (!formattedPhone || seenNumbers.has(formattedPhone)) {
        invalidCount++;
        continue;
      }

      seenNumbers.add(formattedPhone);
      validAudience.push({
        contactId: c.id,
        name: c.name || "Customer",
        phone: formattedPhone,
        customAttributes: c.customAttributes || {},
      });
    }

    if (validAudience.length === 0) {
      return NextResponse.json(
        { error: "No valid unique phone numbers found in audience" },
        { status: 400 }
      );
    }

    // 5️⃣ Target Worker URL
    const appBaseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://basekey.in");

    const workerDestination = `${appBaseUrl}/api/campaigns/worker`;

    // 6️⃣ Database Initialization (Campaign Record & Logs)
    let activeCampaignId = campaignId;
    try {
      if (!activeCampaignId) {
        const newCamp = await prisma.campaign.create({
          data: {
            name: campaignName,
            templateName,
            status: "RUNNING",
            totalRecipients: validAudience.length,
            sentCount: 0,
            failedCount: 0,
            startedAt: new Date(),
            organizationId: orgId,
          },
        });
        activeCampaignId = newCamp.id;
      } else {
        // Ownership check — an existing campaignId must belong to this org.
        const existing = await prisma.campaign.findUnique({ where: { id: activeCampaignId } });
        if (!existing || existing.organizationId !== orgId) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        await prisma.campaign.update({
          where: { id: activeCampaignId },
          data: {
            status: "RUNNING",
            totalRecipients: validAudience.length,
            startedAt: new Date(),
          },
        });
      }

      // Batch create initial recipient log records taaki drawer me turant dikhe
      await prisma.campaignLog.createMany({
        data: validAudience.map((aud) => ({
          campaignId: activeCampaignId,
          contactId: aud.contactId || null,
          phoneNumber: aud.phone,
          recipientName: aud.name,
          status: "QUEUED",
        })),
        skipDuplicates: true,
      });
    } catch (dbErr) {
      console.warn("[Dispatch Warning] DB log creation skipped or schema mismatch:", dbErr);
    }

    // 7️⃣ Smart Pacing & QStash Queue Scheduling
    let cumulativeDelay = 0;
    const queuePromises = validAudience.map((recipient, index) => {
      if (index > 0) {
        const randomJitter = Math.random() * 0.5 + 0.2; // 200ms to 700ms random offset
        cumulativeDelay += pacingSeconds + randomJitter;
      }

      const delayInSeconds = Math.round(cumulativeDelay);
      const deduplicationKey = `camp_${activeCampaignId}_${recipient.phone}_${index}`;

      return qstash.publishJSON({
        url: workerDestination,
        body: {
          campaignId: activeCampaignId,
          contactId: recipient.contactId,
          recipientName: recipient.name,
          phoneNumber: recipient.phone,
          templateName,
          languageCode,
          headerMediaUrl,
          bodyVariables: sanitizedBodyVariables, // Clean non-empty variables passed
          customAttributes: recipient.customAttributes,
          dispatchTimestamp: Date.now(),
        },
        delay: delayInSeconds,
        deduplicationId: deduplicationKey,
        retries: 3,
      });
    });

    await Promise.all(queuePromises);

    const totalDurationSeconds = Math.round(cumulativeDelay);
    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        campaignId: activeCampaignId,
        totalQueued: validAudience.length,
        skippedInvalidOrDuplicate: invalidCount,
        pacingSeconds,
        estimatedDurationMinutes: (totalDurationSeconds / 60).toFixed(1),
        executionTimeMs,
      },
      message: `Successfully queued ${validAudience.length} messages with organic anti-ban pacing.`,
    });
  } catch (error: any) {
    console.error("[Enterprise Dispatch Error]:", error);
    return NextResponse.json(
      { error: error.message || "Broadcast dispatch failed" },
      { status: 500 }
    );
  }
}
