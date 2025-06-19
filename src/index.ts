#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
import { FileMapper } from './utils/fileMapper';
import { DocumentationGenerator } from './generators/documentationGenerator';
import { AgentGenerator } from './generators/agentGenerator';
import { IncrementalDocumentationGenerator } from './generators/incrementalDocumentationGenerator';
import { CLIOptions, LLMConfig } from './types';
import { CLIInterface } from './utils/cliUI';
import { LLMClientFactory } from './services/llmClientFactory';
import { GitService } from './utils/gitService';

const program = new Command();
const ui = new CLIInterface();

program
  .name('ai-context')
  .description('AI-powered CLI for generating codebase documentation and agent prompts')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate documentation and agent prompts for a repository')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .option('-o, --output <dir>', 'Output directory', './ai-context-output')
  .option('-k, --api-key <key>', 'API key for the LLM provider')
  .option('-m, --model <model>', 'LLM model to use', 'anthropic/claude-3-haiku')
  .option('-p, --provider <provider>', 'LLM provider (openrouter, openai, anthropic, gemini, grok)', 'openrouter')
  .option('--exclude <patterns...>', 'Patterns to exclude from analysis')
  .option('--include <patterns...>', 'Patterns to include in analysis')
  .option('--docs-only', 'Generate only documentation (skip agent prompts)')
  .option('--agents-only', 'Generate only agent prompts (skip documentation)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (repoPath: string, options: any) => {
    try {
      await runGenerate(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to generate documentation', error as Error);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update documentation for changed files since last run or specified commit')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .option('-o, --output <dir>', 'Output directory', './ai-context-output')
  .option('-k, --api-key <key>', 'API key for the LLM provider')
  .option('-m, --model <model>', 'LLM model to use', 'anthropic/claude-3-haiku')
  .option('-p, --provider <provider>', 'LLM provider (openrouter, openai, anthropic, gemini, grok)', 'openrouter')
  .option('--since <commit>', 'Compare against specific commit/branch (default: last processed commit)')
  .option('--staged', 'Only process staged files (for pre-commit hooks)')
  .option('--force', 'Force regeneration even if no changes detected')
  .option('--exclude <patterns...>', 'Patterns to exclude from analysis')
  .option('--include <patterns...>', 'Patterns to include in analysis')
  .option('-v, --verbose', 'Verbose output')
  .action(async (repoPath: string, options: any) => {
    try {
      await runUpdate(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to update documentation', error as Error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze repository structure without generating content')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .option('--exclude <patterns...>', 'Patterns to exclude from analysis')
  .option('--include <patterns...>', 'Patterns to include in analysis')
  .option('-v, --verbose', 'Verbose output')
  .action(async (repoPath: string, options: any) => {
    try {
      await runAnalyze(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to analyze repository', error as Error);
      process.exit(1);
    }
  });

async function runGenerate(repoPath: string, options: any): Promise<void> {
  const provider = options.provider || LLMClientFactory.detectProviderFromModel(options.model);
  
  // Get API key from options or environment variables
  let apiKey = options.apiKey;
  if (!apiKey) {
    const envVars = LLMClientFactory.getEnvironmentVariables()[provider as LLMConfig['provider']];
    for (const envVar of envVars) {
      apiKey = process.env[envVar];
      if (apiKey) break;
    }
  }

  const cliOptions: CLIOptions = {
    repoPath: path.resolve(repoPath),
    outputDir: path.resolve(options.output),
    model: options.model,
    apiKey,
    provider,
    exclude: options.exclude || [],
    include: options.include,
    verbose: options.verbose || false
  };

  if (!cliOptions.apiKey) {
    const envVars = LLMClientFactory.getEnvironmentVariables()[provider as LLMConfig['provider']];
    ui.displayError(`${provider.toUpperCase()} API key is required. Set one of these environment variables: ${envVars.join(', ')} or use --api-key option.`);
    process.exit(1);
  }

  // Display welcome message
  ui.displayWelcome('0.1.0');
  ui.displayProjectInfo(cliOptions.repoPath, cliOptions.outputDir!, cliOptions.model!, cliOptions.provider);
  
  // Show usage warning for expensive models
  if (cliOptions.model && ['anthropic/claude-3-opus', 'openai/gpt-4'].includes(cliOptions.model)) {
    ui.displayUsageWarning(2.0); // Estimate high cost for warning
  }

  // Initialize components
  const fileMapper = new FileMapper(cliOptions.exclude);
  const llmConfig: LLMConfig = {
    apiKey: cliOptions.apiKey,
    model: cliOptions.model || 'anthropic/claude-3-haiku',
    provider: cliOptions.provider || 'openrouter'
  };
  const llmClient = LLMClientFactory.createClient(llmConfig);
  const docGenerator = new DocumentationGenerator(fileMapper, llmClient);
  const agentGenerator = new AgentGenerator(fileMapper, llmClient);

  // Step 1: Map repository structure
  ui.displayStep(1, 4, 'Analyzing repository structure');
  ui.startSpinner('Scanning files and directories...');
  
  const repoStructure = await fileMapper.mapRepository(
    cliOptions.repoPath,
    cliOptions.include
  );

  ui.updateSpinner(`Found ${repoStructure.totalFiles} files in ${repoStructure.directories.length} directories`, 'success');

  // Display analysis results
  if (cliOptions.verbose) {
    ui.displayAnalysisResults(
      repoStructure.totalFiles,
      repoStructure.directories.length,
      ui.formatBytes(repoStructure.totalSize)
    );

    // Show file distribution
    const extensions = new Map<string, number>();
    repoStructure.files.forEach(file => {
      const ext = file.extension || 'no-extension';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    });
    ui.displayFileTypeDistribution(extensions, repoStructure.totalFiles);
  }

  let docsGenerated = 0;
  let agentsGenerated = 0;

  // Step 2: Generate documentation
  if (!options.agentsOnly) {
    ui.displayStep(2, 4, 'Generating documentation');
    ui.startSpinner('Creating comprehensive documentation...');
    
    try {
      await docGenerator.generateDocumentation(
        repoStructure,
        cliOptions.outputDir!,
        false // We'll handle our own progress display
      );
      docsGenerated = 7; // Number of doc files generated
      ui.updateSpinner('Documentation generated successfully', 'success');
    } catch (error) {
      ui.updateSpinner('Failed to generate documentation', 'fail');
      throw error;
    }
  }

  // Step 3: Generate agent prompts
  if (!options.docsOnly) {
    ui.displayStep(3, 4, 'Generating AI agent prompts');
    ui.startSpinner('Creating specialized agent prompts...');
    
    try {
      await agentGenerator.generateAgentPrompts(
        repoStructure,
        cliOptions.outputDir!,
        false // We'll handle our own progress display
      );
      agentsGenerated = 9; // Number of agent files generated
      ui.updateSpinner('Agent prompts generated successfully', 'success');
    } catch (error) {
      ui.updateSpinner('Failed to generate agent prompts', 'fail');
      throw error;
    }
  }

  // Step 4: Complete
  ui.displayStep(4, 4, 'Finalizing output');
  
  // Get usage statistics from the LLM client
  const usageStats = llmClient.getUsageStats();
  ui.displayGenerationSummary(docsGenerated, agentsGenerated, usageStats);
  ui.displaySuccess(`Output saved to: ${cliOptions.outputDir}`);
}

async function runAnalyze(repoPath: string, options: any): Promise<void> {
  const resolvedPath = path.resolve(repoPath);
  
  // Display welcome
  ui.displayWelcome('0.1.0');
  
  ui.startSpinner('Analyzing repository structure...');

  const fileMapper = new FileMapper(options.exclude || []);
  const repoStructure = await fileMapper.mapRepository(
    resolvedPath,
    options.include
  );

  ui.stopSpinner();

  // Display analysis results
  ui.displayAnalysisResults(
    repoStructure.totalFiles,
    repoStructure.directories.length,
    ui.formatBytes(repoStructure.totalSize)
  );

  // File type distribution
  const extensions = new Map<string, number>();
  repoStructure.files.forEach(file => {
    const ext = file.extension || 'no-extension';
    extensions.set(ext, (extensions.get(ext) || 0) + 1);
  });

  ui.displayFileTypeDistribution(extensions, repoStructure.totalFiles);

  // Directory structure (top level)
  const topDirs = repoStructure.directories
    .filter(dir => !dir.relativePath.includes('/'))
    .slice(0, 10);

  if (topDirs.length > 0) {
    console.log(chalk.bold('\n📂 Top-level Directories:'));
    console.log(chalk.gray('─'.repeat(50)));
    topDirs.forEach(dir => {
      console.log(`  ${chalk.blue('▸')} ${chalk.white(dir.relativePath)}`);
    });
  }

  ui.displaySuccess('Analysis complete!');
}

async function runUpdate(repoPath: string, options: any): Promise<void> {
  const provider = options.provider || LLMClientFactory.detectProviderFromModel(options.model);
  
  // Get API key from options or environment variables
  let apiKey = options.apiKey;
  if (!apiKey) {
    const envVars = LLMClientFactory.getEnvironmentVariables()[provider as LLMConfig['provider']];
    for (const envVar of envVars) {
      apiKey = process.env[envVar];
      if (apiKey) break;
    }
  }

  const cliOptions: CLIOptions = {
    repoPath: path.resolve(repoPath),
    outputDir: path.resolve(options.output),
    model: options.model,
    apiKey,
    provider,
    exclude: options.exclude || [],
    include: options.include,
    verbose: options.verbose || false,
    since: options.since,
    staged: options.staged || false,
    force: options.force || false
  };

  if (!cliOptions.apiKey) {
    const envVars = LLMClientFactory.getEnvironmentVariables()[provider as LLMConfig['provider']];
    ui.displayError(`${provider.toUpperCase()} API key is required. Set one of these environment variables: ${envVars.join(', ')} or use --api-key option.`);
    process.exit(1);
  }

  // Initialize git service
  const gitService = new GitService(cliOptions.repoPath);

  if (!gitService.isGitRepository()) {
    ui.displayError('This command requires a Git repository. Initialize git first or use the generate command instead.');
    process.exit(1);
  }

  // Display welcome message
  ui.displayWelcome('0.1.0');
  ui.displayProjectInfo(cliOptions.repoPath, cliOptions.outputDir!, cliOptions.model!, cliOptions.provider);

  // Initialize components
  const fileMapper = new FileMapper(cliOptions.exclude);
  const llmConfig: LLMConfig = {
    apiKey: cliOptions.apiKey,
    model: cliOptions.model || 'anthropic/claude-3-haiku',
    provider: cliOptions.provider || 'openrouter'
  };
  const llmClient = LLMClientFactory.createClient(llmConfig);
  const incrementalGenerator = new IncrementalDocumentationGenerator(fileMapper, llmClient, gitService);

  // Step 1: Analyze repository structure
  ui.displayStep(1, 4, 'Analyzing repository structure');
  ui.startSpinner('Scanning files and directories...');
  
  const repoStructure = await fileMapper.mapRepository(
    cliOptions.repoPath,
    cliOptions.include
  );

  ui.updateSpinner(`Found ${repoStructure.totalFiles} files in ${repoStructure.directories.length} directories`, 'success');

  // Step 2: Detect changes
  ui.displayStep(2, 4, 'Detecting changes');
  ui.startSpinner('Analyzing git changes...');

  let changes;
  if (cliOptions.staged) {
    // For pre-commit hooks - only staged files
    const stagedFiles = gitService.getStagedFiles();
    changes = {
      added: stagedFiles.filter(f => !fs.existsSync(path.join(cliOptions.repoPath, f))),
      modified: stagedFiles.filter(f => fs.existsSync(path.join(cliOptions.repoPath, f))),
      deleted: [],
      renamed: []
    };
  } else if (cliOptions.since) {
    // Compare against specific commit
    changes = gitService.getChangedFiles(cliOptions.since);
  } else {
    // Compare against last processed commit
    changes = gitService.getChangedFiles();
  }

  const totalChanges = changes.added.length + changes.modified.length + changes.deleted.length + changes.renamed.length;

  if (totalChanges === 0 && !cliOptions.force) {
    ui.updateSpinner('No changes detected since last run', 'info');
    ui.displaySuccess('Documentation is up to date!');
    return;
  }

  ui.updateSpinner(`Found ${totalChanges} changed files`, 'success');

  // Step 3: Update documentation
  ui.displayStep(3, 4, 'Updating documentation');
  ui.startSpinner('Processing changed files...');

  const result = await incrementalGenerator.updateDocumentation(
    repoStructure,
    cliOptions.outputDir!,
    changes,
    cliOptions.verbose
  );

  ui.updateSpinner(`Updated ${result.updated} files, removed ${result.removed} files`, 'success');

  // Step 4: Save state
  ui.displayStep(4, 4, 'Saving state');
  const currentCommit = gitService.getCurrentCommit();
  const processedFiles = [
    ...changes.added,
    ...changes.modified,
    ...changes.renamed.map(r => r.to)
  ].filter(f => fileMapper.isTextFile(path.join(cliOptions.repoPath, f)));

  gitService.saveState(currentCommit, processedFiles);

  // Get usage statistics
  const usageStats = llmClient.getUsageStats();
  ui.displayGenerationSummary(result.updated, 0, usageStats, true);
  ui.displaySuccess(`Documentation updated! Processed ${result.updated} files.`);
}

program.parse();