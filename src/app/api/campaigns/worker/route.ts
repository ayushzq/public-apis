import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import prisma from "@/lib/prisma";

// Helper: Meta Credentials (Environment Variables ya Database Settings se)
async function getMetaCredentials(campaignId?: string) {
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    try {
      // 🔧 Fix: SystemSettings is one row per workspace (unique on
      // organizationId) — the old fixed `id: "main_settings"` lookup never
      // matched any row. The campaign row tells us which workspace this
      // job belongs to, so resolve settings through that instead.
      let orgId: string | null = null;
      if (campaignId) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { organizationId: true },
        });
        orgId = campaign?.organizationId ?? null;
      }

      const settings = orgId
        ? await prisma.systemSettings.findUnique({ where: { organizationId: orgId } })
        : null; // Security fix (BaseKey audit): no more findFirst() fallback —
                 // an unresolved org must never borrow some other
                 // workspace's WhatsApp credentials.

      if (settings?.accessToken) accessToken = settings.accessToken;
      if (settings?.phoneNumberId) phoneNumberId = settings.phoneNumberId;
    } catch (dbErr) {
      console.warn("[Worker] Database settings fetch error:", dbErr);
    }
  }

  return { accessToken, phoneNumberId };
}

export async function POST(req: NextRequest) {
  const workerStartTime = Date.now();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("upstash-signature");

    // 1️⃣ QStash Cryptographic Signature Verification
    // Security fix (BaseKey audit — P0, fail-open auth): this used to only
    // verify the signature `if (NODE_ENV === "production" && signingKey &&
    // signature)` — a missing env var, a missing header, OR any thrown
    // error from `receiver.verify()` (all caught and merely logged as
    // "skipped") let the request through UNAUTHENTICATED. Since this worker
    // triggers real WhatsApp sends billed to the workspace, anyone who
    // found this URL could fire arbitrary messages. Now fails closed: every
    // one of those cases is a hard 401/500, no exceptions.
    const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    if (!signingKey) {
      console.error("[Worker Config Error] QSTASH_CURRENT_SIGNING_KEY is not set.");
      return NextResponse.json({ error: "Worker is not configured" }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: "Missing Upstash-Signature header" }, { status: 401 });
    }

    try {
      const receiver = new Receiver({
        currentSigningKey: signingKey,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || signingKey,
      });

      const isValid = await receiver.verify({ signature, body: rawBody });
      if (!isValid) {
        console.error("[Worker Security Alert] Invalid QStash Signature Rejected");
        return NextResponse.json({ error: "Unauthorized caller signature" }, { status: 401 });
      }
    } catch (signErr) {
      console.error("[Worker Security Alert] Signature verification threw — rejecting:", signErr);
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const {
      campaignId,
      recipientName,
      phoneNumber,
      templateName,
      languageCode = "en",
      headerMediaUrl,
      bodyVariables = [],
      customAttributes = {},
    } = payload;

    if (!phoneNumber || !templateName) {
      return NextResponse.json({ error: "Missing recipient details or template" }, { status: 400 });
    }

    // 2️⃣ Idempotency & Replay Protection (Pehle se send ho chuka hai toh skip karo)
    if (campaignId && phoneNumber) {
      try {
        const existingLog = await prisma.campaignLog.findFirst({
          where: {
            campaignId,
            phoneNumber,
            status: "SENT",
          },
        });

        if (existingLog) {
          console.log(`[Worker Idempotency] Already sent to ${phoneNumber}. Skipping.`);
          return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
        }
      } catch (err) {
        // DB find fail hone par continue
      }
    }

    // 3️⃣ Meta Credentials Fetch (Env ya Database)
    const { accessToken, phoneNumberId } = await getMetaCredentials(campaignId);

    if (!accessToken || !phoneNumberId) {
      const errMsg = "Meta WhatsApp credentials not found in Settings or Environment variables.";
      console.error("[Worker Config Error]:", errMsg);
      await updateRecipientStatus(campaignId, phoneNumber, "FAILED", null, errMsg);
      
      // Return 200 taaki QStash loop me baar baar retry na kare
      return NextResponse.json({ success: false, error: errMsg }, { status: 200 });
    }

    // 4️⃣ Dynamic Variable Interpolation (Personalization Engine with Non-Empty Fallback)
    const templateComponents: any[] = [];

    // Header Media (Image) Support
    if (headerMediaUrl) {
      templateComponents.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: headerMediaUrl },
          },
        ],
      });
    }

    // Body Dynamic Text Parameters (Guaranteed non-empty strings for Meta)
    if (Array.isArray(bodyVariables) && bodyVariables.length > 0) {
      const formattedBodyParams = bodyVariables.map((val: string, idx: number) => {
        let resolvedText = String(val || "").trim();

        if (resolvedText === "{{name}}" || resolvedText === "{{1}}") {
          resolvedText = recipientName || "Customer";
        } else if (resolvedText === "{{phone}}") {
          resolvedText = phoneNumber;
        } else if (customAttributes && customAttributes[resolvedText]) {
          resolvedText = String(customAttributes[resolvedText]);
        }

        // Safety fallback: Meta rejects empty parameters
        if (!resolvedText || resolvedText.length === 0) {
          resolvedText = `Value ${idx + 1}`;
        }

        return { type: "text", text: resolvedText };
      });

      templateComponents.push({
        type: "body",
        parameters: formattedBodyParams,
      });
    }

    // 5️⃣ Meta WhatsApp Cloud API Dispatch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(templateComponents.length > 0 ? { components: templateComponents } : {}),
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const metaData = await metaResponse.json();

    // 6️⃣ Error Handling & Meta Response
    if (!metaResponse.ok) {
      const metaErrorCode = metaData?.error?.code;
      const metaErrorMessage = metaData?.error?.message || "Unknown Meta WhatsApp API Error";
      console.error(`[Worker Failed] ${phoneNumber} Error (${metaErrorCode}): ${metaErrorMessage}`);

      await updateRecipientStatus(campaignId, phoneNumber, "FAILED", null, metaErrorMessage);

      // Agar Meta Rate Limit ho (131056 ya 429) tabhi QStash retry karega
      if (metaErrorCode === 131056 || metaResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limited by Meta", details: metaErrorMessage },
          { status: 429 }
        );
      }

      // Permanent failures (Jaise 131026: number WhatsApp pe nahi hai)
      return NextResponse.json({
        success: false,
        errorType: "PERMANENT_META_FAILURE",
        metaCode: metaErrorCode,
        message: metaErrorMessage,
      }, { status: 200 });
    }

    // 7️⃣ Success: WAMID save karo aur counter badhao
    const whatsappMessageId = metaData.messages?.[0]?.id;
    await updateRecipientStatus(campaignId, phoneNumber, "SENT", whatsappMessageId, null);

    console.log(
      `[Worker Success] Delivered to ${phoneNumber} (WAMID: ${whatsappMessageId}) in ${
        Date.now() - workerStartTime
      }ms`
    );

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      recipient: phoneNumber,
    });
  } catch (error: any) {
    console.error("[Worker Runtime Exception]:", error);
    return NextResponse.json({ error: error.message || "Internal Worker Exception" }, { status: 500 });
  }
}

// Helper: Atomic Database Updates & Campaign Counter
async function updateRecipientStatus(
  campaignId: string | undefined,
  phoneNumber: string,
  status: "SENT" | "FAILED",
  messageId: string | null,
  errorMessage: string | null
) {
  if (!campaignId) return;

  try {
    // 1. Recipient Log update
    await prisma.campaignLog.updateMany({
      where: { campaignId, phoneNumber },
      data: {
        status,
        messageId: messageId || undefined,
        errorMessage: errorMessage || undefined,
        updatedAt: new Date(),
      },
    });

    // 2. Campaign Counter Increment
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: status === "SENT" ? { increment: 1 } : undefined,
        failedCount: status === "FAILED" ? { increment: 1 } : undefined,
      },
      select: {
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
      },
    });

    // 3. Agar saare messages deliver/fail ho gaye toh status COMPLETED karo
    if (
      updatedCampaign &&
      updatedCampaign.sentCount + updatedCampaign.failedCount >= updatedCampaign.totalRecipients
    ) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      console.log(`[Campaign Engine] Campaign ${campaignId} marked as COMPLETED.`);
    }
  } catch (dbUpdateErr) {
    console.warn("[Worker DB Warning] Could not update campaign status:", dbUpdateErr);
  }
}
