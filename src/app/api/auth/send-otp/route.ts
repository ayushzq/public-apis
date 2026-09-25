import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp, type OtpPurpose } from "@/lib/otp";

// Security/reliability fix (BaseKey audit): Resend used to be constructed at
// module load time with `new Resend(process.env.RESEND_API_KEY)`. If that env
// var is missing at build/boot time this throws immediately and takes the
// whole route (and `next build`'s page-data collection step) down with it.
// Lazily constructing it means a missing key only fails the one send.
function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require("resend");
  return new Resend(key);
}

const getEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #1877F2; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; text-align: center; color: #111827; }
    .content p { font-size: 16px; line-height: 1.5; color: #4b5563; margin-top: 0; }
    .otp-box { background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; display: inline-block; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>BaseKey</h1></div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px;">Your Secure Verification Code</h2>
      <p>Please use the verification code below to continue with your BaseKey workspace.</p>
      <div class="otp-box">${otp}</div>
      <p style="font-size: 14px;">This code is valid for <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">Secured by BaseKey Infrastructure<br>© ${new Date().getFullYear()} BaseKey. All rights reserved.</div>
  </div>
</body>
</html>
`;

export async function POST(req: Request) {
  try {
    const { email: rawEmail, type } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();
    const purpose: OtpPurpose = type === "register" ? "register" : "forgot-password";

    const existingRoot = await prisma.user.findFirst({ where: { email, accountType: "ROOT" } });

    if (purpose === "register" && existingRoot) {
      return NextResponse.json({ error: "Email already registered. Please login." }, { status: 400 });
    }
    if (purpose === "forgot-password" && !existingRoot) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
    }

    const issued = await issueOtp(email, purpose);
    if ("error" in issued) {
      return NextResponse.json({ error: issued.error }, { status: 429 });
    }

    const emailSubject =
      purpose === "register" ? "Welcome to BaseKey - Verify your email" : "Reset your BaseKey Password";

    const resend = getResendClient();
    if (!resend) {
      console.error("send-otp: RESEND_API_KEY is not configured — cannot deliver OTP email.");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    const { error } = await resend.emails.send({
      from: "BaseKey Security <care@basekey.in>",
      to: [email],
      subject: emailSubject,
      html: getEmailTemplate(issued.code),
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("OTP API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
