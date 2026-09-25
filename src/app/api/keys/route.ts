import { NextResponse } from "next/server";
import crypto from "crypto";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

// Security fixes (BaseKey audit, P1), all applied here:
//  - This route had no auth check at all — anyone who found the URL could
//    list, generate, or delete live API keys.
//  - It also had no organization filter — every workspace could see and
//    delete every other workspace's keys. Now scoped through getTenantContext().
//  - Keys are now stored as a SHA-256 hash (`tokenHash`), never in plain
//    text. The raw key is returned to the browser exactly once, at
//    creation time, in the POST response — same UX as GitHub/Stripe keys.
function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function GET() {
  const ctx = await getTenantContext();
  if (ctx.error || !ctx.orgId) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(keys);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (ctx.error || !ctx.orgId || !ctx.user) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can create API keys." }, { status: 403 });
  }

  try {
    const { templateName, expiryDays } = await req.json();
    if (!templateName) {
      return NextResponse.json({ error: "templateName is required" }, { status: 400 });
    }

    // crypto.randomBytes (OS CSPRNG), not Math.random() — these tokens are live credentials.
    const rawToken = `bk_live_${crypto.randomBytes(24).toString("hex")}`;

    let expiresAt: Date | null = null;
    if (expiryDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiryDays));
    }

    const newKey = await prisma.apiKey.create({
      data: {
        name: templateName,
        tokenHash: hashApiKey(rawToken),
        tokenPrefix: rawToken.slice(0, 12),
        expiresAt,
        organizationId: ctx.orgId,
        userId: ctx.user.id,
      },
    });

    // `token` is only ever present in THIS response — copy it now, it can't be shown again.
    return NextResponse.json({ ...newKey, token: rawToken });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await getTenantContext();
  if (ctx.error || !ctx.orgId || !ctx.user) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can revoke API keys." }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    // deleteMany + org filter (not delete-by-id) so one workspace can never
    // delete a key id that belongs to another organization.
    const result = await prisma.apiKey.deleteMany({ where: { id, organizationId: ctx.orgId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
