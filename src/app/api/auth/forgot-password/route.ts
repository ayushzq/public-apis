import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require("resend");
  return new Resend(key);
}

const getResetEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #111827; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; text-align: center; color: #111827; }
    .content p { font-size: 16px; line-height: 1.5; color: #4b5563; margin-top: 0; margin-bottom: 24px; }
    .otp-box { background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; display: inline-block; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>BaseKey</h1></div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px;">Reset Your Password</h2>
      <p>We received a request to reset your password for your BaseKey account. Use the code below to continue.</p>
      <div class="otp-box">${otp}</div>
      <p style="font-size: 14px; margin-top: 24px; margin-bottom: 0;">This code is valid for <strong>5 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">Secured by BaseKey Infrastructure<br>© ${new Date().getFullYear()} BaseKey. All rights reserved.</div>
  </div>
</body>
</html>
`;

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase();

    const user = await prisma.user.findFirst({ where: { email, accountType: "ROOT" } });

    // Security practice (kept from the original): always return the same
    // success message whether or not the account exists, so this endpoint
    // can't be used to enumerate registered emails.
    const generic = { success: true, message: "If an account exists, a reset code has been sent." };
    if (!user) return NextResponse.json(generic, { status: 200 });

    const issued = await issueOtp(email, "forgot-password");
    if ("error" in issued) {
      // Still return the generic message to avoid leaking timing/enumeration info,
      // but log server-side so genuine rate-limit abuse is visible in logs.
      console.warn("forgot-password: OTP re-issue throttled for", email);
      return NextResponse.json(generic, { status: 200 });
    }

    const resend = getResendClient();
    if (!resend) {
      console.error("forgot-password: RESEND_API_KEY is not configured — cannot deliver reset code.");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    const { error } = await resend.emails.send({
      from: "BaseKey Support <support@basekey.in>",
      to: [email],
      subject: "Reset your BaseKey Password",
      html: getResetEmailTemplate(issued.code),
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
    }

    return NextResponse.json(generic, { status: 200 });
  } catch (error) {
    console.error("Forgot Password API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
