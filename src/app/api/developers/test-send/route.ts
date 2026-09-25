import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getSystemSettingsByOrg } from "@/lib/systemSettings";

// 🔒 Security fix (BaseKey audit): the Developer page used to call
// graph.facebook.com directly from the browser with the raw WhatsApp
// access token attached — visible in the Network tab to anyone with
// devtools open on that session. This route does the same call
// server-side instead, the same pattern already used by /api/v1/trigger
// and /api/chat/messages.
export async function POST(req: Request) {
  try {
    const { error, status, orgId } = await getTenantContext();
    if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

    const { phone, templateName, language, variables } = await req.json();
    if (!phone || !templateName) {
      return NextResponse.json({ error: "phone and templateName are required" }, { status: 400 });
    }

    // 🔧 Fix: SystemSettings is one row per workspace (unique on
    // organizationId) — the old fixed `id: "main_settings"` lookup never
    // matched any row. Secrets come back decrypted from this helper.
    const settings = await getSystemSettingsByOrg(orgId);
    if (!settings || !settings.accessToken || !settings.phoneNumberId) {
      return NextResponse.json({ error: "WhatsApp Configuration not found" }, { status: 404 });
    }

    const components =
      Array.isArray(variables) && variables.length > 0
        ? [{ type: "body", parameters: variables.map((v: string) => ({ type: "text", text: String(v) })) }]
        : [];

    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${settings.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: language || "en_US" },
          ...(components.length > 0 && { components }),
        },
      }),
    });

    const data = await metaRes.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Developer test-send error:", error);
    return NextResponse.json({ error: "Failed to send test message." }, { status: 500 });
  }
}
