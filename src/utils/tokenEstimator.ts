import { FileInfo, RepoStructure } from '../types';
import { FileMapper } from './fileMapper';
import chalk from 'chalk';

export interface TokenEstimate {
  totalFiles: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  costEstimates: {
    [modelKey: string]: {
      provider: string;
      modelName: string;
      inputCost: number;
      outputCost: number;
      totalCost: number;
    };
  };
}

export class TokenEstimator {
  constructor(private fileMapper: FileMapper) {}

  async estimateTokensForFullGeneration(repoStructure: RepoStructure): Promise<TokenEstimate> {
    const relevantFiles = repoStructure.files.filter(file => 
      this.fileMapper.isTextFile(file.path)
    );

    let totalInputTokens = 0;
    let processedFiles = 0;

    // Sample a subset of files to estimate average tokens per file
    const sampleSize = Math.min(relevantFiles.length, 10);
    const sampleFiles = this.selectSampleFiles(relevantFiles, sampleSize);

    for (const file of sampleFiles) {
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        const tokens = this.estimateTokensFromText(content);
        totalInputTokens += tokens;
        processedFiles++;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Calculate average and extrapolate
    const averageTokensPerFile = processedFiles > 0 ? totalInputTokens / processedFiles : 0;
    const estimatedInputTokens = Math.ceil(averageTokensPerFile * relevantFiles.length);

    // Add overhead for system prompts, context, and instructions
    const systemPromptOverhead = relevantFiles.length * 500; // ~500 tokens per file for prompts
    const totalInputWithOverhead = estimatedInputTokens + systemPromptOverhead;

    // Estimate output tokens (documentation is typically 30-50% of input size)
    const estimatedOutputTokens = Math.ceil(totalInputWithOverhead * 0.4);

    const estimatedTotalTokens = totalInputWithOverhead + estimatedOutputTokens;

    return {
      totalFiles: relevantFiles.length,
      estimatedInputTokens: totalInputWithOverhead,
      estimatedOutputTokens,
      estimatedTotalTokens,
      costEstimates: this.calculateCostEstimates(totalInputWithOverhead, estimatedOutputTokens)
    };
  }

  private selectSampleFiles(files: FileInfo[], sampleSize: number): FileInfo[] {
    if (files.length <= sampleSize) {
      return files;
    }

    // Select a diverse sample: some small, medium, and large files
    const sorted = [...files].sort((a, b) => a.size - b.size);
    const sample: FileInfo[] = [];
    
    const step = Math.floor(sorted.length / sampleSize);
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.min(i * step, sorted.length - 1);
      sample.push(sorted[index]);
    }

    return sample;
  }

  private estimateTokensFromText(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for most languages
    // This is a conservative estimate that works reasonably well for code
    return Math.ceil(text.length / 4);
  }

