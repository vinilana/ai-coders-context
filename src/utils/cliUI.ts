import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as cliProgress from 'cli-progress';
import boxen from 'boxen';
import figures from 'figures';

import { TranslateFn, TranslationKey, TranslateParams } from './i18n';
import type {
  AgentType,
  AgentStartEvent,
  ToolCallEvent,
  ToolResultEvent,
  AgentCompleteEvent,
  AgentEventCallbacks
} from '../services/ai/agentEvents';

export class CLIInterface {
  private spinner: Ora | null = null;
  private progressBar: cliProgress.SingleBar | null = null;
  private startTime: number = Date.now();

  constructor(private readonly translate: TranslateFn) {}

  displayWelcome(version: string): void {
    const asciiArtLines = [
      '  ___  _____   _____ ___________ ___________  _____ ',
      ' / _ \\|_   _| /  __ \\  _  |  _  \\  ___| ___ \\ /  ___|',
      '/ /_\\ \\ | |   | /  \\/ | | | | | | |__ | |_/ /\\ `--. ',
      '|  _  | | |   | |   | | | | | | |  __||    /  `--. \\',
      '| | | |_| |_  | \\__/\\ \\_/ / |/ /| |___| |\\ \\ /\\__/ /',
      '\\_| |_/\\___/   \\____/\\___/|___/ \\____/\\_| \\_|\\____/ '
    ];

    const palette = [
      chalk.cyanBright,
      chalk.cyan,
      chalk.blueBright,
      chalk.blue,
      chalk.magentaBright,
      chalk.magenta
    ];

    const banner = asciiArtLines
      .map((line, index) => palette[index % palette.length](`  ${line}`))
      .join('\n');

    console.log('\n' + banner + '\n');

    const nameLabel = this.t('cli.name');
    const versionLabel = this.t('ui.version', { version });
    const taglineLabel = this.t('cli.tagline');

    const infoEntries = [
      {
        icon: '◉',
        raw: nameLabel,
        colored: chalk.whiteBright.bold(nameLabel)
      },
      {
        icon: '⌁',
        raw: versionLabel,
        colored: chalk.cyanBright(versionLabel)
      },
      {
        icon: '⋰',
        raw: taglineLabel,
        colored: chalk.gray(taglineLabel)
      }
    ];

    const maxWidth = infoEntries.reduce((width, entry) => Math.max(width, entry.raw.length), 0);
    const accent = chalk.cyanBright('╺' + '━'.repeat(maxWidth + 8) + '╸');

    console.log(accent);
    infoEntries.forEach(entry => {
      const padding = ' '.repeat(Math.max(0, maxWidth - entry.raw.length));
      console.log(`${chalk.cyanBright(entry.icon)}  ${entry.colored}${padding}`);
    });
    console.log('');
  }

  displayProjectInfo(repoPath: string, outputDir: string, mode: string): void {
    console.log(chalk.bold(`\n${this.t('ui.projectConfiguration.title')}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue(figures.pointer)} ${this.t('ui.projectConfiguration.repository')} ${chalk.white(repoPath)}`);
    console.log(`${chalk.blue(figures.pointer)} ${this.t('ui.projectConfiguration.output')} ${chalk.white(outputDir)}`);
    console.log(`${chalk.blue(figures.pointer)} ${this.t('ui.projectConfiguration.mode')} ${chalk.white(mode)}`);
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
      task: this.t('ui.progress.starting')
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
      chalk.bold.green(`${this.t('ui.analysis.complete.title')}\n\n`) +
      `${chalk.blue(`${this.t('ui.analysis.files')}:`)} ${chalk.white(totalFiles.toString())}\n` +
      `${chalk.blue(`${this.t('ui.analysis.directories')}:`)} ${chalk.white(totalDirs.toString())}\n` +
      `${chalk.blue(`${this.t('ui.analysis.totalSize')}:`)} ${chalk.white(totalSize)}`,
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
    console.log(chalk.bold(`\n${this.t('ui.fileTypeDistribution.title')}`));
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

  displayGenerationSummary(docsGenerated: number, agentsGenerated: number): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const summaryText = chalk.bold.green(`${this.t('ui.generationSummary.title')}\n\n`) +
      `${chalk.blue(`${this.t('ui.generationSummary.documentation')}:`)} ${chalk.white(docsGenerated.toString())}\n` +
      `${chalk.blue(`${this.t('ui.generationSummary.agents')}:`)} ${chalk.white(agentsGenerated.toString())}\n` +
      `${chalk.blue(`${this.t('ui.generationSummary.timeElapsed')}:`)} ${chalk.white(`${elapsed}s`)}\n\n` +
      chalk.dim(this.t('ui.generationSummary.nextStep'));

    const summary = boxen(summaryText, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'green',
      align: 'center'
    });
    
    console.log('\n' + summary);
  }

