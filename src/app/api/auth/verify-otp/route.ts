import { NextResponse } from "next/server";
import { verifyOtp, type OtpPurpose } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email, otp, type } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }
    const purpose: OtpPurpose = type === "register" ? "register" : "forgot-password";

    // consume:false — this endpoint is a "does this code look right" pre-check
    // before the user sets a new password; register/reset-password consume it
    // for real afterwards. Keeping it alive lets the user retry the next step
    // without re-requesting a code if they navigate back.
    const result = await verifyOtp(email, purpose, otp, { consume: false });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "OTP Verified!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
