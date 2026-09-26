import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { encrypt, decrypt, maskSecret } from "@/lib/secrets";

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
      verifyToken,
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

    if (typeof accessToken === "string" && accessToken.trim().length > 0) {
      patch.accessToken = encrypt(accessToken.trim());
    }
    if (typeof openaiApiKey === "string" && openaiApiKey.trim().length > 0) {
      patch.openaiApiKey = encrypt(openaiApiKey.trim());
    }
    if (typeof claudeApiKey === "string" && claudeApiKey.trim().length > 0) {
      patch.claudeApiKey = encrypt(claudeApiKey.trim());
    }
    if (typeof geminiApiKey === "string" && geminiApiKey.trim().length > 0) {
      patch.geminiApiKey = encrypt(geminiApiKey.trim());
    }

    setIfDefined("phoneNumberId", phoneNumberId ? phoneNumberId : null);
    setIfDefined("businessAccountId", businessAccountId);
    if (verifyToken) setIfDefined("verifyToken", verifyToken);
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
        accessToken: accessToken ? encrypt(accessToken.trim()) : "",
        phoneNumberId: phoneNumberId ? phoneNumberId : null,
        businessAccountId: businessAccountId ?? "",
        verifyToken: verifyToken || crypto.randomUUID(),
        isAiBotActive: isAiBotActive ?? false,
        geminiSystemPrompt: geminiSystemPrompt ?? undefined,
        aiProvider: aiProvider ?? "gemini",
        openaiApiKey: openaiApiKey ? encrypt(openaiApiKey.trim()) : null,
        claudeApiKey: claudeApiKey ? encrypt(claudeApiKey.trim()) : null,
        geminiApiKey: geminiApiKey ? encrypt(geminiApiKey.trim()) : null,
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
