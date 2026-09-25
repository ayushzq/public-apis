import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// Security fixes (BaseKey audit — P0, cross-tenant data leak): every
// handler here used to run with no organization filter at all —
// GET returned every workspace's campaigns, POST's recipient-count fallback
// counted every contact on the entire platform, and DELETE could remove any
// other workspace's campaign given just its id. All three are now scoped
// to the caller's own organization via getTenantContext().

// GET: Saare Campaigns load karne ke liye
export async function GET() {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { logs: true },
        },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("GET_CAMPAIGNS_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", details: error?.message },
      { status: 500 }
    );
  }
}

// POST: Naya Campaign banakar save karne ke liye
export async function POST(req: Request) {
  const { error, status, orgId, user } = await getTenantContext();
  if (error || !orgId || !user) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const body = await req.json();
    const {
      name,
      template,
      templateName,
      status: campaignStatus,
      audience,
      totalRecipients,
    } = body;

    // Validation: Name aur Template required hain
    if (!name || (!template && !templateName)) {
      return NextResponse.json(
        { error: "Name and Template are required" },
        { status: 400 }
      );
    }

    const contactsCount =
      totalRecipients ?? audience ?? (await prisma.contact.count({ where: { organizationId: orgId } }));

    const newCampaign = await prisma.campaign.create({
      data: {
        name,
        templateName: templateName || template || "general_announcement",
        status: (campaignStatus || "RUNNING").toUpperCase(),
        totalRecipients: Number(contactsCount),
        sentCount: 0,
        failedCount: 0,
        deliveredCount: 0,
        readCount: 0,
        authorId: user.id,
        organizationId: orgId,
      },
    });

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error: any) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      { error: "Creation failed", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE: Campaign aur uske logs ko delete karne ke liye
export async function DELETE(req: Request) {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.organizationId !== orgId) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaignLog.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: any) {
    console.error("DELETE_CAMPAIGN_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign", details: error?.message },
      { status: 500 }
    );
  }
}
