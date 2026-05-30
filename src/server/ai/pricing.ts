import type { AiProvider } from "@/lib/types";

type ModelPrice = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

const MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-5.4-nano": { inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.25 },
  "gpt-5.4-mini": { inputUsdPerMillion: 0.75, outputUsdPerMillion: 4.5 },
  "gpt-5.4": { inputUsdPerMillion: 2.5, outputUsdPerMillion: 15 },
  "gpt-5.5": { inputUsdPerMillion: 5, outputUsdPerMillion: 30 },
  "gpt-5": { inputUsdPerMillion: 1.25, outputUsdPerMillion: 10 },
  "gpt-5-mini": { inputUsdPerMillion: 0.25, outputUsdPerMillion: 2 },
  "gpt-5-nano": { inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.4 }
};

const DEFAULT_PRICE: ModelPrice = { inputUsdPerMillion: 1, outputUsdPerMillion: 5 };

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimatePromptTokens(messages: Array<{ content: string }>) {
  return messages.reduce((total, message) => total + estimateTokens(message.content), 0);
}

export function estimateCostMicroCents(model: string, inputTokens: number, outputTokens: number, provider: AiProvider) {
  if (provider === "fixture") return 0;
  const price = MODEL_PRICES[model] ?? DEFAULT_PRICE;
  const usd = (inputTokens / 1_000_000) * price.inputUsdPerMillion + (outputTokens / 1_000_000) * price.outputUsdPerMillion;
  return Math.max(0, Math.ceil(usd * 100_000_000));
}

export function microCentsToCents(microCents: number) {
  return Math.ceil(microCents / 1_000_000);
}

export function estimatedOutputTokensForNames(count: number) {
  return Math.max(900, count * 170);
}
