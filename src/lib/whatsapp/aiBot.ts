// lib/whatsapp/aiBot.ts
//
// 🔀 Multi-AI Provider routing. Previously hard-locked to Gemini with no
// way to switch. `SystemSettings.aiProvider` picks the provider; each
// provider reads its own API key from SystemSettings (falling back to an
// env var of the same purpose so existing Gemini-only deployments keep
// working without extra setup).
import { sendWhatsAppMessage } from "./sender";

const FALLBACK_PROMPT =
  "You are a helpful, concise WhatsApp Business support assistant. Keep replies short (2-3 sentences) and friendly.";

export type AiProvider = "gemini" | "openai" | "claude";

interface AiBotSettings {
  aiProvider?: string | null;
  geminiSystemPrompt?: string | null;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
}

// 🟢 NAYA FUNCTION: Google API se auto-model select karne ke liye
async function getBestGeminiModel(apiKey: string) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (!data.models) return "gemini-1.5-flash-latest"; // Fallback

    // 1. Sirf wo model filter karo jo Chat (generateContent) support karte hain
    const chatModels = data.models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") && 
      m.name.includes("gemini")
    );

    // 2. Unme se sabse chhota aur tez ('flash' wala) model dhundo
    const bestModel = chatModels.find((m: any) => m.name.includes("flash")) || chatModels[0];

    if (bestModel) {
      // Google naam 'models/gemini-1.5-flash' format me deta hai, 'models/' hatana hai
      const finalModelName = bestModel.name.replace("models/", "");
      console.log(`🤖 Auto-Selected Gemini Model: ${finalModelName}`);
      return finalModelName;
    }

    return "gemini-1.5-flash-latest";
  } catch (error) {
    console.error("Failed to fetch models, using safe fallback:", error);
    return "gemini-1.5-flash-latest";
  }
}

// 🟢 UPDATE KIYA GAYA FUNCTION
async function replyWithGemini(prompt: string, systemPrompt: string, apiKey: string) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  
  // Hardcode hatakar dynamic model laya gaya
  const dynamicModelName = await getBestGeminiModel(apiKey);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: dynamicModelName, systemInstruction: systemPrompt });
  const result = await model.generateContent(prompt);
  return result.response.text()?.trim();
}

async function replyWithOpenAi(prompt: string, systemPrompt: string, apiKey: string) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 300,
  });
  return completion.choices[0]?.message?.content?.trim();
}

async function replyWithClaude(prompt: string, systemPrompt: string, apiKey: string) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  return block?.type === "text" ? block.text.trim() : undefined;
}

export async function runAiBotReply(
  phoneId: string,
  to: string,
  incomingText: string,
  settings: AiBotSettings
) {
  const provider = (settings.aiProvider || "gemini") as AiProvider;
  const systemPrompt = settings.geminiSystemPrompt?.trim() || FALLBACK_PROMPT;

  try {
    let replyText: string | undefined;

    switch (provider) {
      case "openai": {
        const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) return console.error("🤖 AI Bot: OpenAI selected but no API key configured.");
        replyText = await replyWithOpenAi(incomingText, systemPrompt, apiKey);
        break;
      }
      case "claude": {
        const apiKey = settings.claudeApiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return console.error("🤖 AI Bot: Claude selected but no API key configured.");
        replyText = await replyWithClaude(incomingText, systemPrompt, apiKey);
        break;
      }
      case "gemini":
      default: {
        const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) return console.error("🤖 AI Bot: Gemini selected but no API key configured.");
        replyText = await replyWithGemini(incomingText, systemPrompt, apiKey);
        break;
      }
    }

    if (!replyText) {
      console.error(`🤖 AI Bot: ${provider} returned an empty response.`);
      return;
    }

    await sendWhatsAppMessage(phoneId, to, { type: "text", text: { body: replyText } });
  } catch (error) {
    console.error(`🤖 AI Bot (${provider}) error:`, error);
  }
}
