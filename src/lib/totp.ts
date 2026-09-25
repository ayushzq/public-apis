import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface TotpChallengeResult {
  challengeId: string;
  expiresInSeconds: number;
  code?: string;
}

// Fixed to match the current OtpCode schema (hashed code, one row per
// (email, purpose) rather than the old (email, code) unique pair) and to use
// crypto.randomInt (CSPRNG) instead of Math.random() for the actual code.
// `email` here holds the mobile userId being challenged — kept as-is since
// this legacy 2FA challenge flow is keyed by user id, not a real email.
const TOTP_PURPOSE = "mobile-2fa";

function hashCode(subject: string, code: string): string {
  return crypto.createHash("sha256").update(`${TOTP_PURPOSE}:${subject}:${code}`).digest("hex");
}

export async function sendTotpCode(
  userId: string,
  phone?: string | null
): Promise<TotpChallengeResult> {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresInSeconds = 600; // 10 minutes
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const otp = await prisma.otpCode.upsert({
    where: { email_purpose: { email: userId, purpose: TOTP_PURPOSE } },
    update: { codeHash: hashCode(userId, code), attempts: 0, expiresAt, createdAt: new Date() },
    create: { email: userId, purpose: TOTP_PURPOSE, codeHash: hashCode(userId, code), expiresAt },
  });

  console.log(`[2FA OTP] Challenge issued for user ${userId} (${phone || "no-phone"})`);

  return {
    challengeId: otp.id,
    expiresInSeconds,
    code,
  };
}

export async function verifyTotpCode(
  challengeIdOrUserId: string,
  code: string
): Promise<{ valid: boolean; userId?: string }> {
  const record = await prisma.otpCode.findFirst({
    where: {
      OR: [{ id: challengeIdOrUserId }, { email: challengeIdOrUserId, purpose: TOTP_PURPOSE }],
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return { valid: false };

  const candidateHash = hashCode(record.email, code);
  const matches =
    candidateHash.length === record.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(record.codeHash));

  if (!matches) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } }).catch(() => {});
    return { valid: false };
  }

  await prisma.otpCode.delete({ where: { id: record.id } }).catch(() => {});
  return { valid: true, userId: record.email };
}

// Aliases
export const generateTotp = sendTotpCode;
export const verifyTotp = verifyTotpCode;

export default { sendTotpCode, verifyTotpCode, generateTotp, verifyTotp };
