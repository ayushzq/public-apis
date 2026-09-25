/**
 * Central OTP handling. Replaces the old per-route logic that stored the raw
 * 6-digit code in the DB with `Math.random()` and no attempt limit — any code
 * value including this file's OtpCode table could be read (via a DB leak) and
 * reused, and codes could be brute-forced (only 1,000,000 possibilities, no
 * lockout).
 *
 * Now: only a SHA-256 hash of the code is stored, one row per (email, purpose),
 * and a wrong guess is capped at 5 attempts before the code is invalidated.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type OtpPurpose = "register" | "login" | "forgot-password" | "agent-invite";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45 * 1000; // don't let the send-otp route be used as a mail bomb

function hashCode(email: string, purpose: string, code: string): string {
  // Salting with email+purpose means a leaked hash can't be replayed for a
  // different account/purpose even if two users happened to get the same code.
  return crypto.createHash("sha256").update(`${email.toLowerCase()}:${purpose}:${code}`).digest("hex");
}

export async function issueOtp(email: string, purpose: OtpPurpose): Promise<{ code: string } | { error: string }> {
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.otpCode.findUnique({
    where: { email_purpose: { email: normalizedEmail, purpose } },
  });

  if (existing && Date.now() - new Date(existing.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    return { error: "Please wait a few seconds before requesting another code." };
  }

  const code = crypto.randomInt(100000, 1000000).toString(); // crypto-secure, not Math.random()
  const codeHash = hashCode(normalizedEmail, purpose, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpCode.upsert({
    where: { email_purpose: { email: normalizedEmail, purpose } },
    update: { codeHash, attempts: 0, expiresAt, createdAt: new Date() },
    create: { email: normalizedEmail, purpose, codeHash, expiresAt },
  });

  return { code };
}

export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
  opts: { consume?: boolean } = { consume: true }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.toLowerCase();
  const row = await prisma.otpCode.findUnique({
    where: { email_purpose: { email: normalizedEmail, purpose } },
  });

  if (!row) return { ok: false, error: "No verification code was requested for this email." };

  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  if (row.expiresAt < new Date()) {
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, error: "This code has expired. Please request a new one." };
  }

  const candidateHash = hashCode(normalizedEmail, purpose, code);
  // Constant-time comparison so response timing can't leak how many hex chars matched.
  const matches =
    candidateHash.length === row.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(row.codeHash));

  if (!matches) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code." };
  }

  if (opts.consume !== false) {
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => {});
  }
  return { ok: true };
}