  private calculateCostEstimates(inputTokens: number, outputTokens: number): TokenEstimate['costEstimates'] {
    // Pricing per 1M tokens (as of 2024) - specific models
    const models = {
      // OpenRouter - Popular models
      'openrouter-claude-3-haiku': {
        provider: 'OpenRouter',
        modelName: 'Claude 3 Haiku',
        input: 0.25,
        output: 1.25
      },
      'openrouter-claude-3-sonnet': {
        provider: 'OpenRouter', 
        modelName: 'Claude 3.5 Sonnet',
        input: 3.00,
        output: 15.00
      },
      'openrouter-gpt-4o-mini': {
        provider: 'OpenRouter',
        modelName: 'GPT-4o Mini',
        input: 0.15,
        output: 0.60
      },
      'openrouter-llama-3.1-8b': {
        provider: 'OpenRouter',
        modelName: 'Llama 3.1 8B',
        input: 0.05,
        output: 0.05
      },
      
      // OpenAI Direct
      'openai-gpt-4o': {
        provider: 'OpenAI',
        modelName: 'GPT-4o',
        input: 2.50,
        output: 10.00
      },
      'openai-gpt-4o-mini': {
        provider: 'OpenAI',
        modelName: 'GPT-4o Mini', 
        input: 0.15,
        output: 0.60
      },
      'openai-gpt-4-turbo': {
        provider: 'OpenAI',
        modelName: 'GPT-4 Turbo',
        input: 10.00,
        output: 30.00
      },

      // Anthropic Direct
      'anthropic-claude-3-haiku': {
        provider: 'Anthropic',
        modelName: 'Claude 3 Haiku',
        input: 0.25,
        output: 1.25
      },
      'anthropic-claude-3-sonnet': {
        provider: 'Anthropic',
        modelName: 'Claude 3.5 Sonnet',
        input: 3.00,
        output: 15.00
      },

      // Google AI
      'gemini-1.5-flash': {
        provider: 'Google AI',
        modelName: 'Gemini 1.5 Flash',
        input: 0.075,
        output: 0.30
      },
      'gemini-1.5-pro': {
        provider: 'Google AI',
        modelName: 'Gemini 1.5 Pro',
        input: 1.25,
        output: 5.00
      },

      // Grok (X.AI)
      'grok-beta': {
        provider: 'Grok (X.AI)',
        modelName: 'Grok Beta',
        input: 5.00,
        output: 15.00
      }
    };

    const costEstimates: TokenEstimate['costEstimates'] = {};

    for (const [modelKey, model] of Object.entries(models)) {
      const inputCost = (inputTokens / 1_000_000) * model.input;
      const outputCost = (outputTokens / 1_000_000) * model.output;
      const totalCost = inputCost + outputCost;

      costEstimates[modelKey] = {
        provider: model.provider,
        modelName: model.modelName,
        inputCost: Math.round(inputCost * 100) / 100, // Round to 2 decimal places
        outputCost: Math.round(outputCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100
      };
    }

    return costEstimates;
  }

  formatTokenEstimate(estimate: TokenEstimate): string {
    const formatNumber = (num: number) => num.toLocaleString();
    const formatCost = (cost: number) => cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;

    let output = `\n${chalk.bold.blue('📊 Token Usage Estimate for Full Documentation Generation:')}
${chalk.gray('═══════════════════════════════════════════════════════════')}

${chalk.bold('📁 Files to Process:')} ${chalk.cyan(formatNumber(estimate.totalFiles))}
${chalk.bold('🔤 Estimated Input Tokens:')} ${chalk.cyan(formatNumber(estimate.estimatedInputTokens))}
${chalk.bold('📝 Estimated Output Tokens:')} ${chalk.cyan(formatNumber(estimate.estimatedOutputTokens))}
${chalk.bold('🎯 Total Estimated Tokens:')} ${chalk.cyan(formatNumber(estimate.estimatedTotalTokens))}

${chalk.bold.yellow('💰 Cost Estimates by Model:')}
`;

    // Sort models by total cost
    const sortedModels = Object.entries(estimate.costEstimates)
      .sort(([, a], [, b]) => a.totalCost - b.totalCost);

    for (const [, costs] of sortedModels) {
      const modelDisplay = `${costs.modelName} (${costs.provider})`;
      const totalColor = costs.totalCost < 0.10 ? chalk.green : costs.totalCost < 0.50 ? chalk.yellow : chalk.red;
      output += `  ${chalk.bold(modelDisplay.padEnd(30))} | Input: ${chalk.gray(formatCost(costs.inputCost).padStart(6))} | Output: ${chalk.gray(formatCost(costs.outputCost).padStart(6))} | Total: ${totalColor(formatCost(costs.totalCost).padStart(6))}\n`;
    }

    output += `
${chalk.bold.blue('ℹ️  Notes:')}
${chalk.gray('• Token estimates are based on sampling ' + Math.min(estimate.totalFiles, 10) + ' files')}
${chalk.gray('• Costs include system prompts and context overhead')}
${chalk.gray('• Output tokens estimated at ~40% of input + overhead')}
${chalk.gray('• Actual costs may vary based on model choice and content complexity')}
${chalk.gray('• Prices are approximate and may change')}

${chalk.gray('═══════════════════════════════════════════════════════════')}`;

    return output;
  }
}