import OpenAI from "openai";
import { env, primaryAiProvider } from "@/env";
import type { AiProvider } from "@/lib/types";
import { estimateCostMicroCents, estimatePromptTokens, estimatedOutputTokensForNames } from "@/server/ai/pricing";

type Message = {
  role: "system" | "user";
  content: string;
};

export type StructuredJsonRequest = {
  task: "naming_generation";
  model: string;
  promptVersion: string;
  messages: Message[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
};

export type StructuredJsonResult = {
  provider: AiProvider;
  model: string;
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicroCents: number;
};

function extractUsage(value: unknown) {
  const usage = (value as { usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number } }).usage;
  return {
    inputTokens: usage?.input_tokens ?? usage?.prompt_tokens,
    outputTokens: usage?.output_tokens ?? usage?.completion_tokens
  };
}

function fallbackProviderOrder() {
  const order: AiProvider[] = [];
  if (primaryAiProvider !== "fixture") order.push(primaryAiProvider);
  if (env.AI_FALLBACK_PROVIDER !== "none" && env.AI_FALLBACK_PROVIDER !== primaryAiProvider) order.push(env.AI_FALLBACK_PROVIDER);
  order.push("fixture");
  return Array.from(new Set(order));
}

function providerConfigured(provider: AiProvider) {
  if (provider === "fixture") return true;
  if (provider === "openai") return Boolean(env.OPENAI_API_KEY);
  if (provider === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
  return false;
}

async function callOpenAi(request: StructuredJsonRequest): Promise<StructuredJsonResult> {
  if (!env.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured.");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: request.model,
    input: request.messages,
    max_output_tokens: request.maxOutputTokens,
    text: {
      format: {
        type: "json_schema",
        name: request.schemaName,
        schema: request.schema,
        strict: true
      }
    }
  } as never);
  const outputText = (response as { output_text?: string }).output_text ?? "";
  const usage = extractUsage(response);
  const inputTokens = usage.inputTokens ?? estimatePromptTokens(request.messages);
  const outputTokens = usage.outputTokens ?? Math.max(1, estimatePromptTokens([{ content: outputText }]));
  return {
    provider: "openai",
    model: request.model,
    outputText,
    inputTokens,
    outputTokens,
    estimatedCostMicroCents: estimateCostMicroCents(request.model, inputTokens, outputTokens, "openai")
  };
}

async function callOpenRouter(request: StructuredJsonRequest): Promise<StructuredJsonResult> {
  if (!env.OPENROUTER_API_KEY) throw new Error("OpenRouter API key is not configured.");
  const model = env.OPENROUTER_NAMING_MODEL ?? request.model;
  const client = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      "X-Title": "Namelift"
    }
  });
  const response = await client.chat.completions.create({
    model,
    messages: request.messages,
    max_tokens: request.maxOutputTokens,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: request.schema
      }
    }
  } as never);
  const outputText = response.choices[0]?.message?.content ?? "";
  const usage = extractUsage(response);
  const inputTokens = usage.inputTokens ?? estimatePromptTokens(request.messages);
  const outputTokens = usage.outputTokens ?? Math.max(1, estimatePromptTokens([{ content: outputText }]));
  return {
    provider: "openrouter",
    model,
    outputText,
    inputTokens,
    outputTokens,
    estimatedCostMicroCents: estimateCostMicroCents(model, inputTokens, outputTokens, "openrouter")
  };
}

export function estimateStructuredJsonRequestCost(request: Pick<StructuredJsonRequest, "messages" | "model"> & { count: number }) {
  return estimateCostMicroCents(
    request.model,
    estimatePromptTokens(request.messages),
    estimatedOutputTokensForNames(request.count),
    primaryAiProvider === "fixture" ? "fixture" : primaryAiProvider
  );
}

export async function requestStructuredJson(request: StructuredJsonRequest): Promise<StructuredJsonResult> {
  let lastError: Error | null = null;
  for (const provider of fallbackProviderOrder()) {
    if (!providerConfigured(provider)) continue;
    try {
      if (provider === "openai") return await callOpenAi(request);
      if (provider === "openrouter") return await callOpenRouter(request);
      throw new Error("Fixture provider does not call a model.");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (provider === "fixture") throw lastError;
    }
  }
  throw lastError ?? new Error("No AI provider is configured.");
}
