import { GoogleGenAI } from '@google/genai';
import { LLMConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class GeminiClient extends BaseLLMClient {
  private client: GoogleGenAI;
  private model: string;

  constructor(config: LLMConfig) {
    super(config.model);
    this.model = config.model;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const fullPrompt = systemPrompt 
        ? `System: ${systemPrompt}\n\nUser: ${prompt}`
        : prompt;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: fullPrompt
      });

      const text = response.text || '';

      // Google AI doesn't provide detailed usage stats in the free tier
      // We'll estimate based on content length
      const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(text.length / 4);
      
      this.trackUsage({
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: estimatedPromptTokens + estimatedCompletionTokens
      }, this.calculateGeminiCost.bind(this));

      return text;
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateGeminiCost(promptTokens: number, completionTokens: number): number {
    // Google AI pricing (as of 2024) - per 1M tokens
    const prices: { [key: string]: { input: number; output: number } } = {
      'gemini-pro': { input: 0.5, output: 1.5 },
      'gemini-1.5-pro': { input: 3.5, output: 10.5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
      'gemini-2.0-flash-001': { input: 0.075, output: 0.3 }
    };

    const pricing = prices[this.model] || prices['gemini-pro']; // fallback
    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

  async generateDocumentation(
    codeContent: string,
    filePath: string,
    context: string
  ): Promise<string> {
    const systemPrompt = `You are a technical documentation expert. Generate clear, comprehensive documentation for the provided code file. Include:
    1. Purpose and overview
    2. Key components/functions
    3. Dependencies and relationships
    4. Usage examples where applicable
    5. Important notes or gotchas
    
    Focus on being practical and helpful for developers working with this codebase.`;

    const prompt = `File: ${filePath}
    
Context: ${context}

Code:
\`\`\`
${codeContent}
\`\`\`

Generate comprehensive documentation for this file.`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateAgentPrompt(
    repoStructure: string,
    fileContext: string,
    agentType: string
  ): Promise<string> {
    const systemPrompt = `You are an expert at creating AI agent prompts for software development. Create a specialized prompt that would help an AI assistant understand and work effectively with this specific codebase.

The prompt should include:
1. Clear understanding of the codebase structure and patterns
2. Key conventions and best practices used in this project  
3. Important files and their purposes
4. Common tasks and workflows
5. Specific guidance for the agent type requested

Make the prompt practical and actionable.`;

    const prompt = `Codebase Structure:
${repoStructure}

File Context:
${fileContext}

Agent Type: ${agentType}

Generate a comprehensive agent prompt that would help an AI assistant work effectively with this codebase for ${agentType} tasks.`;

    return this.generateText(prompt, systemPrompt);
  }
}