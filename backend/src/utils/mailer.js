const nodemailer = require("nodemailer");

/**
 * Two supported providers:
 *  - "smtp"   (default) uses Nodemailer with any SMTP host (Gmail, SES, etc.)
 *  - "resend" uses Resend's HTTP API (https://resend.com) — swap in the
 *             fetch call below if you prefer this over SMTP.
 *
 * Set MAIL_PROVIDER=resend and RESEND_API_KEY in .env to use Resend instead.
 */

let smtpTransport = null;

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return smtpTransport;
}

async function sendViaSmtp(to, subject, html) {
  const transport = getSmtpTransport();
  await transport.sendMail({
    from: process.env.MAIL_FROM || "WhatsApp Clone <no-reply@basekey.in>",
    to,
    subject,
    html,
  });
}

async function sendViaResend(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "WhatsApp Clone <no-reply@basekey.in>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
}

async function sendOtpEmail(to, code) {
  const subject = "Your WhatsApp Clone login code";
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;">
      <h2 style="color:#111b21;">Your login code</h2>
      <p style="color:#667781;font-size:14px;">
        Enter this code in the app to finish logging in. It expires in 5 minutes.
      </p>
      <p style="font-size:32px;font-weight:600;letter-spacing:6px;color:#00a884;margin:24px 0;">
        ${code}
      </p>
      <p style="color:#667781;font-size:12px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  if (process.env.MAIL_PROVIDER === "resend") {
    await sendViaResend(to, subject, html);
  } else {
    await sendViaSmtp(to, subject, html);
  }
}

module.exports = { sendOtpEmail };
