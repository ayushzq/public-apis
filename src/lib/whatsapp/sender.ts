// lib/whatsapp/sender.ts
import { db } from "@/prisma/lib/db"; 

export async function sendWhatsAppMessage(phoneId: string, to: string, payload: any) {
  // 🔧 Fix: SystemSettings is now one row per workspace (unique on
  // organizationId), not a single fixed `id: "main_settings"` row — that
  // id never exists anymore, so every flow-engine reply silently threw
  // "access token not configured". The inbound webhook always tells us
  // which Meta phone number the message is for, so look the workspace up
  // by that instead (each connected WhatsApp number belongs to one org).
  const settings = await db.systemSettings.findFirst({ where: { phoneNumberId: phoneId } });
  if (!settings?.accessToken) throw new Error("WhatsApp access token not configured");

  const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });

  if (!res.ok) {
    console.error("Meta send failed:", await res.text());
  }
  return res.json();
}
