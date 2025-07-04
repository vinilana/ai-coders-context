import { FileInfo, RepoStructure } from '../types';
import { FileMapper } from './fileMapper';
import chalk from 'chalk';

export interface ModelPricing {
  input: number;  // Cost per 1M input tokens
  output: number; // Cost per 1M output tokens
}


export interface TokenEstimate {
  totalFiles: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  costEstimates?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export class TokenEstimator {
  constructor(
    private fileMapper: FileMapper, 
    private pricing?: ModelPricing
  ) {}

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

    const result: TokenEstimate = {
      totalFiles: relevantFiles.length,
      estimatedInputTokens: totalInputWithOverhead,
      estimatedOutputTokens,
      estimatedTotalTokens
    };

    // Only calculate cost estimates if pricing is provided
    if (this.pricing) {
      result.costEstimates = this.calculateCostEstimates(totalInputWithOverhead, estimatedOutputTokens);
    }

    return result;
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

  private calculateCostEstimates(inputTokens: number, outputTokens: number): NonNullable<TokenEstimate['costEstimates']> {
    if (!this.pricing) {
      throw new Error('Pricing information is required for cost estimation');
    }

    const inputCost = (inputTokens / 1_000_000) * this.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * this.pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 100) / 100,
      outputCost: Math.round(outputCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    };
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

`;

    if (estimate.costEstimates) {
      const costs = estimate.costEstimates;
      const totalColor = costs.totalCost < 0.10 ? chalk.green : costs.totalCost < 0.50 ? chalk.yellow : chalk.red;
      
      output += `${chalk.bold.yellow('💰 Cost Estimate:')}
  Input Tokens Cost:  ${chalk.gray(formatCost(costs.inputCost))}
  Output Tokens Cost: ${chalk.gray(formatCost(costs.outputCost))}
  ${chalk.bold('Total Estimated Cost:')} ${totalColor(formatCost(costs.totalCost))}

`;
    } else {
      output += `${chalk.bold.yellow('💰 Cost Estimation:')}
  ${chalk.gray('No pricing information provided - cost estimation unavailable')}
  ${chalk.gray('Use --input-price and --output-price to enable cost estimation')}

`;
    }

    const notesSection = estimate.costEstimates 
      ? `${chalk.bold.blue('ℹ️  Notes:')}
${chalk.gray('• Token estimates are based on sampling ' + Math.min(estimate.totalFiles, 10) + ' files')}
${chalk.gray('• Costs include system prompts and context overhead')}
${chalk.gray('• Output tokens estimated at ~40% of input + overhead')}
${chalk.gray('• Actual costs may vary based on content complexity')}
${chalk.gray('• Pricing based on your provided model costs')}`
      : `${chalk.bold.blue('ℹ️  Notes:')}
${chalk.gray('• Token estimates are based on sampling ' + Math.min(estimate.totalFiles, 10) + ' files')}
${chalk.gray('• Costs include system prompts and context overhead')}
${chalk.gray('• Output tokens estimated at ~40% of input + overhead')}
${chalk.gray('• Provide pricing information to see cost estimates')}`;

    output += `
${notesSection}

${chalk.gray('═══════════════════════════════════════════════════════════')}`;

    return output;
  }
}