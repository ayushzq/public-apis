import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { verifyTotpCode } from "@/lib/totp";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const challengeId: string | undefined = body?.challengeId;
  const code: string | undefined = body?.code;

  if (!challengeId || !code) {
    return fail("challengeId and code are required", 400);
  }

  const result = await verifyTotpCode(challengeId, code);
  if (!result.valid || !result.userId) {
    return fail("Invalid or expired code", 401);
  }

  const owner = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!owner || owner.role !== "OWNER") {
    return fail("Forbidden", 403);
  }

  let organizationId = owner.organizationId;
  if (!organizationId) {
    const org = await prisma.organization.create({ data: { name: `${owner.name || "Business"} Workspace`, ownerId: owner.id } });
    await prisma.user.update({ where: { id: owner.id }, data: { organizationId: org.id } });
    organizationId = org.id;
  }

  const token = signMobileToken({ ownerId: owner.id, organizationId, role: "OWNER" });
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  return ok({
    token,
    expiresAt,
    ownerId: owner.id,
    ownerName: owner.name,
  });
}
