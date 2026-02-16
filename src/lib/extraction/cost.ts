import type { LlmUsage } from './types';

/**
 * Per-model pricing in USD per token.
 * Source: https://www.anthropic.com/pricing (as of 2025-05-14)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

const DEFAULT_PRICING = MODEL_PRICING['claude-sonnet-4-20250514'];

/**
 * Estimate the cost in USD for a given token usage.
 */
export function estimateCostUsd(usage: LlmUsage, model?: string): number {
  const pricing = (model && MODEL_PRICING[model]) || DEFAULT_PRICING;
  return usage.inputTokens * pricing.input + usage.outputTokens * pricing.output;
}
