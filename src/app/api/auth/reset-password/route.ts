import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp, newPassword } = await req.json();
    if (!rawEmail || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();

    const result = await verifyOtp(email, "forgot-password", otp, { consume: true });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email, accountType: "ROOT" } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword, failedLogins: 0, lockedUntil: null },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
