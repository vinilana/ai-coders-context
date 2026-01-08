import { generateText, generateObject, stepCountIs } from 'ai';
import type { ModelMessage, Tool, ToolSet } from 'ai';
import type { z } from 'zod';
import { BaseLLMClient } from '../baseLLMClient';
import { createProvider, type ProviderResult } from './providerFactory';
import type { LLMConfig } from '../../types';

export class AISdkClient extends BaseLLMClient {
  private providerResult: ProviderResult;
  private config: LLMConfig;
  private tools: ToolSet = {};

  constructor(config: LLMConfig) {
    super(config.model);
    this.config = config;
    this.providerResult = createProvider(config);
  }

  /**
   * Sets the tools available for tool-enabled generation
   */
  setTools(tools: ToolSet): void {
    this.tools = tools;
  }

  /**
   * Gets the configured tools
   */
  getTools(): ToolSet {
    return this.tools;
  }

  /**
   * Basic text generation (compatible with BaseLLMClient interface)
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ModelMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const { provider, modelId } = this.providerResult;

    const result = await generateText({
      model: provider(modelId),
      messages,
      maxOutputTokens: 4000,
      temperature: 0.7
    });

    this.trackUsage({
      prompt_tokens: result.usage?.inputTokens || 0,
      completion_tokens: result.usage?.outputTokens || 0,
      total_tokens: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)
    });

    return result.text;
  }

  /**
   * Text generation with tool usage enabled
   */
  async generateWithTools(
    prompt: string,
    systemPrompt?: string,
    options?: {
      enabledTools?: string[];
      maxSteps?: number;
      maxOutputTokens?: number;
    }
  ): Promise<{
    text: string;
    toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
    steps: number;
  }> {
    const { enabledTools, maxSteps = 10, maxOutputTokens = 8000 } = options || {};

    const activeTools = enabledTools
      ? Object.fromEntries(
          Object.entries(this.tools).filter(([name]) => enabledTools.includes(name))
        )
      : this.tools;

    const messages: ModelMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const { provider, modelId } = this.providerResult;

    const result = await generateText({
      model: provider(modelId),
      messages,
      tools: activeTools,
      maxOutputTokens,
      stopWhen: stepCountIs(maxSteps)
    });

    this.trackUsage({
      prompt_tokens: result.usage?.inputTokens || 0,
      completion_tokens: result.usage?.outputTokens || 0,
      total_tokens: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)
    });

    // Extract tool calls from all steps
    const toolCalls: Array<{ toolName: string; args: unknown; result: unknown }> = [];
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        const toolResult = step.toolResults?.find(
          (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
        );
        toolCalls.push({
          toolName: toolCall.toolName,
          args: 'args' in toolCall ? toolCall.args : undefined,
          result: toolResult && 'result' in toolResult ? toolResult.result : undefined
        });
      }
    }

    return {
      text: result.text,
      toolCalls,
      steps: result.steps?.length || 1
    };
  }

  /**
   * Generate structured output conforming to a Zod schema
   */
  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    options?: {
      maxOutputTokens?: number;
    }
  ): Promise<T> {
    const { maxOutputTokens = 4000 } = options || {};
    const { provider, modelId } = this.providerResult;

    const result = await generateObject({
      model: provider(modelId),
      schema,
      system: systemPrompt,
      prompt,
      maxOutputTokens
    });

    this.trackUsage({
      prompt_tokens: result.usage?.inputTokens || 0,
      completion_tokens: result.usage?.outputTokens || 0,
      total_tokens: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)
    });

    return result.object;
  }

  /**
   * Generate text with tools and then produce structured output
   */
  async generateWithToolsAndStructure<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    options?: {
      enabledTools?: string[];
      maxSteps?: number;
      maxOutputTokens?: number;
    }
  ): Promise<{
    object: T;
    toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
  }> {
    // First, gather context using tools
    const toolResult = await this.generateWithTools(prompt, systemPrompt, {
      ...options,
      maxOutputTokens: (options?.maxOutputTokens || 8000) / 2
    });

    // Then generate structured output based on the analysis
    const structuredPrompt = `Based on this analysis:\n\n${toolResult.text}\n\nGenerate the structured output.`;
    const object = await this.generateStructured(structuredPrompt, schema, systemPrompt, {
      maxOutputTokens: (options?.maxOutputTokens || 8000) / 2
    });

    return {
      object,
      toolCalls: toolResult.toolCalls
    };
  }

  /**
   * Get the current provider configuration
   */
  getProviderConfig(): { provider: string; model: string } {
    return {
      provider: this.config.provider,
      model: this.providerResult.modelId
    };
  }
}