  displayError(message: string, error?: Error): void {
    const errorBox = boxen(
      chalk.bold.red(`${this.t('ui.error.title')}\n\n`) +
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

  // Agent activity display methods

  /**
   * Get the icon for an agent type
   */
  private getAgentIcon(agent: AgentType): string {
    const icons: Record<AgentType, string> = {
      documentation: '📝',
      playbook: '📋',
      plan: '🗺️',
      fill: '✨'
    };
    return icons[agent] || '🤖';
  }

  /**
   * Get the icon for a tool
   */
  private getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      readFile: '📄',
      listFiles: '📁',
      analyzeSymbols: '🔍',
      getFileStructure: '🌳',
      searchCode: '🔎'
    };
    return icons[toolName] || '🔧';
  }

  /**
   * Display agent start event
   */
  displayAgentStart(event: AgentStartEvent): void {
    const icon = this.getAgentIcon(event.agent);
    const agentLabel = this.t(`agent.type.${event.agent}` as TranslationKey) || event.agent;
    const targetInfo = event.target ? chalk.gray(` → ${event.target}`) : '';

    console.log(
      chalk.cyan(`${icon} ${this.t('agent.starting' as TranslationKey)} `) +
      chalk.bold.white(agentLabel) +
      targetInfo
    );
  }

  /**
   * Display tool call event
   */
  displayToolCall(event: ToolCallEvent): void {
    const icon = this.getToolIcon(event.toolName);
    const argsStr = event.args ? chalk.gray(` (${this.formatToolArgs(event.args)})`) : '';

    console.log(
      chalk.dim('  │ ') +
      chalk.yellow(`${icon} ${event.toolName}`) +
      argsStr
    );
  }

  /**
   * Display tool result event
   */
  displayToolResult(event: ToolResultEvent): void {
    const statusIcon = event.success ? chalk.green(figures.tick) : chalk.red(figures.cross);
    const summary = event.summary ? chalk.gray(` ${event.summary}`) : '';

    console.log(
      chalk.dim('  │ ') +
      `${statusIcon}${summary}`
    );
  }

  /**
   * Display agent complete event
   */
  displayAgentComplete(event: AgentCompleteEvent): void {
    const icon = this.getAgentIcon(event.agent);
    const toolsSummary = event.toolsUsed.length > 0
      ? chalk.gray(` (${event.toolsUsed.join(', ')})`)
      : '';

    console.log(
      chalk.green(`${icon} ${this.t('agent.complete' as TranslationKey)} `) +
      chalk.dim(`${event.steps} ${this.t('agent.steps' as TranslationKey)}`) +
      toolsSummary
    );
  }

  /**
   * Format tool arguments for display
   */
  private formatToolArgs(args: Record<string, unknown>): string {
    const entries = Object.entries(args);
    if (entries.length === 0) return '';

    return entries
      .slice(0, 2)
      .map(([key, value]) => {
        const strValue = String(value);
        const truncated = strValue.length > 40 ? strValue.slice(0, 37) + '...' : strValue;
        return `${key}: ${truncated}`;
      })
      .join(', ');
  }

  /**
   * Create event callbacks bound to this CLI instance
   */
  createAgentCallbacks(): AgentEventCallbacks {
    return {
      onAgentStart: (event) => this.displayAgentStart(event),
      onToolCall: (event) => this.displayToolCall(event),
      onToolResult: (event) => this.displayToolResult(event),
      onAgentComplete: (event) => this.displayAgentComplete(event)
    };
  }

  private t(key: TranslationKey, params?: TranslateParams): string {
    return this.translate(key, params);
  }
}
