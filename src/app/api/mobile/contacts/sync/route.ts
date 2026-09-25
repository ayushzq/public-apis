import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { ok, fail } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireOwner(req);

    // Organization ID resolve karein (User workspace se)
    let orgId = (authUser as any)?.organizationId;
    if (!orgId) {
      const userId = (authUser as any)?.id || (authUser as any)?.userId;
      const userEmail = (authUser as any)?.email;

      if (userId || userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: userId ? { id: userId } : { email: userEmail },
        });

        if (dbUser?.organizationId) {
          orgId = dbUser.organizationId;
        } else if (dbUser) {
          const newOrg = await prisma.organization.create({
            data: {
              name: `${dbUser.name || "Mobile"} Workspace`,
              ownerId: dbUser.id,
            },
          });
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { organizationId: newOrg.id },
          });
          orgId = newOrg.id;
        }
      }
    }

    if (!orgId) {
      const defaultOrg = await prisma.organization.findFirst();
      orgId = defaultOrg?.id;
    }

    if (!orgId) {
      return fail("Workspace organization not found", 400);
    }

    const body = await req.json().catch(() => ({}));
    const contacts = body?.contacts;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return fail("Contacts array is required and must not be empty", 400);
    }

    let syncedCount = 0;
    let skippedCount = 0;

    for (const c of contacts) {
      const rawPhone = c.phoneNumber || c.phone;
      if (!rawPhone) {
        skippedCount++;
        continue;
      }

      let cleanPhone = String(rawPhone).replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        skippedCount++;
        continue;
      }
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }

      // 🔥 FIX: organizationId_phoneNumber compound key use ki gayi hai
      await prisma.contact.upsert({
        where: {
          organizationId_phoneNumber: {
            organizationId: orgId,
            phoneNumber: cleanPhone,
          },
        },
        update: {
          name: c.name || undefined,
          email: c.email || undefined,
        },
        create: {
          organizationId: orgId,
          phoneNumber: cleanPhone,
          name: c.name || cleanPhone,
          email: c.email || null,
          leadStatus: "NEW",
          source: "phone_sync",
          isSessionActive: true,
        },
      });
      syncedCount++;
    }

    return ok({
      synced: true,
      totalReceived: contacts.length,
      syncedCount,
      skippedCount,
    });
  } catch (error: any) {
    if (error instanceof MobileAuthError) {
      return fail(error.message, error.status);
    }
    console.error("[Mobile Contacts Bulk Sync Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}
