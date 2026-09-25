import { NextResponse } from "next/server";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

// Security fix (BaseKey audit — P0, cross-tenant data leak): same
// hardcoded `id: "main_flow"` issue as GET /api/flows — every workspace's
// "Save" here overwrote the ENTIRE platform's single shared chatbot flow.
// Upserts by `organizationId` (unique per workspace) instead.
export async function POST(req: Request) {
  try {
    const { error, status, orgId, user } = await getTenantContext();
    if (error || !orgId || !user) {
      return NextResponse.json({ error: error || "Unauthorized! Sirf admin data save kar sakta hai." }, { status: status || 401 });
    }
    if (user.role === "AGENT") {
      return NextResponse.json({ error: "Only the owner or an admin can edit the chatbot flow." }, { status: 403 });
    }

    const body = await req.json();
    const { name, isActive, nodes, edges } = body;

    if (!nodes || !edges) {
      return NextResponse.json(
        { error: "Nodes aur Edges bhejna zaroori hai!" },
        { status: 400 }
      );
    }

    const flow = await prisma.chatFlow.upsert({
      where: { organizationId: orgId },
      update: {
        name: name || "Main Chatbot Flow",
        isActive: isActive ?? true,
        nodes: nodes,
        edges: edges,
      },
      create: {
        organizationId: orgId,
        name: name || "Main Chatbot Flow",
        isActive: isActive ?? true,
        nodes: nodes,
        edges: edges,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Flow successfully saved!",
      flow
    });

  } catch (error) {
    console.error("FLOW SAVE API ERROR:", error);
    return NextResponse.json(
      { error: "Database mein save karte waqt koi error aayi." },
      { status: 500 }
    );
  }
}
