import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { encrypt, decrypt, maskSecret } from "@/lib/secrets";

// BaseKey audit fixes applied here:
//  1. `getServerSession()` (no `authOptions`) returns null inside route
//     handlers more often than not — swapped every route in this file over
//     to `getTenantContext()`, which passes `authOptions` and resolves the
//     org by the session's user id (works even though email is no longer
//     unique across ROOT/AGENT rows).
//  2. WhatsApp accessToken / AI provider keys are now encrypted at rest
//     (see src/lib/secrets.ts) and are NEVER returned to the browser in
//     plain text — GET only ever sends a masked preview plus a boolean
//     "is one saved" flag. This is also what the user asked for: the
//     Settings page should not display what was previously saved.
//  3. Only the workspace OWNER can read or change WhatsApp/AI credentials.
//     Agents (role !== OWNER) can still read the non-secret feature toggles
//     so the rest of the UI can render, but a POST from a non-owner is
//     rejected outright.
//  4. `phoneNumberId` is stored as `null` (not `""`) when unset — the schema
//     makes it `@unique`, and Postgres treats every NULL as distinct while
//     two orgs both saving `""` would collide and 500 on the second save.

function maskedSettingsPayload(settings: {
  accessToken: string;
  openaiApiKey: string | null;
  claudeApiKey: string | null;
  geminiApiKey: string | null;
  [key: string]: unknown;
}) {
  const decryptedAccessToken = decrypt(settings.accessToken);
  const decryptedOpenAi = decrypt(settings.openaiApiKey);
  const decryptedClaude = decrypt(settings.claudeApiKey);
  const decryptedGemini = decrypt(settings.geminiApiKey);

  return {
    ...settings,
    accessToken: undefined,
    openaiApiKey: undefined,
    claudeApiKey: undefined,
    geminiApiKey: undefined,
    hasAccessToken: !!decryptedAccessToken,
    accessTokenPreview: maskSecret(decryptedAccessToken),
    hasOpenaiApiKey: !!decryptedOpenAi,
    openaiApiKeyPreview: maskSecret(decryptedOpenAi),
    hasClaudeApiKey: !!decryptedClaude,
    claudeApiKeyPreview: maskSecret(decryptedClaude),
    hasGeminiApiKey: !!decryptedGemini,
    geminiApiKeyPreview: maskSecret(decryptedGemini),
  };
}

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (ctx.error || !ctx.orgId || !ctx.user) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const settings = await prisma.systemSettings.findUnique({ where: { organizationId: ctx.orgId } });
    if (!settings) return NextResponse.json({});

    if (ctx.user.role !== "OWNER") {
      // Agents get feature flags / non-secret display prefs only.
      return NextResponse.json({
        darkModeDefault: settings.darkModeDefault,
        featureCampaigns: settings.featureCampaigns,
        featureChatbotBuilder: settings.featureChatbotBuilder,
        featureDeveloperApi: settings.featureDeveloperApi,
        featureTeamPresence: settings.featureTeamPresence,
      });
    }

    return NextResponse.json(maskedSettingsPayload(settings));
  } catch (error) {
    console.error("[Config GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (ctx.error || !ctx.orgId || !ctx.user) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    if (ctx.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only the workspace owner can change these settings." }, { status: 403 });
    }

    const body = await req.json();
    const {
      accessToken,
      phoneNumberId,
      businessAccountId,
      isAiBotActive,
      geminiSystemPrompt,
      aiProvider,
      openaiApiKey,
      claudeApiKey,
      geminiApiKey,
      darkModeDefault,
      featureCampaigns,
      featureChatbotBuilder,
      featureDeveloperApi,
      featureTeamPresence,
    } = body;

    const patch: Record<string, unknown> = {};
    const setIfDefined = (key: string, value: unknown) => {
      if (value !== undefined) patch[key] = value;
    };

    // Empty-string means "leave the currently-saved secret untouched" (the
    // settings page never round-trips the real value back into the input),
    // so only overwrite when the field is a genuinely new, non-empty value.
    if (typeof accessToken === "string" && accessToken.length > 0) patch.accessToken = encrypt(accessToken);
    if (typeof openaiApiKey === "string" && openaiApiKey.length > 0) patch.openaiApiKey = encrypt(openaiApiKey);
    if (typeof claudeApiKey === "string" && claudeApiKey.length > 0) patch.claudeApiKey = encrypt(claudeApiKey);
    if (typeof geminiApiKey === "string" && geminiApiKey.length > 0) patch.geminiApiKey = encrypt(geminiApiKey);

    setIfDefined("phoneNumberId", phoneNumberId ? phoneNumberId : null);
    setIfDefined("businessAccountId", businessAccountId);
    setIfDefined("isAiBotActive", isAiBotActive);
    setIfDefined("geminiSystemPrompt", geminiSystemPrompt);
    setIfDefined("aiProvider", aiProvider);
    setIfDefined("darkModeDefault", darkModeDefault);
    setIfDefined("featureCampaigns", featureCampaigns);
    setIfDefined("featureChatbotBuilder", featureChatbotBuilder);
    setIfDefined("featureDeveloperApi", featureDeveloperApi);
    setIfDefined("featureTeamPresence", featureTeamPresence);

    const settings = await prisma.systemSettings.upsert({
      where: { organizationId: ctx.orgId },
      update: patch,
      create: {
        organizationId: ctx.orgId,
        accessToken: accessToken ? encrypt(accessToken) : "",
        phoneNumberId: phoneNumberId ? phoneNumberId : null,
        businessAccountId: businessAccountId ?? "",
        verifyToken: crypto.randomUUID(),
        isAiBotActive: isAiBotActive ?? false,
        geminiSystemPrompt: geminiSystemPrompt ?? undefined,
        aiProvider: aiProvider ?? "gemini",
        openaiApiKey: openaiApiKey ? encrypt(openaiApiKey) : null,
        claudeApiKey: claudeApiKey ? encrypt(claudeApiKey) : null,
        geminiApiKey: geminiApiKey ? encrypt(geminiApiKey) : null,
        darkModeDefault: darkModeDefault ?? false,
        featureCampaigns: featureCampaigns ?? true,
        featureChatbotBuilder: featureChatbotBuilder ?? true,
        featureDeveloperApi: featureDeveloperApi ?? true,
        featureTeamPresence: featureTeamPresence ?? true,
      },
    });

    return NextResponse.json({ success: true, settings: maskedSettingsPayload(settings) });
  } catch (error) {
    console.error("[Config POST Error]:", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
