import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";

const META_API_VERSION = "v21.0";

// Helper: Components JSON me se Body, Variables aur Media Type nikalne ke liye
function parseComponents(components: any) {
  let bodyPreview = "";
  let parameterCount = 0;
  let headerType: string | null = null;
  const buttons: string[] = [];

  if (Array.isArray(components)) {
    for (const comp of components) {
      if (comp.type === "BODY") {
        bodyPreview = comp.text || "";
        // Match {{1}}, {{2}} etc.
        const matches = bodyPreview.match(/\{\{\d+\}\}/g);
        parameterCount = matches ? matches.length : 0;
      } else if (comp.type === "HEADER") {
        // IMAGE, VIDEO, DOCUMENT, TEXT
        headerType = comp.format || "TEXT";
      } else if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
        comp.buttons.forEach((b: any) => {
          buttons.push(b.text || b.type);
        });
      }
    }
  }

  return { bodyPreview, parameterCount, headerType, buttons };
}

export async function GET(request: NextRequest) {
  try {
    const { ownerId } = requireOwner(request);

    // 🔧 Fix: SystemSettings is one row per workspace (unique on
    // organizationId) — the old fixed `id: "main_settings"` lookup never
    // matched any row for a real multi-tenant deployment.
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { organizationId: true } });
    const settings = owner?.organizationId
      ? await prisma.systemSettings.findUnique({ where: { organizationId: owner.organizationId } })
      : null;

    let rawTemplates: any[] = [];
    let isFromLiveMeta = false;

    // 2. Try fetching LIVE directly from Meta Graph API
    if (settings?.businessAccountId && settings?.accessToken) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/${settings.businessAccountId}/message_templates?limit=100`,
          {
            headers: { Authorization: `Bearer ${settings.accessToken}` },
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          // Sirf APPROVED templates uthao
          rawTemplates = data.data.filter((t: any) => t.status === "APPROVED");
          isFromLiveMeta = true;
        }
      } catch (metaErr) {
        console.warn("[Meta Live Templates Fetch Failed, falling back to DB]", metaErr);
      }
    }

    // 3. FALLBACK: Agar Meta se nahi mila, toh Neon DB (prisma.template) se uthao
    if (rawTemplates.length === 0) {
      const dbTemplates = await prisma.template.findMany({
        where: {
          OR: [{ status: "APPROVED" }, { status: "approved" }],
        },
        orderBy: { updatedAt: "desc" },
      });

      rawTemplates = dbTemplates;
    }

    // 4. Clean format me parse karein
    const items = rawTemplates.map((t: any) => {
      const parsed = parseComponents(t.components);

      return {
        id: t.id || t.name,
        name: t.name,
        language: t.language || "en_US",
        category: t.category || "UTILITY",
        status: t.status || "APPROVED",
        // Cleaned readable text
        bodyPreview: parsed.bodyPreview || t.bodyPreview || "",
        // Form inputs render karne ke liye variables count
        parameterCount: parsed.parameterCount,
        // Header type: "IMAGE" | "DOCUMENT" | "VIDEO" | "TEXT" | null
        headerType: parsed.headerType,
        buttons: parsed.buttons,
        source: isFromLiveMeta ? "META_CLOUD" : "LOCAL_DB",
      };
    });

    return ok({
      templates: items,
      total: items.length,
      isLiveSynced: isFromLiveMeta,
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Templates Route Error]", err);
    return fail("Internal server error", 500);
  }
}
