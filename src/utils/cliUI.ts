import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as cliProgress from 'cli-progress';
import boxen from 'boxen';
import figures from 'figures';

export class CLIInterface {
  private spinner: Ora | null = null;
  private progressBar: cliProgress.SingleBar | null = null;
  private startTime: number = Date.now();

  displayWelcome(version: string): void {
    const welcomeMessage = chalk.bold.cyan('AI Coders Context') + '\n' +
      chalk.gray(`Version ${version}`) + '\n' +
      chalk.dim('Scaffold documentation and agent playbooks with or without LLM assistance');

    console.log(boxen(welcomeMessage, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      align: 'center'
    }));
  }

  displayProjectInfo(repoPath: string, outputDir: string, mode: string): void {
    console.log(chalk.bold('\n📋 Project Configuration:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue(figures.pointer)} Repository: ${chalk.white(repoPath)}`);
    console.log(`${chalk.blue(figures.pointer)} Output: ${chalk.white(outputDir)}`);
    console.log(`${chalk.blue(figures.pointer)} Scaffold Mode: ${chalk.white(mode)}`);
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

  displayGenerationSummary(docsGenerated: number, agentsGenerated: number): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const summaryText = chalk.bold.green('✨ Scaffold Complete!\n\n') +
      `${chalk.blue('Documentation files:')} ${chalk.white(docsGenerated.toString())}\n` +
      `${chalk.blue('Agent playbooks:')} ${chalk.white(agentsGenerated.toString())}\n` +
      `${chalk.blue('Time elapsed:')} ${chalk.white(`${elapsed}s`)}\n\n` +
      chalk.dim('Next step: customize the generated templates to match your project.');

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
