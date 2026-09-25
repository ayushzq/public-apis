import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

// Security fix (BaseKey audit — P1, cross-tenant data leak): this route had
// NO auth check at all and returned the last 50 API logs across EVERY
// workspace — any visitor who found the URL could read every org's request
// payloads, IPs, and error messages. Now requires a session and only
// returns logs for API keys that belong to the caller's own organization.
export async function GET() {
  const { error, status, orgId, user } = await getTenantContext();
  if (error || !orgId || !user) return NextResponse.json({ error: error || "Unauthorized" }, { status });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can view API logs." }, { status: 403 });
  }

  try {
    const logs = await prisma.apiLog.findMany({
      where: { apiKey: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        apiKey: { select: { name: true } },
      },
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch API logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
