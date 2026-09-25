import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

// Security fix (BaseKey audit — P0, cross-tenant data leak): this used to
// look up a single hardcoded `id: "main_flow"` row shared by the ENTIRE
// platform — every workspace's Flow Builder read (and, via /api/flows/save,
// overwrote) the exact same chatbot flow. `ChatFlow.organizationId` is
// `@unique` specifically so each workspace gets its own row instead.
export async function GET() {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const flow = await prisma.chatFlow.findUnique({
      where: { organizationId: orgId },
    });

    // No flow saved yet — that's a normal empty state, not an error.
    if (!flow) {
      return NextResponse.json({ success: true, flow: null });
    }

    return NextResponse.json({ success: true, flow });
  } catch (error) {
    console.error("FLOW GET API ERROR:", error);
    return NextResponse.json(
      { error: "Database se flow load karte waqt koi error aayi." },
      { status: 500 }
    );
  }
}
