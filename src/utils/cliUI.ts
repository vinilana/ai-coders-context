import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as cliProgress from 'cli-progress';
import boxen from 'boxen';
import figures from 'figures';
import { UsageStats } from '../types';
import { formatCurrency } from './pricing';

export class CLIInterface {
  private spinner: Ora | null = null;
  private progressBar: cliProgress.SingleBar | null = null;
  private startTime: number = Date.now();

  displayWelcome(version: string): void {
    const welcomeMessage = chalk.bold.cyan('AI Coders Context') + '\n' +
      chalk.gray(`Version ${version}`) + '\n' +
      chalk.dim('Generate intelligent documentation and AI agent prompts');

    console.log(boxen(welcomeMessage, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      align: 'center'
    }));
  }

  displayProjectInfo(repoPath: string, outputDir: string, model: string, provider?: string): void {
    console.log(chalk.bold('\n📋 Project Configuration:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue(figures.pointer)} Repository: ${chalk.white(repoPath)}`);
    console.log(`${chalk.blue(figures.pointer)} Output: ${chalk.white(outputDir)}`);
    console.log(`${chalk.blue(figures.pointer)} Provider: ${chalk.white(provider || 'openrouter')}`);
    console.log(`${chalk.blue(figures.pointer)} Model: ${chalk.white(model)}`);
    console.log(chalk.gray('─'.repeat(50)) + '\n');
  }

  startSpinner(text: string): void {
    this.spinner = ora({
      text,
      spinner: 'dots',
      color: 'cyan'
    }).start();
  }

  updateSpinner(text: string, type?: 'success' | 'fail' | 'warn' | 'info'): void {
    if (!this.spinner) return;

    switch (type) {
      case 'success':
        this.spinner.succeed(chalk.green(text));
        break;
      case 'fail':
        this.spinner.fail(chalk.red(text));
        break;
      case 'warn':
        this.spinner.warn(chalk.yellow(text));
        break;
      case 'info':
        this.spinner.info(chalk.blue(text));
        break;
      default:
        this.spinner.text = text;
    }
  }

  stopSpinner(success: boolean = true): void {
    if (!this.spinner) return;
    
    if (success) {
      this.spinner.stop();
    } else {
      this.spinner.fail();
    }
    this.spinner = null;
  }

  createProgressBar(total: number, title: string): void {
    this.progressBar = new cliProgress.SingleBar({
      format: `${chalk.cyan(title)} |${chalk.cyan('{bar}')}| {percentage}% | {value}/{total} | {task}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      stopOnComplete: true,
      clearOnComplete: false
    }, cliProgress.Presets.shades_classic);

    this.progressBar.start(total, 0, {
      task: 'Starting...'
    });
  }

  updateProgress(current: number, task: string): void {
    if (!this.progressBar) return;
    this.progressBar.update(current, { task });
  }

  completeProgress(): void {
    if (!this.progressBar) return;
    this.progressBar.stop();
    this.progressBar = null;
  }

  displayAnalysisResults(totalFiles: number, totalDirs: number, totalSize: string): void {
    const results = boxen(
      chalk.bold.green('📊 Repository Analysis Complete\n\n') +
      `${chalk.blue('Files:')} ${chalk.white(totalFiles.toString())}\n` +
      `${chalk.blue('Directories:')} ${chalk.white(totalDirs.toString())}\n` +
      `${chalk.blue('Total Size:')} ${chalk.white(totalSize)}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
        align: 'left'
      }
    );
    console.log('\n' + results);
  }

  displayFileTypeDistribution(distribution: Map<string, number>, totalFiles: number): void {
    console.log(chalk.bold('\n📁 File Type Distribution:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    const sorted = Array.from(distribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sorted.forEach(([ext, count]) => {
      const percentage = ((count / totalFiles) * 100).toFixed(1);
      const barLength = Math.round((count / totalFiles) * 30);
      const bar = '█'.repeat(barLength) + '░'.repeat(30 - barLength);
      
      console.log(
        `${chalk.yellow(ext.padEnd(15))} ${chalk.gray(bar)} ${chalk.white(count.toString().padStart(4))} (${percentage}%)`
      );
    });
  }

  displayGenerationSummary(docsGenerated: number, agentsGenerated: number, usageStats?: UsageStats, isUpdate: boolean = false): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    const title = isUpdate ? '🔄 Update Complete!' : '✨ Generation Complete!';
    const docLabel = isUpdate ? 'Updated Files:' : 'Documentation:';
    const agentLabel = isUpdate ? 'Agent Prompts:' : 'Agent Prompts:';
    
    let summaryText = chalk.bold.green(`${title}\n\n`) +
      `${chalk.blue(docLabel)} ${chalk.white(docsGenerated + ' files')}\n` +
      `${chalk.blue(agentLabel)} ${chalk.white(agentsGenerated + ' files')}\n` +
      `${chalk.blue('Time Elapsed:')} ${chalk.white(elapsed + 's')}\n`;

    if (usageStats && usageStats.totalCalls > 0) {
      summaryText += '\n' + chalk.bold.cyan('💰 API Usage Statistics:\n') +
        `${chalk.blue('Total API Calls:')} ${chalk.white(usageStats.totalCalls.toString())}\n` +
        `${chalk.blue('Input Tokens:')} ${chalk.white(usageStats.totalPromptTokens.toLocaleString())}\n` +
        `${chalk.blue('Output Tokens:')} ${chalk.white(usageStats.totalCompletionTokens.toLocaleString())}\n` +
        `${chalk.blue('Total Tokens:')} ${chalk.white(usageStats.totalTokens.toLocaleString())}\n` +
        `${chalk.blue('Estimated Cost:')} ${chalk.yellow(formatCurrency(usageStats.estimatedCost))}\n` +
        `${chalk.blue('Model Used:')} ${chalk.white(usageStats.model)}\n`;
    }

    summaryText += '\n' + chalk.dim('Check the output directory for your generated files.');
    
    const summary = boxen(summaryText, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'green',
      align: 'center'
    });
    
    console.log('\n' + summary);
  }

  displayUsageWarning(estimatedCost: number): void {
    if (estimatedCost > 1.0) {
      const warning = boxen(
        chalk.bold.yellow('⚠️  High Usage Warning\n\n') +
        `This operation may cost approximately ${chalk.white(formatCurrency(estimatedCost))}\n` +
        chalk.dim('Consider using a cheaper model like claude-3-haiku for testing.'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
          align: 'center'
        }
      );
      console.log('\n' + warning);
    }
  }

  displayError(message: string, error?: Error): void {
    const errorBox = boxen(
      chalk.bold.red('❌ Error Occurred\n\n') +
      chalk.white(message) +
      (error ? '\n\n' + chalk.gray(error.stack || error.message) : ''),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        align: 'left'
      }
    );
    
    console.error('\n' + errorBox);
  }

  displayInfo(title: string, message: string): void {
    console.log(
      '\n' + chalk.bold.blue(`ℹ️  ${title}`) + '\n' +
      chalk.gray('─'.repeat(50)) + '\n' +
      chalk.white(message) + '\n'
    );
  }

  displaySuccess(message: string): void {
    console.log(chalk.green(`${figures.tick} ${message}`));
  }

  displayWarning(message: string): void {
    console.log(chalk.yellow(`${figures.warning} ${message}`));
  }

  displayStep(step: number, total: number, description: string): void {
    console.log(
      chalk.dim(`[${step}/${total}]`) + ' ' +
      chalk.bold(description)
    );
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}