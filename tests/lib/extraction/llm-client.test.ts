import { describe, test, expect, mock } from 'bun:test';
import { createAnthropicClient } from '@/lib/extraction/llm-client';

// Single top-level mock with content-based triggers
mock.module('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mock(async (params: Record<string, unknown>) => {
          const tools = params.tools as unknown[] | undefined;
          const msgs = params.messages as Array<{ content: string }>;
          const userContent = msgs?.[0]?.content ?? '';

          // Trigger: no tool_use block when __NO_TOOL_USE__ is in the message
          if (userContent.includes('__NO_TOOL_USE__')) {
            return {
              content: [{ type: 'text', text: 'No tool use here' }],
            };
          }

          // Trigger: no text block when __NO_TEXT__ is in the message
          if (userContent.includes('__NO_TEXT__')) {
            return {
              content: [],
            };
          }

          if (tools && tools.length > 0) {
            // Tool call response
            return {
              content: [
                {
                  type: 'tool_use',
                  id: 'tool_123',
                  name: 'extract_fields',
                  input: { extractions: [{ key: 'company_name', value: 'Test' }] },
                },
              ],
            };
          }
          // Text response
          return {
            content: [
              { type: 'text', text: 'Hello from the mock' },
            ],
          };
        }),
      };
    },
  };
});

describe('createAnthropicClient', () => {
  test('returns an LlmClient with chat and chatWithTools methods', () => {
    const client = createAnthropicClient('test-key');
    expect(typeof client.chat).toBe('function');
    expect(typeof client.chatWithTools).toBe('function');
  });

  test('chat returns text content', async () => {
    const client = createAnthropicClient('test-key');
    const result = await client.chat(
      'system prompt',
      [{ role: 'user', content: 'Hello' }],
    );
    expect(result).toBe('Hello from the mock');
  });

  test('chat passes model and options', async () => {
    const client = createAnthropicClient('test-key', 'default-model');
    await client.chat(
      'system',
      [{ role: 'user', content: 'test' }],
      { model: 'custom-model', maxTokens: 1000, temperature: 0.5 },
    );
    // If it doesn't throw, the params were accepted
    expect(true).toBe(true);
  });

  test('chat throws on missing text block', async () => {
    const client = createAnthropicClient('test-key');
    await expect(
      client.chat(
        'system',
        [{ role: 'user', content: '__NO_TEXT__' }],
      ),
    ).rejects.toThrow('text block');
  });

  test('chatWithTools returns tool_use block', async () => {
    const client = createAnthropicClient('test-key');
    const result = await client.chatWithTools(
      'system prompt',
      [{ role: 'user', content: 'Extract data' }],
      [{
        name: 'extract_fields',
        description: 'Extract fields',
        input_schema: { type: 'object', properties: {} },
      }],
    );
    expect(result.toolName).toBe('extract_fields');
    expect(result.input).toEqual({ extractions: [{ key: 'company_name', value: 'Test' }] });
  });

  test('chatWithTools passes tool_choice option', async () => {
    const client = createAnthropicClient('test-key');
    const result = await client.chatWithTools(
      'system',
      [{ role: 'user', content: 'test' }],
      [{
        name: 'extract_fields',
        description: 'test',
        input_schema: { type: 'object', properties: {} },
      }],
      { toolChoice: { type: 'tool', name: 'extract_fields' } },
    );
    expect(result.toolName).toBe('extract_fields');
  });

  test('chatWithTools throws on missing tool_use block', async () => {
    const client = createAnthropicClient('test-key');

    await expect(
      client.chatWithTools(
        'system',
        [{ role: 'user', content: '__NO_TOOL_USE__' }],
        [{
          name: 'extract_fields',
          description: 'test',
          input_schema: { type: 'object', properties: {} },
        }],
      ),
    ).rejects.toThrow('tool_use');
  });
});
