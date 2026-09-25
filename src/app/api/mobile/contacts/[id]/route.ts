import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { ok, fail } from "@/lib/apiResponse";

// 1. Single Contact Fetch
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireOwner(req);
    const { id } = await context.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!contact) {
      return fail("Contact not found", 404);
    }

    return ok({ contact });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Contact GET by ID Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}

// 2. Update Contact (LeadStatus, Name, Email, isMuted, isBotPaused, etc.)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireOwner(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const {
      name,
      email,
      leadStatus,
      isMuted,
      isBotPaused,
      assignedToId,
    } = body;

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(leadStatus !== undefined && { leadStatus: String(leadStatus).toUpperCase() }),
        ...(isMuted !== undefined && { isMuted: Boolean(isMuted) }),
        ...(isBotPaused !== undefined && { isBotPaused: Boolean(isBotPaused) }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
      },
    });

    return ok({ contact: updatedContact });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Contact PATCH Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}

// 3. Delete Contact
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireOwner(req);
    const { id } = await context.params;

    await prisma.contact.delete({
      where: { id },
    });

    return ok({ message: "Contact deleted successfully", deletedId: id });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Contact DELETE Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}
