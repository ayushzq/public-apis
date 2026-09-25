import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the current request's organization + user.
 *
 * Fixed to look the user up by `session.user.id` instead of email — with the
 * ROOT/AGENT split, email is no longer unique on User, so an email-only
 * lookup here could silently resolve to the *wrong* row (or throw, since
 * Prisma no longer allows `findUnique({ where: { email } })` at all). The id
 * NextAuth puts on the JWT always points at exactly one User row.
 *
 * Also now passes `authOptions` to getServerSession — without it, in a route
 * handler, `getServerSession()` can fail to read the session cookie at all.
 */
export async function getTenantContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 as const, orgId: null, user: null };
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user) {
    return { error: "User not found", status: 404 as const, orgId: null, user: null };
  }

  if (!user.organizationId) {
    const org = await prisma.organization.create({
      data: { name: `${user.name || "Business"} Workspace`, ownerId: user.id },
    });

    user = await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: org.id, role: "OWNER" },
      include: { organization: true },
    });
  }

  return { error: null, status: 200 as const, orgId: user.organizationId, user };
}
