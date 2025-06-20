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
import { ChangeAnalyzer } from './services/changeAnalyzer';
import { TokenEstimator } from './utils/tokenEstimator';
import { InteractiveMode } from './utils/interactiveMode';

const program = new Command();
const ui = new CLIInterface();

program
  .name('ai-context')
  .description('AI-powered CLI for generating codebase documentation and agent prompts')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize documentation and agent prompts for a repository')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .argument('[type]', 'Type to initialize: "docs", "agents", or "both" (default: "both")', 'both')
  .option('-o, --output <dir>', 'Output directory', './.context')
  .option('-k, --api-key <key>', 'API key for the LLM provider')
  .option('-m, --model <model>', 'LLM model to use', 'google/gemini-2.5-flash-preview-05-20')
  .option('-p, --provider <provider>', 'LLM provider (openrouter, openai, anthropic, gemini, grok)', 'openrouter')
  .option('--exclude <patterns...>', 'Patterns to exclude from analysis')
  .option('--include <patterns...>', 'Patterns to include in analysis')
  .option('-v, --verbose', 'Verbose output')
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      // Validate type argument
      if (!['docs', 'agents', 'both'].includes(type)) {
        ui.displayError(`Invalid type "${type}". Must be "docs", "agents", or "both".`);
        process.exit(1);
      }
      
      // Set options based on type argument
      if (type === 'docs') {
        options.docsOnly = true;
      } else if (type === 'agents') {
        options.agentsOnly = true;
      }
      // For 'both', neither flag is set
      
      await runGenerate(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to initialize', error as Error);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update documentation for changed files since last run or specified commit')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .option('-o, --output <dir>', 'Output directory', './.context')
  .option('-k, --api-key <key>', 'API key for the LLM provider')
  .option('-m, --model <model>', 'LLM model to use', 'google/gemini-2.5-flash-preview-05-20')
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

