import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db as prisma } from "@/prisma/lib/db";
import { getTenantContext } from "@/lib/tenant";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require("resend");
  return new Resend(key);
}

const VALID_PAGES = [
  "/dashboard",
  "/chat",
  "/contacts",
  "/campaigns",
  "/chatbot-builder",
  "/template",
  "/settings",
];

// Only the workspace owner/admin ("root" user) is allowed to manage team access.
function assertCanManageTeam(requester: { role: string } | null | undefined) {
  return requester?.role === "OWNER" || requester?.role === "ADMIN";
}

function inviteEmailTemplate(name: string, link: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #0073bb; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; text-align: center; color: #111827; }
    .content p { font-size: 15px; line-height: 1.6; color: #4b5563; margin-top: 0; }
    .btn { display: inline-block; background-color: #0073bb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 20px 0; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>BaseKey</h1></div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px;">You've been added to a BaseKey workspace</h2>
      <p>Hi ${name || "there"}, your workspace administrator has created an account for you. Click below to verify your email and activate access.</p>
      <a class="btn" href="${link}">Activate My Account</a>
      <p style="font-size: 13px;">This link is valid for 24 hours. If you weren't expecting this, you can ignore this email.</p>
    </div>
    <div class="footer">Secured by BaseKey Infrastructure<br>© ${new Date().getFullYear()} BaseKey. All rights reserved.</div>
  </div>
</body>
</html>`;
}

export async function GET() {
  const { error, status, orgId } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        currentActivity: true,
        lastSeen: true,
        image: true,
        emailVerified: true,
        allowedPages: true,
        primaryPage: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// Root/Admin creates a new restricted "agent" login (or another admin).
export async function POST(req: Request) {
  const { error, status, orgId, user: requester } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  if (!assertCanManageTeam(requester)) {
    return NextResponse.json({ error: "Only the workspace owner or an admin can add team members" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const role = body.role === "ADMIN" ? "ADMIN" : "AGENT"; // never allow creating another OWNER via this route
    const allowedPages: string[] = Array.isArray(body.allowedPages)
      ? body.allowedPages.filter((p: string) => VALID_PAGES.includes(p))
      : [];
    const image = typeof body.image === "string" ? body.image : null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (allowedPages.length === 0) {
      return NextResponse.json({ error: "Select at least one page this user can access" }, { status: 400 });
    }

    const primaryPage = allowedPages.includes(body.primaryPage) ? body.primaryPage : allowedPages[0];

    const existing = await prisma.user.findFirst({ where: { email, accountType: "AGENT" } });
    if (existing) {
      return NextResponse.json({ error: "A team-member account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        accountType: "AGENT",
        allowedPages,
        primaryPage,
        image,
        organizationId: orgId,
        status: "OFFLINE",
        currentActivity: "Invited — pending verification",
        emailVerified: null, // must click the emailed link before they can log in
      },
    });

    // Reuse NextAuth's VerificationToken table — the existing /verify/[token] page
    // marks emailVerified + flips status to ONLINE when the link is opened.
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://basekey.in";
    const verifyLink = `${baseUrl.replace(/\/$/, "")}/verify/${token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = getResendClient();
      const { error: emailError } = await resend.emails.send({
        from: "BaseKey Security <care@basekey.in>",
        to: [email],
        subject: "You've been invited to a BaseKey workspace",
        html: inviteEmailTemplate(name, verifyLink),
      });
      if (emailError) {
        console.error("Resend invite email error:", emailError);
        // Don't fail the whole request — the account exists, just flag the mail issue.
        return NextResponse.json(
          { ...newUser, passwordHash: undefined, warning: "User created, but the invite email failed to send." },
          { status: 201 }
        );
      }
    } else {
      console.warn("RESEND_API_KEY missing — skipping invite email. Verify link:", verifyLink);
    }

    return NextResponse.json({ ...newUser, passwordHash: undefined }, { status: 201 });
  } catch (err: any) {
    console.error("Team POST error:", err);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}

// Root/Admin edits an existing member's role / page access / profile.
export async function PUT(req: Request) {
  const { error, status, orgId, user: requester } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  if (!assertCanManageTeam(requester)) {
    return NextResponse.json({ error: "Only the workspace owner or an admin can edit team members" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.organizationId !== orgId) {
      return NextResponse.json({ error: "User not found in this workspace" }, { status: 404 });
    }
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "The workspace owner's access cannot be edited here" }, { status: 403 });
    }

    const data: Record<string, any> = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (body.role === "ADMIN" || body.role === "AGENT") data.role = body.role;
    if (typeof body.image === "string") data.image = body.image;

    if (Array.isArray(body.allowedPages)) {
      const pages = body.allowedPages.filter((p: string) => VALID_PAGES.includes(p));
      if (pages.length === 0) {
        return NextResponse.json({ error: "Select at least one page this user can access" }, { status: 400 });
      }
      data.allowedPages = pages;
      data.primaryPage = pages.includes(body.primaryPage) ? body.primaryPage : pages[0];
    } else if (typeof body.primaryPage === "string") {
      data.primaryPage = body.primaryPage;
    }

    const updated = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ...updated, passwordHash: undefined });
  } catch (err: any) {
    console.error("Team PUT error:", err);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

// Root/Admin revokes a member's access entirely.
export async function DELETE(req: Request) {
  const { error, status, orgId, user: requester } = await getTenantContext();
  if (error || !orgId) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  if (!assertCanManageTeam(requester)) {
    return NextResponse.json({ error: "Only the workspace owner or an admin can remove team members" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    if (id === requester?.id) {
      return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.organizationId !== orgId) {
      return NextResponse.json({ error: "User not found in this workspace" }, { status: 404 });
    }
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "The workspace owner cannot be removed" }, { status: 403 });
    }

    // Free up anything this agent was assigned before deleting, so the delete
    // never fails on a foreign-key constraint from assigned contacts.
    await prisma.contact.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Team DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 });
  }
}
