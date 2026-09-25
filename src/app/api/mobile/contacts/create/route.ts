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
    const { name, phone, email, leadStatus } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    let cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    // 🔥 FIX: findUnique ki jagah findFirst (organization-scoped)
    const existing = await prisma.contact.findFirst({
      where: {
        organizationId: orgId,
        phoneNumber: cleanPhone,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Contact already exists in this workspace", contact: existing },
        { status: 409 }
      );
    }

    const newContact = await prisma.contact.create({
      data: {
        organizationId: orgId,
        phoneNumber: cleanPhone,
        name: name || cleanPhone,
        email: email || null,
        leadStatus: leadStatus || "NEW",
      },
    });

    return NextResponse.json(newContact, { status: 201 });
  } catch (err: any) {
    console.error("Mobile create contact error:", err);
    return NextResponse.json(
      { error: "Failed to create contact", details: err?.message },
      { status: 500 }
    );
  }
}
