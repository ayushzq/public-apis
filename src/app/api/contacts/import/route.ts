import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    const { error, status, orgId } = await getTenantContext();
    if (error || !orgId) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status });
    }

    const body = await req.json();
    const contacts = Array.isArray(body) ? body : body.contacts;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    let importedCount = 0;

    for (const c of contacts) {
      if (!c.phoneNumber) continue;

      let cleanPhone = String(c.phoneNumber).replace(/\D/g, "");
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }

      await prisma.contact.upsert({
        where: {
          organizationId_phoneNumber: {
            organizationId: orgId,
            phoneNumber: cleanPhone,
          },
        },
        update: {
          name: c.name ?? undefined,
          email: c.email ?? null,
          source: c.source ?? "import",
        },
        create: {
          organizationId: orgId,
          phoneNumber: cleanPhone,
          name: c.name || cleanPhone,
          email: c.email ?? null,
          source: c.source ?? "import",
          leadStatus: c.leadStatus || "NEW",
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} contacts`,
    });
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json(
      { error: "Failed to import contacts", details: error?.message },
      { status: 500 }
    );
  }
}
