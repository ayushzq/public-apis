import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

export async function GET() {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { lastMessageAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const body = await req.json();
    const contact = await prisma.contact.create({
      data: {
        ...body,
        organizationId: orgId,
      },
    });
    return NextResponse.json(contact);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create contact" }, { status: 500 });
  }
}
