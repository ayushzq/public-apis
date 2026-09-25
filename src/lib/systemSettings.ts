import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/secrets";
import type { SystemSettings } from "@prisma/client";

export type DecryptedSystemSettings = SystemSettings;

function withDecryptedSecrets(settings: SystemSettings): DecryptedSystemSettings {
  return {
    ...settings,
    accessToken: decrypt(settings.accessToken),
    openaiApiKey: settings.openaiApiKey ? decrypt(settings.openaiApiKey) : settings.openaiApiKey,
    claudeApiKey: settings.claudeApiKey ? decrypt(settings.claudeApiKey) : settings.claudeApiKey,
    geminiApiKey: settings.geminiApiKey ? decrypt(settings.geminiApiKey) : settings.geminiApiKey,
  };
}

/** Fetch a workspace's WhatsApp/AI settings, scoped to its own organization. */
export async function getSystemSettingsByOrg(organizationId: string): Promise<DecryptedSystemSettings | null> {
  const settings = await prisma.systemSettings.findUnique({ where: { organizationId } });
  return settings ? withDecryptedSecrets(settings) : null;
}

/**
 * Fetch the workspace that owns a given WhatsApp phoneNumberId — used by the
 * inbound webhook to route a message to the right tenant.
 *
 * Security fix (BaseKey audit — critical, multi-tenant data leak): every
 * caller of this used to fall back to `prisma.systemSettings.findFirst()`
 * with NO filter at all whenever a lookup by id/phoneNumberId came back
 * empty — which silently handed back *some other organization's* WhatsApp
 * credentials (and, in the webhook, routed their customers' messages into
 * the wrong workspace). Now: if the phoneNumberId doesn't match a
 * workspace, this returns null and callers must treat that as "unconfigured"
 * — never "use whichever settings happen to exist".
 */
export async function getSystemSettingsByPhoneNumberId(
  phoneNumberId: string | null | undefined
): Promise<DecryptedSystemSettings | null> {
  if (!phoneNumberId) return null;
  const settings = await prisma.systemSettings.findUnique({ where: { phoneNumberId } });
  return settings ? withDecryptedSecrets(settings) : null;
}
