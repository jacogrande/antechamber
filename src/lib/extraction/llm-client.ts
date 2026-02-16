import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient } from './types';
import { DEFAULT_MODEL } from './types';

/**
 * Create an LlmClient backed by the Anthropic SDK.
 */
export function createAnthropicClient(
  apiKey: string,
  defaultModel = DEFAULT_MODEL,
): LlmClient {
  const client = new Anthropic({ apiKey });

  return {
    async chat(system, messages, options) {
      const response = await client.messages.create({
        model: options?.model ?? defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0,
        system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('LLM response did not contain a text block');
      }
      return {
        text: textBlock.text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },

    async chatWithTools(system, messages, tools, options) {
      const response = await client.messages.create({
        model: options?.model ?? defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0,
        system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as Anthropic.Tool.InputSchema,
        })),
        tool_choice: options?.toolChoice ?? { type: 'auto' },
      });

      const toolUseBlock = response.content.find(
        (b) => b.type === 'tool_use',
      );
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
        throw new Error(
          'LLM response did not contain a tool_use block',
        );
      }

      return {
        toolName: toolUseBlock.name,
        input: toolUseBlock.input,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
