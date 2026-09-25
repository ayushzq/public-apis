import { prisma } from "@/lib/prisma";

export interface SendMessageParams {
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "document" | "audio" | "video";
  templateName?: string;
  templateParams?: any;
  languageCode?: string;
  [key: string]: any; // Extra properties allow karne ke liye
}

export async function sendWhatsAppMessage({
  to,
  text,
  mediaUrl,
  mediaType = "image",
  templateName,
  templateParams,
  languageCode = "en_US",
}: SendMessageParams) {
  // 🔧 Fix: SystemSettings moved to one row per workspace (unique on
  // organizationId); the old fixed `id: "main_settings"` lookup never
  // matched any row, so this always fell through to (usually empty) env
  // vars. This helper isn't passed an orgId by any of its current callers,
  // so `findFirst` (same fallback already used in the webhook route) is the
  // safest fix here — correct for a single-workspace deployment. Callers
  // that need to be org-specific should resolve settings themselves and
  // pass credentials in, rather than relying on this global lookup.
  const settings = await prisma.systemSettings.findFirst();

  const phoneNumberId = settings?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  const accessToken = settings?.accessToken || process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Meta WhatsApp API credentials missing in SystemSettings or .env");
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const cleanPhone = to.replace(/\D/g, "");

  let payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
  };

  if (templateName) {
    payload.type = "template";
    payload.template = {
      name: templateName,
      language: { code: languageCode },
      ...(templateParams ? { components: templateParams } : {}),
    };
  } else if (mediaUrl) {
    payload.type = mediaType;
    payload[mediaType] = {
      link: mediaUrl,
      ...(text ? { caption: text } : {}),
    };
  } else if (text) {
    payload.type = "text";
    payload.text = { preview_url: true, body: text };
  } else {
    throw new Error("Message text, mediaUrl, or templateName is required");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Meta WhatsApp Error]", data);
    throw new Error(data.error?.message || "Failed to send WhatsApp message via Meta API");
  }

  return {
    ...data,
    messageId: data.messages?.[0]?.id || `meta_${Date.now()}`,
    accepted: Boolean(data.messages?.[0]?.id),
  };
}

export default { sendWhatsAppMessage };
