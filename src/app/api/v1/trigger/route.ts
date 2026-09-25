import { NextResponse } from "next/server";
import crypto from "crypto";
import { db as prisma } from "@/prisma/lib/db";
import { getSystemSettingsByOrg } from "@/lib/systemSettings";

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// Helper function to save Request Logs
async function logApiRequest({ apiKeyId = null, statusCode, status, errorMsg = null, payload = null, req }: any) {
  try {
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown IP";
    const userAgent = req.headers.get("user-agent") || "Unknown Device";
    const referer = req.headers.get("referer") || "Direct API Call";

    await prisma.apiLog.create({
      data: {
        apiKeyId,
        endpoint: "/api/v1/trigger",
        method: "POST",
        statusCode,
        status,
        errorMsg,
        payload,
        ipAddress,
        userAgent,
        referer
      }
    });
  } catch (e) {
    console.error("Failed to save API Log:", e);
  }
}

export async function POST(req: Request) {
  let bodyData: any = {};
  
  try {
    try {
      bodyData = await req.json();
    } catch {
      await logApiRequest({ req, statusCode: 400, status: "FAILED", errorMsg: "Invalid JSON format" });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { template, phone, variables, language } = bodyData;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logApiRequest({ req, statusCode: 401, status: "FAILED", errorMsg: "Missing or invalid Authorization header", payload: bodyData });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientApiKey = authHeader.replace("Bearer ", "").trim();

    if (!template || !phone) {
      await logApiRequest({ req, statusCode: 400, status: "FAILED", errorMsg: "Missing 'template' or 'phone' in payload", payload: bodyData });
      return NextResponse.json({ error: "Missing template or phone" }, { status: 400 });
    }

    // 1. API Key Lookup with Tenant isolation
    // Security fix (BaseKey audit — critical): keys used to be stored and
    // looked up as raw plain text (`token`). Now only a SHA-256 hash is
    // stored (`tokenHash`) — a DB leak no longer hands out live, usable
    // credentials, only unreversible hashes.
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { tokenHash: hashApiKey(clientApiKey) },
    });

    if (!apiKeyRecord) {
      await logApiRequest({ req, statusCode: 401, status: "FAILED", errorMsg: "Invalid API Key provided", payload: bodyData });
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    if (apiKeyRecord.isRevoked) {
      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 403, status: "FAILED", errorMsg: "API Key has been revoked by admin", payload: bodyData });
      return NextResponse.json({ error: "This API Key has been revoked by the admin" }, { status: 403 });
    }

    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 403, status: "FAILED", errorMsg: "API Key has expired", payload: bodyData });
      return NextResponse.json({ error: "This API Key has expired" }, { status: 403 });
    }

    if (apiKeyRecord.name !== template) {
      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 403, status: "FAILED", errorMsg: `API Key is locked to template '${apiKeyRecord.name}', but '${template}' was requested`, payload: bodyData });
      return NextResponse.json({ error: `This API Key is strictly locked to the template: ${apiKeyRecord.name}` }, { status: 403 });
    }

    // 2. Organization-specific Settings Fetch
    // Security fix (BaseKey audit — critical, cross-tenant leak): this used
    // to fall back to `prisma.systemSettings.findFirst()` with no filter at
    // all whenever the key's own org had no settings row yet — which meant
    // a key from one workspace could silently send WhatsApp messages (and
    // rack up cost) using a completely different workspace's number/token.
    // There is no fallback now: no org on the key, or no settings for that
    // org, is simply a hard error.
    const orgId = apiKeyRecord.organizationId;
    if (!orgId) {
      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 500, status: "FAILED", errorMsg: "API key has no associated workspace", payload: bodyData });
      return NextResponse.json({ error: "This API key is not linked to a workspace" }, { status: 500 });
    }

    const settings = await getSystemSettingsByOrg(orgId);
    if (!settings || !settings.accessToken || !settings.phoneNumberId) {
      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 500, status: "FAILED", errorMsg: "WhatsApp Configuration missing in CRM settings", payload: bodyData });
      return NextResponse.json({ error: "WhatsApp Configuration not found" }, { status: 500 });
    }

    let cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    // 3. WhatsApp Request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
      const components = variables && Array.isArray(variables) 
        ? [{ type: "body", parameters: variables.map((val: string) => ({ type: "text", text: String(val) })) }]
        : [];

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${settings.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: template,
            language: { code: language || "en_US" },
            ...(components.length > 0 && { components }),
          },
        }),
      });

      const metaData = await metaRes.json();
      clearTimeout(timeoutId);

      if (metaData.error) {
        await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 400, status: "FAILED", errorMsg: `Meta API Error: ${metaData.error.message}`, payload: bodyData });
        return NextResponse.json({ error: "Meta API Error", details: metaData.error.message }, { status: 400 });
      }

      // 4. Save Contact & Message (Compound key fix)
      const contact = await prisma.contact.upsert({
        where: {
          organizationId_phoneNumber: {
            organizationId: orgId,
            phoneNumber: cleanPhone,
          },
        },
        update: { lastMessageAt: new Date() },
        create: {
          organizationId: orgId,
          phoneNumber: cleanPhone,
          name: "API User",
          source: "api"
        }
      });

      await prisma.message.create({
        data: {
          id: metaData.messages?.[0]?.id || `api_local_${Date.now()}`,
          contactId: contact.id,
          body: `Sent Template: ${template}`,
          type: "TEMPLATE",
          direction: "OUTBOUND",
          status: "SENT",
          source: "API",
          timestamp: new Date()
        }
      });

      await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 200, status: "SUCCESS", payload: bodyData });
      return NextResponse.json({ success: true, meta_response: metaData }, { status: 200 });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        await logApiRequest({ req, apiKeyId: apiKeyRecord.id, statusCode: 504, status: "FAILED", errorMsg: "Meta API Timeout", payload: bodyData });
        return NextResponse.json({ error: "Meta API Timeout: Server took too long to respond" }, { status: 504 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Trigger API Error:", error);
    await logApiRequest({ req, statusCode: 500, status: "FAILED", errorMsg: `Internal Server Error: ${error.message}`, payload: bodyData });
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