program
  .command('preview')
  .description('Preview what documentation updates would be made without actually updating')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .option('--since <commit>', 'Compare against specific commit/branch (default: last processed commit)')
  .option('--staged', 'Only analyze staged files (for pre-commit hooks)')
  .option('--exclude <patterns...>', 'Patterns to exclude from analysis')
  .option('--include <patterns...>', 'Patterns to include in analysis')
  .option('-v, --verbose', 'Verbose output with detailed file lists')
  .addHelpText('after', `
Examples:
  $ ai-context preview ./                     # Preview changes since last run
  $ ai-context preview ./ --staged           # Preview staged files only
  $ ai-context preview ./ --since HEAD~3     # Preview changes since 3 commits ago
  $ ai-context preview ./ --verbose          # Show detailed file change lists`)
  .action(async (repoPath: string, options: any) => {
    try {
      await runPreview(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to preview updates', error as Error);
      process.exit(1);
    }
  });

export async function runGenerate(repoPath: string, options: any): Promise<void> {
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
    model: cliOptions.model || 'google/gemini-2.5-flash-preview-05-20',
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
      docsGenerated = 10; // Number of doc files generated (README, STRUCTURE, DEVELOPMENT, API, DEPLOYMENT, TROUBLESHOOTING, configuration + modules)
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

export async function runAnalyze(repoPath: string, options: any): Promise<void> {
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

  // Token estimation for full documentation generation
  ui.startSpinner('Estimating token usage for full documentation generation...');
  
  const tokenEstimator = new TokenEstimator(fileMapper);
  const tokenEstimate = await tokenEstimator.estimateTokensForFullGeneration(repoStructure);
  
  ui.stopSpinner();
  
  console.log(tokenEstimator.formatTokenEstimate(tokenEstimate));

  ui.displaySuccess('Analysis complete!');
}

export async function runUpdate(repoPath: string, options: any): Promise<void> {
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

  // Check if context has been initialized
  if (!gitService.hasContextBeenInitialized(cliOptions.outputDir!)) {
    ui.displayError('No documentation context found. You should run analyze and init before updating.');
    console.log(chalk.bold('\n💡 Getting Started:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('1. Analyze:')} ai-context analyze ${cliOptions.repoPath}`);
    console.log(`${chalk.blue('2. Initialize:')} ai-context init ${cliOptions.repoPath}`);
    console.log(`${chalk.blue('3. Update:')} ai-context update ${cliOptions.repoPath}`);
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('The analyze command shows token estimates and costs.'));
    console.log(chalk.gray('The init command creates the initial documentation.'));
    console.log(chalk.gray('The update command incrementally updates existing documentation.'));
    process.exit(1);
  }

  // Display welcome message
  ui.displayWelcome('0.1.0');
  ui.displayProjectInfo(cliOptions.repoPath, cliOptions.outputDir!, cliOptions.model!, cliOptions.provider);

  // Initialize components
  const fileMapper = new FileMapper(cliOptions.exclude);
  const llmConfig: LLMConfig = {
    apiKey: cliOptions.apiKey,
    model: cliOptions.model || 'google/gemini-2.5-flash-preview-05-20',
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
  
  // Display commit tracking info in verbose mode
  if (cliOptions.verbose) {
    gitService.displayCommitTrackingInfo(true);
  }
  
  ui.startSpinner('Analyzing git changes...');

  let changes;
  if (cliOptions.staged) {
    // For pre-commit hooks - analyze only staged files
    changes = gitService.getStagedChanges();
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

  // Step 4: Save state (only if documentation was actually updated)
  ui.displayStep(4, 4, 'Saving state');
  const currentCommit = gitService.getCurrentCommit();
  
  if (result.updated > 0 || result.removed > 0) {
    gitService.saveState(currentCommit);
    if (cliOptions.verbose) {
      console.log(chalk.gray(`State saved: tracking commit ${currentCommit.substring(0, 8)}`));
    }
  } else {
    if (cliOptions.verbose) {
      console.log(chalk.gray('No documentation changes made, state not updated'));
    }
  }

  // Display summary of changed files
  if (result.updatedFiles.length > 0 || result.removedFiles.length > 0) {
    console.log(chalk.bold('\n📄 Documentation Files Changed:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    if (result.updatedFiles.length > 0) {
      console.log(chalk.green('\n✅ Updated/Created:'));
      result.updatedFiles.forEach(file => {
        console.log(`  ${chalk.green('●')} ${file}`);
      });
    }
    
    if (result.removedFiles.length > 0) {
      console.log(chalk.red('\n🗑️  Removed:'));
      result.removedFiles.forEach(file => {
        console.log(`  ${chalk.red('●')} ${file}`);
      });
    }
    
    console.log(chalk.gray('─'.repeat(50)));
  }

  // Get usage statistics
  const usageStats = llmClient.getUsageStats();
  ui.displayGenerationSummary(result.updated, 0, usageStats, true);
  ui.displaySuccess(`Documentation updated! Processed ${result.updated} files.`);
}

export async function runPreview(repoPath: string, options: any): Promise<void> {
  const resolvedPath = path.resolve(repoPath);
  
  // Display welcome
  ui.displayWelcome('0.1.0');
  
  ui.startSpinner('Initializing analysis...');

  // Initialize services
  const fileMapper = new FileMapper(options.exclude || []);
  const gitService = new GitService(resolvedPath);
  const changeAnalyzer = new ChangeAnalyzer(gitService, fileMapper);

  // Check if it's a git repository
  if (!gitService.isGitRepository()) {
    ui.updateSpinner('Not a git repository', 'fail');
    ui.displayError('The specified path is not a git repository. Preview requires git tracking.');
    process.exit(1);
  }

  // Check if context has been initialized
  const outputDir = path.resolve(options.output || './.context');
  if (!gitService.hasContextBeenInitialized(outputDir)) {
    ui.updateSpinner('Context not initialized', 'fail');
    ui.displayError('No documentation context found. You should run analyze and init before previewing changes to update.');
    console.log(chalk.bold('\n💡 Getting Started:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('1. Analyze:')} ai-context analyze ${repoPath}`);
    console.log(`${chalk.blue('2. Initialize:')} ai-context init ${repoPath}`);
    console.log(`${chalk.blue('3. Preview:')} ai-context preview ${repoPath}`);
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('The analyze command shows token estimates and costs.'));
    console.log(chalk.gray('The init command creates the initial documentation.'));
    console.log(chalk.gray('The preview command shows what would change in updates.'));
    process.exit(1);
  }

  ui.updateSpinner('Mapping repository structure...');

  // Map repository structure
  const repoStructure = await fileMapper.mapRepository(
    resolvedPath,
    options.include
  );

  ui.updateSpinner('Analyzing changes...');

  // Detect changes
  let changes;
  if (options.staged) {
    // For pre-commit hooks - analyze only staged files
    changes = gitService.getStagedChanges();
  } else if (options.since) {
    // Compare against specific commit
    changes = gitService.getChangedFiles(options.since);
  } else {
    // Compare against last processed commit
    changes = gitService.getChangedFiles();
  }

  // Analyze the changes
  const analysis = await changeAnalyzer.analyzeChanges(repoStructure, changes);

  ui.stopSpinner();

  // Display the analysis
  changeAnalyzer.displayAnalysis(analysis, options.verbose);

  // Add token estimation if there are changes to process
  if (analysis.affectedModules.length > 0) {
    ui.startSpinner('Estimating token usage and costs for affected changes...');
    
    // Create a subset structure with only affected files
    const affectedFiles = new Set<string>();
    
    // Add all files from affected modules
    for (const module of analysis.affectedModules) {
      module.affectedFiles.forEach(filePath => {
        // Convert to absolute path to match repoStructure.files format
        const absolutePath = path.resolve(resolvedPath, filePath);
        if (fileMapper.isTextFile(absolutePath)) {
          affectedFiles.add(absolutePath);
        }
      });
    }
    
    // Also add directly changed files
    [...changes.added, ...changes.modified].forEach(filePath => {
      const fullPath = path.resolve(resolvedPath, filePath);
      if (fileMapper.isTextFile(fullPath)) {
        affectedFiles.add(fullPath);
      }
    });
    
    // Debug: Log the affected files and available files for comparison
    if (options.verbose) {
      console.log(chalk.gray(`\nDebug: Found ${affectedFiles.size} affected files:`));
      for (const file of Array.from(affectedFiles).slice(0, 5)) {
        const relativePath = path.relative(resolvedPath, file);
        console.log(chalk.gray(`  - ${relativePath}`));
      }
      if (affectedFiles.size > 5) {
        console.log(chalk.gray(`  ... and ${affectedFiles.size - 5} more`));
      }
    }
    
    // Create a reduced repo structure for estimation
    const matchedFiles = repoStructure.files.filter(file => affectedFiles.has(file.path));
    
    const affectedRepoStructure = {
      ...repoStructure,
      files: matchedFiles,
      totalFiles: matchedFiles.length
    };
    
    if (options.verbose) {
      console.log(chalk.gray(`Debug: Matched ${matchedFiles.length} files from repo structure`));
    }
    
    const tokenEstimator = new TokenEstimator(fileMapper);
    const tokenEstimate = await tokenEstimator.estimateTokensForFullGeneration(affectedRepoStructure);
    
    ui.stopSpinner();
    
    // Display the token estimate
    console.log(chalk.bold('\n🔮 Token & Cost Estimate for Preview Changes:'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(tokenEstimator.formatTokenEstimate(tokenEstimate));
  }

  // Summary
  if (analysis.affectedModules.length > 0) {
    console.log(chalk.green('\n✅ Ready to proceed with update command'));
    console.log(chalk.gray('Run the same command with "update" instead of "preview" to apply changes'));
  } else {
    console.log(chalk.yellow('\n📄 No updates needed - documentation is up to date'));
  }
}

// Check if no arguments were provided (interactive mode)
if (process.argv.length === 2) {
  const interactive = new InteractiveMode();
  interactive.start().catch((error) => {
    ui.displayError('Interactive mode failed', error);
    process.exit(1);
  });
} else {
  program.parse();
}