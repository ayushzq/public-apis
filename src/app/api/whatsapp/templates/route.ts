import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

const META_API_VERSION = "v21.0";

async function getMetaCredentials(orgId: string) {
  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });

  if (!settings || !settings.businessAccountId || !settings.accessToken) {
    return null;
  }

  return {
    wabaId: settings.businessAccountId,
    accessToken: settings.accessToken,
  };
}

export async function GET() {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  const creds = await getMetaCredentials(orgId);
  if (!creds) {
    return NextResponse.json({ error: "Please link your Meta API credentials in Settings first." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates?limit=100`,
      { headers: { Authorization: `Bearer ${creds.accessToken}` } }
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    return NextResponse.json({ templates: data.data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to connect to Meta servers." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  const creds = await getMetaCredentials(orgId);
  if (!creds) return NextResponse.json({ error: "Please link Meta credentials first." }, { status: 400 });

  try {
    const payload = await req.json();
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    try {
      await prisma.template.upsert({
        where: {
          organizationId_name: {
            organizationId: orgId,
            name: payload.name,
          }
        },
        create: {
          organizationId: orgId,
          name: payload.name,
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
        update: {
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
      });
    } catch (e) {
      console.warn("Template local mirror fail:", e);
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Network error: template submit failed." }, { status: 502 });
  }
}
