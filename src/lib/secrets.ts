/**
 * Encryption at rest for sensitive SystemSettings columns (WhatsApp accessToken,
 * openaiApiKey, claudeApiKey, geminiApiKey).
 *
 * BEFORE this file existed, these columns were stored as plain text in Postgres —
 * anyone with read access to the database (a leaked Supabase service-role key, a
 * misconfigured backup, a support engineer) could read live WhatsApp / AI credentials.
 *
 * Format stored in the DB: "enc:v1:<iv>:<authTag>:<ciphertext>" (all base64).
 * Plain values (no "enc:v1:" prefix) are treated as legacy/unencrypted and are
 * returned as-is by decrypt() so existing rows keep working until next save —
 * every write path in this app re-encrypts on save, so rows self-heal.
 */
import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept a 32-byte base64 key (openssl rand -base64 32) or a 64-char hex key.
  try {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* fall through */
  }
  return null;
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function encrypt(plain: string | null | undefined): string {
  if (!plain) return "";
  const key = getKey();
  if (!key) {
    // No key configured (e.g. local dev without APP_ENCRYPTION_KEY) — store as-is
    // rather than throwing, so the app still runs, but never silently double-encrypt.
    return plain;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decrypt(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy plain-text value
  const key = getKey();
  if (!key) {
    // Encrypted value but no key available in this environment — fail safe
    // (never leak ciphertext or silently return garbage as a "valid" token).
    return "";
  }
  try {
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return "";
  }
}

/** Masks a secret for the settings UI: shows just enough to recognise it, never the full value. */
export function maskSecret(plain: string | null | undefined): string {
  if (!plain) return "";
  if (plain.length <= 8) return "•".repeat(plain.length);
  return `${plain.slice(0, 4)}${"•".repeat(Math.max(plain.length - 8, 6))}${plain.slice(-4)}`;
}
