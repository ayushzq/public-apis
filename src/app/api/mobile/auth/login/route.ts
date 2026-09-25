import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/apiResponse";
import { signMobileToken } from "@/lib/mobileAuth";

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return cleaned;
  return `+${cleaned.slice(0, 2)}••••••${cleaned.slice(-2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), accountType: "ROOT" },
    });

    if (!user || !user.passwordHash) {
      return fail("Invalid credentials", 401);
    }

    // Role check: Owner aur Admin ko access allow
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return fail("Forbidden: owner-only access", 403);
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return fail("Invalid credentials", 401);
    }

    // Every mobile-authenticated request is scoped to this workspace — make
    // sure one exists rather than letting downstream routes silently see
    // `organizationId: null` and (as several used to) fall through to
    // "whichever data has no owner", which is a cross-tenant leak.
    let organizationId = user.organizationId;
    if (!organizationId) {
      const org = await prisma.organization.create({ data: { name: `${user.name || "Business"} Workspace`, ownerId: user.id } });
      await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id, role: "OWNER" } });
      organizationId = org.id;
    }

    // Direct Login: Seedha JWT Token banayein (No OTP needed)
    const token = signMobileToken({
      ownerId: user.id,
      organizationId,
      role: "OWNER",
    });

    return ok({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || null,
      },
      // Mobile app backwards compatibility
      challengeId: "direct_auth_success",
      maskedPhone: maskPhone(user.phone),
      expiresInSeconds: 86400 * 180, // 180 days
    });
  } catch (error: any) {
    console.error("[Mobile Login Route Error]", error);
    return fail(error.message || "Internal server error", 500);
  }
}
