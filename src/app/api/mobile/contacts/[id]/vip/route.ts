import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { ok, fail } from "@/lib/apiResponse";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireOwner(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    // Agar body me direct boolean bhejein, warna current value ka opposite (toggle) karein
    let nextVipState: boolean;

    if (typeof body.isVip === "boolean") {
      nextVipState = body.isVip;
    } else {
      const existing = await prisma.contact.findUnique({
        where: { id },
        select: { isVip: true },
      });
      if (!existing) return fail("Contact not found", 404);
      nextVipState = !existing.isVip;
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: { isVip: nextVipState },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        isVip: true,
      },
    });

    return ok({ contact, isVip: contact.isVip });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Contact VIP Route Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}
