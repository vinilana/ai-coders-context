// OpenRouter pricing data - updated as of 2024
// Prices are per 1M tokens (input/output)

export interface ModelPricing {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  description: string;
}

export const MODEL_PRICING: { [key: string]: ModelPricing } = {
  // Anthropic Claude models
  'anthropic/claude-3-haiku': {
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    description: 'Claude 3 Haiku - Fast and efficient'
  },
  'anthropic/claude-3-sonnet': {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    description: 'Claude 3 Sonnet - Balanced performance'
  },
  'anthropic/claude-3-opus': {
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    description: 'Claude 3 Opus - Highest quality'
  },
  'anthropic/claude-3.5-sonnet': {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    description: 'Claude 3.5 Sonnet - Enhanced performance'
  },

  // OpenAI models
  'openai/gpt-4': {
    inputPricePerMillion: 30.0,
    outputPricePerMillion: 60.0,
    description: 'GPT-4 - High quality reasoning'
  },
  'openai/gpt-4-turbo': {
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    description: 'GPT-4 Turbo - Faster and cheaper'
  },
  'openai/gpt-3.5-turbo': {
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 2.0,
    description: 'GPT-3.5 Turbo - Fast and economical'
  },

  // Google models
  'google/gemini-pro': {
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 1.5,
    description: 'Gemini Pro - Google\'s multimodal model'
  },
  'google/gemini-2.5-flash-preview-05-20': {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    description: 'Gemini 2.0 Pro - Latest Google model'
  },
  'google/gemini-2.5-pro': {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    description: 'Gemini 2.5 Pro - Enhanced Google model'
  },

  // Meta models
  'meta-llama/llama-3.1-70b-instruct': {
    inputPricePerMillion: 0.88,
    outputPricePerMillion: 0.88,
    description: 'Llama 3.1 70B - Open source model'
  },
  'meta-llama/llama-3.1-405b-instruct': {
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 15.0,
    description: 'Llama 3.1 405B - Largest open model'
  },

  // Mistral models
  'mistralai/mistral-large': {
    inputPricePerMillion: 8.0,
    outputPricePerMillion: 24.0,
    description: 'Mistral Large - High performance model'
  },
  'mistralai/mistral-medium': {
    inputPricePerMillion: 2.7,
    outputPricePerMillion: 8.1,
    description: 'Mistral Medium - Balanced model'
  }
};

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  
  if (!pricing) {
    // Fallback pricing for unknown models (estimate based on GPT-3.5)
    return ((promptTokens / 1000000) * 1.0) + ((completionTokens / 1000000) * 2.0);
  }

  const inputCost = (promptTokens / 1000000) * pricing.inputPricePerMillion;
  const outputCost = (completionTokens / 1000000) * pricing.outputPricePerMillion;
  
  return inputCost + outputCost;
}

export function formatCurrency(amount: number): string {
  if (amount < 0.01) {
    return `$${(amount * 100).toFixed(3)}¢`;
  }
  return `$${amount.toFixed(4)}`;
}

export function getModelInfo(model: string): ModelPricing | null {
  return MODEL_PRICING[model] || null;
}

export function getSupportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is approximate and varies by model and language
  return Math.ceil(text.length / 4);
}