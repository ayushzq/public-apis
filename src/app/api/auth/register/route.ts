import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp, password } = await req.json();
    if (!rawEmail || !otp || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();

    // consume: false — verify-otp already validated it; the final consume happens here.
    const result = await verifyOtp(email, "register", otp, { consume: true });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // A ROOT (business-owner) account for this email may not exist yet — this is
    // what's scoped by accountType so an existing AGENT row for the same email
    // (on someone else's workspace) never blocks a fresh business signup.
    const existingRoot = await prisma.user.findFirst({ where: { email, accountType: "ROOT" } });
    if (existingRoot) {
      return NextResponse.json({ error: "Email already registered. Please login." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const org = await prisma.organization.create({ data: { name: "My Workspace" } });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: "Business Owner",
        role: "OWNER",
        accountType: "ROOT",
        organizationId: org.id,
        emailVerified: new Date(),
        allowedPages: ["/dashboard", "/chat", "/contacts", "/campaigns", "/chatbot-builder", "/template", "/settings"],
        primaryPage: "/dashboard",
        status: "ONLINE",
        currentActivity: "Registered via BaseKey Auth",
      },
    });
    await prisma.organization.update({ where: { id: org.id }, data: { ownerId: user.id } });

    return NextResponse.json({ success: true, message: "Registration successful" }, { status: 200 });
  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
