#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';

import { colors } from './utils/theme';
import { PlanGenerator } from './generators/plans/planGenerator';
import { CLIInterface } from './utils/cliUI';
import { checkForUpdates } from './utils/versionChecker';
import { createTranslator, detectLocale, SUPPORTED_LOCALES, normalizeLocale } from './utils/i18n';
import type { TranslateFn, Locale, TranslationKey } from './utils/i18n';
import { LLMConfig, AIProvider } from './types';
import { InitService } from './services/init/initService';
import { FillService } from './services/fill/fillService';
import { PlanService } from './services/plan/planService';
import { SyncService } from './services/sync/syncService';
import { ImportRulesService, ImportAgentsService } from './services/import';
import { ServeService } from './services/serve';
import { startMCPServer } from './services/mcp';
import { StateDetector } from './services/state';
import { UpdateService } from './services/update';
import { WorkflowService, WorkflowServiceDependencies } from './services/workflow';
import { StartService } from './services/start';
import { ExportRulesService, EXPORT_PRESETS } from './services/export';
import { ReportService } from './services/report';
import { StackDetector } from './services/stack';
import { QuickSyncService } from './services/quickSync';
import { AutoAdvanceDetector } from './services/workflow/autoAdvance';
import { getScaleName, PHASE_NAMES_PT, PHASE_NAMES_EN, ROLE_DISPLAY_NAMES, ROLE_DISPLAY_NAMES_EN, type PrevcRole, ProjectScale } from './workflow';
import { DEFAULT_MODELS, getApiKeyFromEnv } from './services/ai/providerFactory';
import {
  detectSmartDefaults,
  promptInteractiveMode,
  promptLLMConfig,
  promptAnalysisOptions,
  promptConfirmProceed,
  displayConfigSummary,
  type ConfigSummary
} from './utils/prompts';
import { VERSION, PACKAGE_NAME } from './version';

const rawArgs = process.argv.slice(2);
const isMcpCommand = rawArgs.includes('mcp');
if (!isMcpCommand) {
  dotenv.config();
}

const initialLocale = detectLocale(rawArgs, process.env.AI_CONTEXT_LANG);
let currentLocale: Locale = initialLocale;
let translateFn = createTranslator(initialLocale);
const t: TranslateFn = (key, params) => translateFn(key, params);

const localeLabelKeys: Record<Locale, TranslationKey> = {
  en: 'prompts.language.option.en',
  'pt-BR': 'prompts.language.option.pt-BR'
};

const program = new Command();
const ui = new CLIInterface(t);
const DEFAULT_MODEL = 'gemini-3-flash-preview';	

const initService = new InitService({
  ui,
  t,
  version: VERSION
});

const fillService = new FillService({
  ui,
  t,
  version: VERSION,
  defaultModel: DEFAULT_MODEL
});

const planService = new PlanService({
  ui,
  t,
  version: VERSION,
  defaultModel: DEFAULT_MODEL
});

const syncService = new SyncService({
  ui,
  t,
  version: VERSION
});

const importRulesService = new ImportRulesService({
  ui,
  t,
  version: VERSION
});

const importAgentsService = new ImportAgentsService({
  ui,
  t,
  version: VERSION
});

const updateService = new UpdateService({
  ui,
  t
});

program
  .name('ai-context')
  .description(t('cli.description'))
  .version(VERSION);

program.option('-l, --lang <locale>', t('global.options.lang'), initialLocale);

let versionCheckPromise: Promise<void> | null = null;

function scheduleVersionCheck(force: boolean = false): Promise<void> {
  if (!versionCheckPromise || force) {
    versionCheckPromise = checkForUpdates({
      packageName: PACKAGE_NAME,
      currentVersion: VERSION,
      ui,
      t,
      force
    }).catch(() => {});
  }

  return versionCheckPromise;
}

program.hook('preAction', () => {
  void scheduleVersionCheck();
});

program
  .command('init')
  .description(t('commands.init.description'))
  .argument('<repo-path>', t('commands.init.arguments.repoPath'))
  .argument('[type]', t('commands.init.arguments.type'), 'both')
  .option('-o, --output <dir>', t('commands.init.options.output'), './.context')
  .option('--exclude <patterns...>', t('commands.init.options.exclude'))
  .option('--include <patterns...>', t('commands.init.options.include'))
  .option('-v, --verbose', t('commands.init.options.verbose'))
  .option('--no-semantic', t('commands.init.options.noSemantic'))
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      await initService.run(repoPath, type, options);
    } catch (error) {
      ui.displayError(t('errors.init.scaffoldFailed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('fill')
  .description(t('commands.fill.description'))
  .argument('<repo-path>', t('commands.fill.arguments.repoPath'))
  .option('-o, --output <dir>', t('commands.fill.options.output'), './.context')
  .option('-k, --api-key <key>', t('commands.fill.options.apiKey'))
  .option('-m, --model <model>', t('commands.fill.options.model'), DEFAULT_MODEL)
  .option('-p, --provider <provider>', t('commands.fill.options.provider'))
  .option('--base-url <url>', t('commands.fill.options.baseUrl'))
  .option('--prompt <file>', t('commands.fill.options.prompt'))
  .option('--limit <number>', t('commands.fill.options.limit'), (value: string) => parseInt(value, 10))
  .option('--exclude <patterns...>', t('commands.fill.options.exclude'))
  .option('--include <patterns...>', t('commands.fill.options.include'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
  .option('--no-semantic', t('commands.fill.options.noSemantic'))
  .option('--languages <langs>', t('commands.fill.options.languages'))
  .option('--use-lsp', t('commands.fill.options.useLsp'))
  .action(async (repoPath: string, options: any) => {
    try {
      await fillService.run(repoPath, options);
    } catch (error) {
      ui.displayError(t('errors.fill.failed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Analyze code changes and update affected documentation')
  .argument('[repo-path]', 'Repository path to analyze', '.')
  .option('-o, --output <dir>', 'Output directory', './.context')
  .option('--days <number>', 'Days to look back for changes', (v: string) => parseInt(v, 10), 30)
  .option('--dry-run', 'Show what would be updated without making changes')
  .option('--no-git', 'Use mtime instead of git for change detection')
  .option('-k, --api-key <key>', 'API key for LLM provider')
  .option('-m, --model <model>', 'Model to use', DEFAULT_MODEL)
  .option('-p, --provider <provider>', 'LLM provider')
  .option('--base-url <url>', 'Custom base URL for API')
  .option('-v, --verbose', 'Verbose output')
  .action(async (repoPath: string, options: any) => {
    try {
      const outputDir = path.resolve(options.output || './.context');

      const analysis = await updateService.analyze(repoPath, {
        output: options.output,
        days: options.days,
        useGit: options.git !== false,
        verbose: options.verbose
      });

      updateService.displayAnalysis(analysis);

      if (options.dryRun) {
        return;
      }

      const filesToUpdate = updateService.getFilesToUpdate(analysis);

      if (filesToUpdate.length === 0) {
        return;
      }

      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: `Update ${filesToUpdate.length} document(s)?`,
        default: true
      }]);

      if (!proceed) {
        return;
      }

      // Run fill on affected docs
      // Convert absolute paths to relative paths from the output directory
      await fillService.run(repoPath, {
        output: options.output,
        include: filesToUpdate.map(f => path.relative(outputDir, f)),
        model: options.model,
        provider: options.provider,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        verbose: options.verbose,
        semantic: true
      });

      ui.displaySuccess('Documentation updated!');
    } catch (error) {
      ui.displayError('Failed to update documentation', error as Error);
      process.exit(1);
    }
  });

program
  .command('plan')
  .description(t('commands.plan.description'))
  .argument('<plan-name>', t('commands.plan.arguments.planName'))
  .option('-o, --output <dir>', t('commands.plan.options.output'), './.context')
  .option('--title <title>', t('commands.plan.options.title'))
  .option('--summary <text>', t('commands.plan.options.summary'))
  .option('-f, --force', t('commands.plan.options.force'))
  .option('--fill', t('commands.plan.options.fill'))
  .option('-r, --repo <path>', t('commands.plan.options.repo'))
  .option('-k, --api-key <key>', t('commands.plan.options.apiKey'))
  .option('-m, --model <model>', t('commands.plan.options.model'), DEFAULT_MODEL)
  .option('-p, --provider <provider>', t('commands.plan.options.provider'))
  .option('--base-url <url>', t('commands.plan.options.baseUrl'))
  .option('--prompt <file>', t('commands.plan.options.prompt'))
  .option('--dry-run', t('commands.plan.options.dryRun'), false)
  .option('--include <patterns...>', t('commands.plan.options.include'))
  .option('--exclude <patterns...>', t('commands.plan.options.exclude'))
  .option('-v, --verbose', t('commands.plan.options.verbose'))
  .option('--no-semantic', t('commands.plan.options.noSemantic'))
  .option('--no-lsp', t('commands.plan.options.noLsp'))
  .action(async (planName: string, rawOptions: any) => {
    const outputDir = path.resolve(rawOptions.output || './.context');

    if (rawOptions.fill) {
      try {
        await planService.scaffoldPlanIfNeeded(planName, outputDir, {
          title: rawOptions.title,
          summary: rawOptions.summary,
          force: Boolean(rawOptions.force),
          verbose: Boolean(rawOptions.verbose)
        });

        await planService.fillPlan(planName, { ...rawOptions, output: outputDir });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
        process.exit(1);
      }
      return;
    }

    const generator = new PlanGenerator();

    ui.startSpinner(t('spinner.plan.creating'));

    try {
      const result = await generator.generatePlan({
        planName,
        outputDir,
        title: rawOptions.title,
        summary: rawOptions.summary,
        force: Boolean(rawOptions.force),
        verbose: Boolean(rawOptions.verbose),
        semantic: rawOptions.semantic !== false,
        projectPath: rawOptions.repo ? path.resolve(rawOptions.repo) : path.resolve(rawOptions.output || './.context', '..')
      });

      ui.updateSpinner(t('spinner.plan.created'), 'success');
      ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
    } catch (error) {
      ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
      ui.displayError(t('errors.plan.creationFailed'), error as Error);
      process.exit(1);
    } finally {
      ui.stopSpinner();
    }
  });

program
  .command('sync-agents')
  .description(t('commands.sync.description'))
  .option('-s, --source <dir>', t('commands.sync.options.source'), './.context/agents')
  .option('-t, --target <paths...>', t('commands.sync.options.target'))
  .option('-m, --mode <type>', t('commands.sync.options.mode'), 'symlink')
  .option('-p, --preset <name>', t('commands.sync.options.preset'))
  .option('--force', t('commands.sync.options.force'))
  .option('--dry-run', t('commands.sync.options.dryRun'))
  .option('-v, --verbose', t('commands.sync.options.verbose'))
  .action(async (options: any) => {
    try {
      await syncService.run(options);
    } catch (error) {
      ui.displayError(t('errors.sync.failed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('import-rules')
  .description(t('commands.importRules.description'))
  .argument('[repo-path]', 'Repository path to scan', process.cwd())
  .option('-s, --source <paths...>', t('commands.importRules.options.source'))
  .option('-t, --target <dir>', t('commands.importRules.options.target'))
  .option('-f, --format <format>', t('commands.importRules.options.format'), 'markdown')
  .option('--force', t('commands.importRules.options.force'))
  .option('--dry-run', t('commands.importRules.options.dryRun'))
  .option('-v, --verbose', t('commands.importRules.options.verbose'))
  .option('--no-auto-detect', 'Disable auto-detection')
  .action(async (repoPath: string, options: any) => {
    try {
      await importRulesService.run({
        source: options.source,
        target: options.target,
        format: options.format,
        force: options.force,
        dryRun: options.dryRun,
        verbose: options.verbose,
        autoDetect: options.autoDetect !== false
      }, repoPath);
    } catch (error) {
      ui.displayError(t('errors.import.failed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('import-agents')
  .description(t('commands.importAgents.description'))
  .argument('[repo-path]', 'Repository path to scan', process.cwd())
  .option('-s, --source <paths...>', t('commands.importAgents.options.source'))
  .option('-t, --target <dir>', t('commands.importAgents.options.target'))
  .option('--force', t('commands.importAgents.options.force'))
  .option('--dry-run', t('commands.importAgents.options.dryRun'))
  .option('-v, --verbose', t('commands.importAgents.options.verbose'))
  .option('--no-auto-detect', 'Disable auto-detection')
  .action(async (repoPath: string, options: any) => {
    try {
      await importAgentsService.run({
        source: options.source,
        target: options.target,
        force: options.force,
        dryRun: options.dryRun,
        verbose: options.verbose,
        autoDetect: options.autoDetect !== false
      }, repoPath);
    } catch (error) {
      ui.displayError(t('errors.import.failed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start passthrough server for external AI agents (stdin/stdout JSON)')
  .option('-r, --repo-path <path>', 'Default repository path for tools')
  .option('-f, --format <format>', 'Output format: json or jsonl', 'jsonl')
  .option('-v, --verbose', 'Enable verbose logging to stderr')
  .action(async (options: any) => {
    const service = new ServeService({
      repoPath: options.repoPath,
      format: options.format,
      verbose: options.verbose
    });

    try {
      await service.run();
    } catch (error) {
      if (options.verbose) {
        process.stderr.write(`[serve] Error: ${error}\n`);
      }
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start MCP (Model Context Protocol) server for Claude Code integration')
  .option('-r, --repo-path <path>', 'Default repository path for tools')
  .option('-v, --verbose', 'Enable verbose logging to stderr')
  .action(async (options: any) => {
    try {
      const server = await startMCPServer({
        repoPath: options.repoPath,
        verbose: options.verbose
      });

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await server.stop();
        process.exit(0);
      });
    } catch (error) {
      if (options.verbose) {
        process.stderr.write(`[mcp] Error: ${error}\n`);
      }
      process.exit(1);
    }
  });

// Smart Start Command
program
  .command('start')
  .description(t('commands.start.description'))
  .argument('[feature-name]', t('commands.start.arguments.featureName'))
  .option('-t, --template <template>', t('commands.start.options.template'), 'auto')
  .option('--skip-fill', t('commands.start.options.skipFill'))
  .option('--skip-workflow', t('commands.start.options.skipWorkflow'))
  .option('-k, --api-key <key>', t('commands.fill.options.apiKey'))
  .option('-m, --model <model>', t('commands.fill.options.model'), DEFAULT_MODEL)
  .option('-p, --provider <provider>', t('commands.fill.options.provider'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
  .action(async (featureName: string | undefined, options: any) => {
    try {
      const startService = new StartService({
        ui,
        t,
        version: VERSION,
        defaultModel: DEFAULT_MODEL,
      });

      const result = await startService.run(process.cwd(), {
        featureName,
        template: options.template,
        skipFill: options.skipFill,
        skipWorkflow: options.skipWorkflow,
        apiKey: options.apiKey,
        model: options.model,
        provider: options.provider,
        verbose: options.verbose,
      });

      // Display summary
      const details: string[] = [];
      if (result.initialized) details.push('context initialized');
      if (result.filled) details.push('docs filled');
      if (result.workflowStarted) details.push(`workflow started (${getScaleName(result.scale!)})`);
      if (result.stackDetected?.primaryLanguage) {
        details.push(`stack: ${result.stackDetected.primaryLanguage}`);
      }

      ui.displaySuccess(t('success.start.complete', { details: details.join(', ') }));
    } catch (error) {
      ui.displayError(t('errors.cli.executionFailed'), error as Error);
      process.exit(1);
    }
  });

// Export Rules Command
program
  .command('export-rules')
  .description(t('commands.export.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-s, --source <dir>', t('commands.export.options.source'), '.context/docs')
  .option('-t, --targets <paths...>', t('commands.export.options.targets'))
  .option('--preset <name>', t('commands.export.options.preset'))
  .option('--force', t('commands.export.options.force'))
  .option('--dry-run', t('commands.export.options.dryRun'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
  .action(async (repoPath: string, options: any) => {
    try {
      const exportService = new ExportRulesService({
        ui,
        t,
        version: VERSION,
      });

      await exportService.run(repoPath, {
        source: options.source,
        targets: options.targets,
        preset: options.preset,
        force: options.force,
        dryRun: options.dryRun,
        verbose: options.verbose,
      });
    } catch (error) {
      ui.displayError(t('errors.cli.executionFailed'), error as Error);
      process.exit(1);
    }
  });

// Report Command
program
  .command('report')
  .description(t('commands.report.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-f, --format <format>', t('commands.report.options.format'), 'console')
  .option('-o, --output <path>', t('commands.report.options.output'))
  .option('--include-stack', t('commands.report.options.includeStack'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
  .action(async (repoPath: string, options: any) => {
    try {
      const reportService = new ReportService({
        ui,
        t,
        version: VERSION,
      });

      const report = await reportService.generate(repoPath, {
        format: options.format,
        output: options.output,
        includeStack: options.includeStack,
        verbose: options.verbose,
      });

      await reportService.output(report, options);
    } catch (error) {
      ui.displayError(t('errors.cli.executionFailed'), error as Error);
      process.exit(1);
    }
  });

// Skill Commands
const skillCommand = program
  .command('skill')
  .description(t('commands.skill.description'));

skillCommand
  .command('init')
  .description(t('commands.skill.init.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-f, --force', 'Overwrite existing files')
  .option('--skills <skills...>', 'Specific skills to scaffold')
  .action(async (repoPath: string, options: any) => {
    try {
      const { createSkillGenerator } = await import('./generators/skills');
      const generator = createSkillGenerator({ repoPath });
      const result = await generator.generate({
        skills: options.skills,
        force: options.force,
      });

      ui.displaySuccess(`Skills initialized in ${result.skillsDir}`);
      ui.displayInfo('Generated', result.generatedSkills.join(', ') || 'none');
      if (result.skippedSkills.length > 0) {
        ui.displayInfo('Skipped (already exist)', result.skippedSkills.join(', '));
      }
    } catch (error) {
      ui.displayError('Failed to initialize skills', error as Error);
      process.exit(1);
    }
  });

skillCommand
  .command('fill')
  .description(t('commands.skill.fill.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-o, --output <dir>', 'Output directory', '.context')
  .option('-f, --force', 'Overwrite existing content')
  .option('--skills <skills...>', 'Specific skills to fill')
  .option('--model <model>', 'LLM model to use')
  .option('--provider <provider>', 'LLM provider (anthropic, openai, google, openrouter)')
  .option('--api-key <key>', 'API key for LLM provider')
  .option('--base-url <url>', 'Base URL for custom LLM endpoint')
  .option('--no-semantic', 'Disable semantic context mode')
  .option('--use-lsp', 'Enable LSP for deeper analysis')
  .option('-v, --verbose', 'Show detailed progress')
  .option('--limit <number>', 'Limit number of skills to fill', parseInt)
  .action(async (repoPath: string, options: any) => {
    try {
      const { SkillFillService } = await import('./services/fill/skillFillService');

      const skillFillService = new SkillFillService({
        ui,
        t,
        version: VERSION,
        defaultModel: DEFAULT_MODEL,
      });

      const result = await skillFillService.run(repoPath, {
        output: options.output,
        skills: options.skills,
        force: options.force,
        model: options.model,
        provider: options.provider,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        semantic: options.semantic,
        useLsp: options.useLsp,
        verbose: options.verbose,
        limit: options.limit,
      });

      if (result.filled.length > 0) {
        ui.displaySuccess(t('success.skill.filled', { count: result.filled.length }));
      }
    } catch (error) {
      ui.displayError(t('errors.skill.fillFailed'), error as Error);
      process.exit(1);
    }
  });

skillCommand
  .command('list')
  .description(t('commands.skill.list.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('--json', 'Output as JSON')
  .action(async (repoPath: string, options: any) => {
    try {
      const { createSkillRegistry, BUILT_IN_SKILLS } = await import('./workflow/skills');
      const registry = createSkillRegistry(repoPath);
      const discovered = await registry.discoverAll();

      if (options.json) {
        console.log(JSON.stringify({
          builtIn: discovered.builtIn.map(s => s.slug),
          custom: discovered.custom.map(s => s.slug),
          total: discovered.all.length,
        }, null, 2));
        return;
      }

      console.log('\nBuilt-in Skills:');
      for (const skill of discovered.builtIn) {
        const scaffolded = discovered.all.find(s => s.slug === skill.slug && s.path.includes('.context'));
        const status = scaffolded ? '[scaffolded]' : '[available]';
        console.log(`  ${skill.slug} ${status}`);
        console.log(`    ${skill.metadata.description}`);
      }

      if (discovered.custom.length > 0) {
        console.log('\nCustom Skills:');
        for (const skill of discovered.custom) {
          console.log(`  ${skill.slug}`);
          console.log(`    ${skill.metadata.description}`);
        }
      }

      console.log(`\nTotal: ${discovered.all.length} skills (${discovered.builtIn.length} built-in, ${discovered.custom.length} custom)`);
    } catch (error) {
      ui.displayError('Failed to list skills', error as Error);
      process.exit(1);
    }
  });

skillCommand
  .command('export')
  .description(t('commands.skill.export.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-p, --preset <preset>', 'Export preset: claude, gemini, codex, all', 'all')
  .option('-f, --force', 'Overwrite existing files')
  .option('--include-builtin', 'Include built-in skills even if not scaffolded')
  .option('--dry-run', 'Preview changes without writing')
  .action(async (repoPath: string, options: any) => {
    try {
      const { SkillExportService } = await import('./services/export/skillExportService');
      const exportService = new SkillExportService({
        ui,
        t,
        version: VERSION,
      });

      const result = await exportService.run(repoPath, {
        preset: options.preset,
        force: options.force,
        includeBuiltIn: options.includeBuiltin,
        dryRun: options.dryRun,
      });

      if (options.dryRun) {
        ui.displayInfo('Dry run', 'No files were written');
      } else {
        ui.displaySuccess(`Exported ${result.skillsExported.length} skills to ${result.targets.length} targets`);
      }
    } catch (error) {
      ui.displayError('Failed to export skills', error as Error);
      process.exit(1);
    }
  });

skillCommand
  .command('create <name>')
  .description(t('commands.skill.create.description'))
  .argument('[repo-path]', 'Repository path', process.cwd())
  .option('-d, --description <text>', 'Skill description')
  .option('--phases <phases...>', 'PREVC phases (P, R, E, V, C)')
  .option('-f, --force', 'Overwrite if exists')
  .action(async (name: string, repoPath: string, options: any) => {
    try {
      const { createSkillGenerator } = await import('./generators/skills');
      const generator = createSkillGenerator({ repoPath });
      const skillPath = await generator.generateCustomSkill({
        name,
        description: options.description || `TODO: Describe when to use ${name}`,
        phases: options.phases,
        force: options.force,
      });

      ui.displaySuccess(`Created skill: ${name}`);
      ui.displayInfo('Path', skillPath);
    } catch (error) {
      ui.displayError('Failed to create skill', error as Error);
      process.exit(1);
    }
  });

// PREVC Workflow Commands
const workflowCommand = program
  .command('workflow')
  .description('PREVC workflow management (Planning, Review, Execution, Validation, Confirmation)');

// Helper to create workflow service dependencies
const getWorkflowDeps = (): WorkflowServiceDependencies => ({
  ui: {
    displaySuccess: (msg: string) => ui.displaySuccess(msg),
    displayError: (msg: string, err?: Error) => ui.displayError(msg, err),
    displayInfo: (title: string, detail?: string) => ui.displayInfo(title, detail || '')
  }
});

workflowCommand
  .command('init <name>')
  .description('Initialize a new PREVC workflow')
  .option('-d, --description <text>', 'Project description for scale detection')
  .option('-s, --scale <scale>', 'Project scale: QUICK, SMALL, MEDIUM, LARGE, ENTERPRISE')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .action(async (name: string, options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());
      const status = await workflowService.init({
        name,
        description: options.description,
        scale: options.scale
      });

      ui.displaySuccess(`Workflow PREVC initialized: ${name}`);
      ui.displayInfo('Scale', getScaleName(status.project.scale as any));
      ui.displayInfo('Current Phase', `${status.project.current_phase} - ${PHASE_NAMES_PT[status.project.current_phase]}`);
    } catch (error) {
      ui.displayError('Failed to initialize workflow', error as Error);
      process.exit(1);
    }
  });

workflowCommand
  .command('status')
  .description('Show current workflow status')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .action(async (options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());

      if (!await workflowService.hasWorkflow()) {
        ui.displayError('No workflow found. Run "workflow init <name>" first.');
        process.exit(1);
      }

      const formattedStatus = await workflowService.getFormattedStatus();
      console.log(formattedStatus);

      const actions = await workflowService.getRecommendedActions();
      if (actions.length > 0) {
        console.log('\nRecommended actions:');
        actions.forEach((action, i) => console.log(`  ${i + 1}. ${action}`));
      }
    } catch (error) {
      ui.displayError('Failed to get workflow status', error as Error);
      process.exit(1);
    }
  });

workflowCommand
  .command('advance')
  .description('Complete current phase and advance to next')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .option('-o, --outputs <files...>', 'Output files generated in current phase')
  .action(async (options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());

      if (!await workflowService.hasWorkflow()) {
        ui.displayError('No workflow found. Run "workflow init <name>" first.');
        process.exit(1);
      }

      const nextPhase = await workflowService.advance(options.outputs);

      if (nextPhase) {
        ui.displaySuccess(`Advanced to phase: ${nextPhase} - ${PHASE_NAMES_PT[nextPhase]}`);
      } else {
        ui.displaySuccess('Workflow completed!');
      }
    } catch (error) {
      ui.displayError('Failed to advance workflow', error as Error);
      process.exit(1);
    }
  });

workflowCommand
  .command('handoff <from> <to>')
  .description('Perform handoff between roles')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .option('-a, --artifacts <files...>', 'Artifacts to hand off')
  .action(async (from: string, to: string, options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());

      if (!await workflowService.hasWorkflow()) {
        ui.displayError('No workflow found. Run "workflow init <name>" first.');
        process.exit(1);
      }

      await workflowService.handoff(from as PrevcRole, to as PrevcRole, options.artifacts || []);
      ui.displaySuccess(`Handoff: ${ROLE_DISPLAY_NAMES[from as PrevcRole]} → ${ROLE_DISPLAY_NAMES[to as PrevcRole]}`);
    } catch (error) {
      ui.displayError('Failed to perform handoff', error as Error);
      process.exit(1);
    }
  });

workflowCommand
  .command('collaborate <topic>')
  .description('Start a collaboration session between roles')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .option('-p, --participants <roles...>', 'Participating roles')
  .action(async (topic: string, options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());

      const session = await workflowService.startCollaboration(
        topic,
        options.participants as PrevcRole[]
      );

      ui.displaySuccess(`Collaboration started: ${topic}`);
      ui.displayInfo('Session ID', session.getId());
      ui.displayInfo('Participants', session.getParticipantNames().join(', '));
      console.log('\nUse MCP tools to contribute and synthesize the collaboration.');
    } catch (error) {
      ui.displayError('Failed to start collaboration', error as Error);
      process.exit(1);
    }
  });

workflowCommand
  .command('role <action> <role>')
  .description('Manage role status (start/complete)')
  .option('-r, --repo-path <path>', 'Repository path', process.cwd())
  .option('-o, --outputs <files...>', 'Output files (for complete action)')
  .action(async (action: string, role: string, options: any) => {
    try {
      const workflowService = new WorkflowService(options.repoPath, getWorkflowDeps());

      if (!await workflowService.hasWorkflow()) {
        ui.displayError('No workflow found. Run "workflow init <name>" first.');
        process.exit(1);
      }

      if (action === 'start') {
        await workflowService.startRole(role as PrevcRole);
        ui.displaySuccess(`Started role: ${ROLE_DISPLAY_NAMES[role as PrevcRole]}`);
      } else if (action === 'complete') {
        await workflowService.completeRole(role as PrevcRole, options.outputs || []);
        ui.displaySuccess(`Completed role: ${ROLE_DISPLAY_NAMES[role as PrevcRole]}`);
      } else {
        ui.displayError(`Unknown action: ${action}. Use 'start' or 'complete'.`);
        process.exit(1);
      }
    } catch (error) {
      ui.displayError('Failed to manage role', error as Error);
      process.exit(1);
    }
  });

export async function runInit(repoPath: string, type: string, rawOptions: any): Promise<void> {
  await initService.run(repoPath, type, rawOptions);
}

export async function runGenerate(repoPath: string, options: any): Promise<void> {
  const type = options?.docsOnly ? 'docs' : options?.agentsOnly ? 'agents' : (options?.type || 'both');

  await initService.run(repoPath, type, {
    output: options?.output ?? options?.outputDir ?? './.context',
    include: options?.include,
    exclude: options?.exclude,
    verbose: options?.verbose,
    docsOnly: options?.docsOnly,
    agentsOnly: options?.agentsOnly
  });
}

export async function runAnalyze(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.analyzeRemoved'));
}

export async function runUpdate(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.updateRemoved'));
}

export async function runPreview(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.previewRemoved'));
}

export async function runGuidelines(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.guidelinesRemoved'));
}

export async function runLlmFill(repoPath: string, rawOptions: any): Promise<void> {
  await fillService.run(repoPath, rawOptions);
}

async function selectLocale(showWelcome: boolean): Promise<void> {
  const { locale } = await inquirer.prompt<{ locale: Locale }>([
    {
      type: 'list',
      name: 'locale',
      message: t('prompts.language.select'),
      default: currentLocale,
      choices: SUPPORTED_LOCALES.map(option => ({
        value: option,
        name: t(localeLabelKeys[option])
      }))
    }
  ]);

  const normalizedLocale = normalizeLocale(locale);
  currentLocale = normalizedLocale;
  translateFn = createTranslator(normalizedLocale);

  if (showWelcome) {
    ui.displayWelcome(VERSION);
    ui.displayPrevcExplanation();
  }
}

type InteractiveAction = 'scaffold' | 'fill' | 'plan' | 'syncAgents' | 'update' | 'workflow' | 'skills' | 'changeLanguage' | 'exit' | 'quickSync' | 'agents' | 'settings';
type StateAction = 'create' | 'fill' | 'menu' | 'exit' | 'scaffold';

async function runInteractive(): Promise<void> {
  await selectLocale(false); // Don't show welcome yet

  // Show welcome screen with PREVC explanation
  ui.displayWelcome(VERSION);
  ui.displayPrevcExplanation();

  // Wait for user to press Enter
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...',
    },
  ]);

  console.log('\n');

  const projectPath = process.cwd();
  const detector = new StateDetector({ projectPath });
  const result = await detector.detect();

  // Get quick stats for compact status
  const quickSyncService = new QuickSyncService({
    ui,
    t,
    version: VERSION,
    defaultModel: DEFAULT_MODEL,
  });
  const stats = await quickSyncService.getStats(projectPath);

  // Display compact header
  console.log('');
  console.log(`${colors.primaryBold(`${PACKAGE_NAME}`)} ${colors.secondary(`v${VERSION}`)}`);
  console.log(`${colors.secondary('Project:')} ${projectPath}`);

  // Show compact status line based on state
  switch (result.state) {
    case 'new':
      console.log(colors.secondaryDim(t('status.new')));
      break;
    case 'unfilled':
      console.log(colors.secondaryDim(t('status.unfilled', { count: result.details.unfilledFiles })));
      break;
    case 'outdated':
      console.log(colors.warning(
        t('status.outdated', {
          docs: stats.docs,
          days: result.details.daysBehind || 0,
          agents: stats.agents,
          skills: stats.skills
        })
      ));
      break;
    case 'ready':
      console.log(colors.success(
        t('status.compact', {
          docs: stats.docs,
          agents: stats.agents,
          skills: stats.skills
        })
      ));
      break;
  }
  console.log('');

  // Handle state-based flow
  if (result.state === 'new') {
    const { action } = await inquirer.prompt<{ action: StateAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.main.action'),
        choices: [
          { name: t('prompts.main.choice.quickSetup'), value: 'create' },
          { name: t('prompts.main.choice.scaffoldOnly'), value: 'scaffold' },
          { name: t('prompts.main.choice.exit'), value: 'exit' }
        ]
      }
    ]);

    if (action === 'create') {
      // Run init + fill with AI + LSP automatically
      await runQuickSetup(projectPath);
    } else if (action === 'scaffold') {
      // Scaffold only without AI fill
      await runInteractiveScaffold();
    }
    return;
  }

  if (result.state === 'unfilled') {
    const { action } = await inquirer.prompt<{ action: StateAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.main.unfilledPrompt', { count: result.details.unfilledFiles }),
        choices: [
          { name: t('prompts.main.choice.fill'), value: 'fill' },
          { name: t('prompts.main.choice.moreOptions'), value: 'menu' },
          { name: t('prompts.main.choice.exit'), value: 'exit' }
        ]
      }
    ]);

    if (action === 'fill') {
      await runInteractiveLlmFill();
      return;
    } else if (action === 'menu') {
      await runFullMenu();
    }
    return;
  }

  // For 'ready' or 'outdated' states, show full menu
  await runFullMenu(result.state === 'outdated' ? result.details.daysBehind : undefined);
}

async function runQuickSetup(projectPath: string): Promise<void> {
  // AI-first: Detect smart defaults automatically
  const defaults = await detectSmartDefaults();

  // If no API key found, prompt for one
  let llmConfig: { provider: AIProvider; model: string; apiKey?: string; baseUrl?: string } | null = null;

  if (defaults.apiKeyConfigured && defaults.provider) {
    // Auto-detected config
    llmConfig = {
      provider: defaults.provider,
      model: DEFAULT_MODEL,
      apiKey: getApiKeyFromEnv(defaults.provider!),
    };
    console.log(colors.secondary(`  Auto-detected: ${defaults.provider} API key found`));
  } else {
    // Need to get API key from user
    llmConfig = await promptLLMConfig(t);
    if (!llmConfig) {
      ui.displayInfo(t('info.setup.incomplete.title'), t('info.setup.incomplete.detail'));
      return;
    }
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: t('prompts.setup.confirmContinue'),
      default: true
    }
  ]);

  if (!confirm) {
    return;
  }

  // Run init with semantic analysis
  ui.startSpinner(t('spinner.setup.creatingStructure'));
  try {
    const localInitService = new InitService({ ui, t, version: VERSION });
    await localInitService.run(projectPath, 'both', {
      semantic: true
    });
    ui.stopSpinner();
  } catch (error) {
    ui.stopSpinner();
    ui.displayError('Failed to create structure', error as Error);
    return;
  }

  // Initialize skills too (AI-first)
  try {
    const { createSkillGenerator } = await import('./generators/skills');
    const skillGenerator = createSkillGenerator({ repoPath: projectPath });
    await skillGenerator.generate({});
  } catch {
    // Skills init failure is not critical
  }

  // Fill with AI + LSP (default behavior)
  ui.startSpinner(t('spinner.setup.fillingDocs'));
  try {
    const localFillService = new FillService({ ui, t, version: VERSION, defaultModel: DEFAULT_MODEL });
    await localFillService.run(projectPath, {
      model: llmConfig.model,
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      verbose: false,
      semantic: true,
      useLsp: true  // LSP enabled by default
    });
    ui.stopSpinner();
    ui.displaySuccess(t('success.setup.docsCreated'));
    console.log(colors.secondaryDim(`  ${t('info.setup.reviewFiles')}`));
  } catch (error) {
    ui.stopSpinner();
    ui.displayError('Failed to fill documentation', error as Error);
  }
}

async function runFullMenu(daysBehind?: number): Promise<void> {
  let exitRequested = false;
  while (!exitRequested) {
    const updateLabel = daysBehind
      ? t('prompts.main.choice.updateDocsBehind', { daysBehind })
      : t('prompts.main.choice.updateDocs');

    // New menu structure with separators - organized by frequency of use
    const choices = [
      // Quick Actions (most used)
      { name: t('prompts.main.choice.quickSync'), value: 'quickSync' as InteractiveAction },
      { name: t('prompts.main.choice.startWorkflow'), value: 'workflow' as InteractiveAction },
      { name: t('prompts.main.choice.createPlan'), value: 'plan' as InteractiveAction },
      new inquirer.Separator(),
      // Manage
      { name: updateLabel, value: 'fill' as InteractiveAction },
      { name: t('prompts.main.choice.manageSkills'), value: 'skills' as InteractiveAction },
      { name: t('prompts.main.choice.manageAgents'), value: 'agents' as InteractiveAction },
      new inquirer.Separator(),
      // Config
      { name: t('prompts.main.choice.rescaffold'), value: 'scaffold' as InteractiveAction },
      { name: t('prompts.main.choice.settings'), value: 'settings' as InteractiveAction },
      { name: t('prompts.main.choice.exit'), value: 'exit' as InteractiveAction }
    ];

    const { action } = await inquirer.prompt<{ action: InteractiveAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.main.action'),
        choices
      }
    ]);

    if (action === 'settings') {
      await runSettings();
      continue;
    }

    if (action === 'exit') {
      exitRequested = true;
      break;
    }

    if (action === 'quickSync') {
      await runQuickSync();
    } else if (action === 'scaffold') {
      await runInteractiveScaffold();
    } else if (action === 'fill') {
      await runInteractiveLlmFill();
    } else if (action === 'plan') {
      await runInteractivePlan();
    } else if (action === 'agents') {
      await runManageAgents();
    } else if (action === 'workflow') {
      await runInteractiveWorkflow();
    } else if (action === 'skills') {
      await runInteractiveSkills();
    }

    ui.displayInfo(
      t('info.interactive.returning.title'),
      t('info.interactive.returning.detail')
    );
  }

  ui.displaySuccess(t('success.interactive.goodbye'));
}

async function runInteractiveScaffold(): Promise<void> {
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: t('prompts.scaffold.repoPath'),
      default: process.cwd()
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');

  const { outputDir } = await inquirer.prompt<{ outputDir: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.init.options.output'),
      default: defaultOutput
    }
  ]);

  const { scaffoldType } = await inquirer.prompt<{ scaffoldType: 'both' | 'docs' | 'agents' }>([
    {
      type: 'list',
      name: 'scaffoldType',
      message: t('prompts.scaffold.type'),
      choices: [
        { name: t('prompts.scaffold.typeBoth'), value: 'both' },
        { name: t('prompts.scaffold.typeDocs'), value: 'docs' },
        { name: t('prompts.scaffold.typeAgents'), value: 'agents' }
      ],
      default: 'both'
    }
  ]);

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: t('prompts.common.verbose'),
      default: false
    }
  ]);

  await runInit(resolvedRepo, scaffoldType, {
    output: outputDir,
    verbose,
    semantic: true
  });
}

async function runInteractiveLlmFill(): Promise<void> {
  const defaults = await detectSmartDefaults();
  const interactiveMode = await promptInteractiveMode(t);

  if (interactiveMode === 'quick') {
    // Quick mode: minimal prompts with smart defaults
    const { confirmRepo } = await inquirer.prompt<{ confirmRepo: boolean }>([
      {
        type: 'confirm',
        name: 'confirmRepo',
        message: `${t('prompts.quick.confirmRepo')} (${defaults.repoPath})`,
        default: true
      }
    ]);

    const resolvedRepo = confirmRepo ? defaults.repoPath : (await inquirer.prompt<{ repoPath: string }>([
      { type: 'input', name: 'repoPath', message: t('prompts.fill.repoPath'), default: defaults.repoPath }
    ])).repoPath;

    // Get LLM config (auto-detected or prompt for API key)
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: true });

    // Build summary
    const summary: ConfigSummary = {
      operation: 'fill',
      repoPath: resolvedRepo,
      outputDir: defaults.outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        Semantic: true,
        Languages: defaults.detectedLanguages.join(', '),
        LSP: false
      }
    };

    displayConfigSummary(summary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      await fillService.run(resolvedRepo, {
        output: defaults.outputDir,
        model: llmConfig.model,
        provider: llmConfig.provider,
        apiKey: llmConfig.apiKey,
        verbose: false,
        semantic: true,
        languages: defaults.detectedLanguages,
        useLsp: false
      });
    }
    return;
  }

  // Advanced mode: full configuration
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: t('prompts.fill.repoPath'),
      default: defaults.repoPath
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');

  const { outputDir, promptPath: promptPathInput } = await inquirer.prompt<{ outputDir: string; promptPath: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.fill.options.output'),
      default: defaultOutput
    },
    {
      type: 'input',
      name: 'promptPath',
      message: t('prompts.fill.promptPath'),
      default: ''
    }
  ]);

  const promptPath = promptPathInput.trim() ? path.resolve(promptPathInput.trim()) : undefined;

  const { limit } = await inquirer.prompt<{ limit: string }>([
    {
      type: 'input',
      name: 'limit',
      message: t('prompts.fill.limit'),
      filter: (value: string) => value.trim()
    }
  ]);
  const limitValue = limit ? parseInt(limit, 10) : undefined;
  const parsedLimit = Number.isNaN(limitValue) ? undefined : limitValue;

  // Use shared LLM prompt helper
  const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: false });

  // Use shared analysis options prompt
  const analysisOptions = await promptAnalysisOptions(t, {
    languages: defaults.detectedLanguages,
    useLsp: false
  });

  // Show summary before execution
  const summary: ConfigSummary = {
    operation: 'fill',
    repoPath: resolvedRepo,
    outputDir,
    provider: llmConfig.provider,
    model: llmConfig.model,
    apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
    options: {
      Semantic: analysisOptions.semantic,
      Languages: analysisOptions.languages?.join(', ') || 'none',
      LSP: analysisOptions.useLsp,
      Verbose: analysisOptions.verbose,
      ...(parsedLimit ? { Limit: String(parsedLimit) } : {})
    }
  };

  displayConfigSummary(summary, t);
  const proceed = await promptConfirmProceed(t);

  if (proceed) {
    await fillService.run(resolvedRepo, {
      output: outputDir,
      prompt: promptPath,
      limit: parsedLimit,
      model: llmConfig.model,
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey,
      verbose: analysisOptions.verbose,
      semantic: analysisOptions.semantic,
      languages: analysisOptions.languages,
      useLsp: analysisOptions.useLsp
    });
  }
}

function generatePlanSlug(goal: string): string {
  return goal
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/-$/, '') || 'new-plan';
}

async function runInteractivePlan(): Promise<void> {
  const defaults = await detectSmartDefaults();

  // Ask what should be planned
  const { planGoal } = await inquirer.prompt<{ planGoal: string }>([
    {
      type: 'input',
      name: 'planGoal',
      message: t('prompts.plan.goal'),
      validate: (input: string) => input.trim().length > 0 || 'Please describe what should be planned'
    }
  ]);

  const planName = generatePlanSlug(planGoal);
  const planSummary = planGoal;

  const interactiveMode = await promptInteractiveMode(t);

  if (interactiveMode === 'quick') {
    // Quick mode: choose scaffold or fill with defaults
    const { action } = await inquirer.prompt<{ action: 'scaffold' | 'fill' }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.plan.mode'),
        choices: [
          { name: t('prompts.plan.modeScaffold'), value: 'scaffold' },
          { name: t('prompts.plan.modeFill'), value: 'fill' }
        ],
        default: 'scaffold'
      }
    ]);

    if (action === 'scaffold') {
      // Quick scaffold: just create the template
      const generator = new PlanGenerator();
      ui.startSpinner(t('spinner.plan.creating'));

      try {
        const result = await generator.generatePlan({
          planName,
          summary: planSummary,
          outputDir: defaults.outputDir,
          verbose: false,
          semantic: true,
          projectPath: defaults.repoPath
        });

        ui.updateSpinner(t('spinner.plan.created'), 'success');
        ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
      } catch (error) {
        ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
        ui.displayError(t('errors.plan.creationFailed'), error as Error);
      } finally {
        ui.stopSpinner();
      }
      return;
    }

    // Quick fill: use auto-detected LLM config
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: true });

    const configSummary: ConfigSummary = {
      operation: 'plan',
      repoPath: defaults.repoPath,
      outputDir: defaults.outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        Goal: planSummary,
        'File': `${planName}.md`,
        LSP: true,
        'Dry Run': false
      }
    };

    displayConfigSummary(configSummary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      try {
        await planService.scaffoldPlanIfNeeded(planName, defaults.outputDir, { summary: planSummary });
        await planService.fillPlan(planName, {
          output: defaults.outputDir,
          repo: defaults.repoPath,
          dryRun: false,
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey,
          lsp: true
        });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
      }
    }
    return;
  }

  // Advanced mode: full configuration
  const defaultOutput = path.resolve(process.cwd(), '.context');
  const { mode } = await inquirer.prompt<{ mode: 'scaffold' | 'fill' }>([
    {
      type: 'list',
      name: 'mode',
      message: t('prompts.plan.mode'),
      choices: [
        { name: t('prompts.plan.modeScaffold'), value: 'scaffold' },
        { name: t('prompts.plan.modeFill'), value: 'fill' }
      ],
      default: 'scaffold'
    }
  ]);

  const { outputDir } = await inquirer.prompt<{ outputDir: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.plan.options.output'),
      default: defaultOutput
    }
  ]);

  if (mode === 'fill') {
    const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
      {
        type: 'input',
        name: 'repoPath',
        message: t('prompts.plan.repoPath'),
        default: process.cwd()
      }
    ]);

    // Use shared LLM prompt helper
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: false });

    const { dryRun } = await inquirer.prompt<{ dryRun: boolean }>([
      {
        type: 'confirm',
        name: 'dryRun',
        message: t('prompts.plan.dryRun'),
        default: true
      }
    ]);

    const { useLsp } = await inquirer.prompt<{ useLsp: boolean }>([
      {
        type: 'confirm',
        name: 'useLsp',
        message: t('prompts.plan.useLsp'),
        default: true
      }
    ]);

    // Show summary before execution
    const advancedConfigSummary: ConfigSummary = {
      operation: 'plan',
      repoPath,
      outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        Goal: planSummary,
        'File': `${planName}.md`,
        LSP: useLsp,
        'Dry Run': dryRun
      }
    };

    displayConfigSummary(advancedConfigSummary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      try {
        const resolvedOutput = path.resolve(outputDir.trim() || defaultOutput);
        await planService.scaffoldPlanIfNeeded(planName, resolvedOutput, {
          summary: planSummary
        });

        await planService.fillPlan(planName, {
          output: resolvedOutput,
          repo: repoPath,
          dryRun,
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey,
          lsp: useLsp
        });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
      }
    }
    return;
  }

  // Scaffold mode - use planSummary from goal input
  const generator = new PlanGenerator();
  ui.startSpinner(t('spinner.plan.creating'));

  try {
    const result = await generator.generatePlan({
      planName,
      outputDir: path.resolve(outputDir.trim() || defaultOutput),
      summary: planSummary,
      verbose: false,
      semantic: true,
      projectPath: path.resolve(outputDir.trim() || defaultOutput, '..')
    });

    ui.updateSpinner(t('spinner.plan.created'), 'success');
    ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
  } catch (error) {
    ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
    ui.displayError(t('errors.plan.creationFailed'), error as Error);
  } finally {
    ui.stopSpinner();
  }
}

async function runInteractiveSync(): Promise<void> {
  const defaults = await detectSmartDefaults();
  const defaultSource = path.resolve(defaults.repoPath, '.context/agents');

  // Simplified: single prompt for target selection with common presets
  const { quickTarget } = await inquirer.prompt<{ quickTarget: string }>([
    {
      type: 'list',
      name: 'quickTarget',
      message: t('prompts.sync.quickTarget'),
      choices: [
        { name: t('prompts.sync.quickTarget.common'), value: 'common' },
        { name: t('prompts.sync.quickTarget.claude'), value: 'claude' },
        { name: t('prompts.sync.quickTarget.all'), value: 'all' },
        { name: t('prompts.sync.quickTarget.custom'), value: 'custom' }
      ],
      default: 'common'
    }
  ]);

  let preset: string | undefined;
  let target: string[] | undefined;
  let sourcePath = defaultSource;

  if (quickTarget === 'custom') {
    // Custom path: ask for source and target
    const answers = await inquirer.prompt<{ sourcePath: string; customPath: string }>([
      {
        type: 'input',
        name: 'sourcePath',
        message: t('prompts.sync.source'),
        default: defaultSource
      },
      {
        type: 'input',
        name: 'customPath',
        message: t('prompts.sync.customPath')
      }
    ]);
    sourcePath = answers.sourcePath;
    target = [answers.customPath];
  } else if (quickTarget === 'common') {
    // Common: Claude + GitHub - use explicit target paths instead of preset
    target = [
      path.resolve(defaults.repoPath, '.claude/agents'),
      path.resolve(defaults.repoPath, '.github/agents')
    ];
  } else {
    preset = quickTarget;
  }

  // Show summary
  const summary: ConfigSummary = {
    operation: 'sync',
    repoPath: sourcePath,
    options: {
      Target: quickTarget === 'custom' ? (target?.[0] || 'custom') : quickTarget,
      Mode: 'symlink'
    }
  };

  displayConfigSummary(summary, t);
  const proceed = await promptConfirmProceed(t);

  if (proceed) {
    try {
      await syncService.run({
        source: sourcePath,
        mode: 'symlink',
        preset: preset as any,
        target,
        force: false,
        dryRun: false
      });
    } catch (error) {
      ui.displayError(t('errors.sync.failed'), error as Error);
    }
  }
}

type WorkflowAction = 'init' | 'status' | 'advance' | 'back' | 'newWorkflow';

async function createNewWorkflow(workflowService: WorkflowService): Promise<boolean> {
  const { name, description, scale } = await inquirer.prompt<{
    name: string;
    description: string;
    scale: string;
  }>([
    {
      type: 'input',
      name: 'name',
      message: t('prompts.workflow.projectName'),
      validate: (input: string) => input.trim().length > 0 || t('prompts.workflow.projectNameRequired')
    },
    {
      type: 'input',
      name: 'description',
      message: t('prompts.workflow.description'),
      default: ''
    },
    {
      type: 'list',
      name: 'scale',
      message: t('prompts.workflow.scale'),
      choices: [
        { name: t('prompts.workflow.scale.auto'), value: '' },
        { name: t('prompts.workflow.scale.quick'), value: 'QUICK' },
        { name: t('prompts.workflow.scale.small'), value: 'SMALL' },
        { name: t('prompts.workflow.scale.medium'), value: 'MEDIUM' },
        { name: t('prompts.workflow.scale.large'), value: 'LARGE' },
        { name: t('prompts.workflow.scale.enterprise'), value: 'ENTERPRISE' }
      ],
      default: ''
    }
  ]);

  try {
    const status = await workflowService.init({
      name: name.trim(),
      description: description.trim() || undefined,
      scale: scale || undefined
    });

    ui.displaySuccess(t('success.workflow.initialized', { name }));
    ui.displayInfo(t('info.workflow.scale'), getScaleName(status.project.scale as any));
    ui.displayInfo(t('info.workflow.currentPhase'), `${status.project.current_phase} - ${PHASE_NAMES_PT[status.project.current_phase]}`);
    return true;
  } catch (error) {
    ui.displayError(t('errors.workflow.initFailed'), error as Error);
    return false;
  }
}

async function runInteractiveWorkflow(): Promise<void> {
  const projectPath = process.cwd();
  const workflowService = new WorkflowService(projectPath, getWorkflowDeps());
  const hasWorkflow = await workflowService.hasWorkflow();

  if (!hasWorkflow) {
    // No workflow exists - offer to create one
    const { createNew } = await inquirer.prompt<{ createNew: boolean }>([
      {
        type: 'confirm',
        name: 'createNew',
        message: t('prompts.workflow.noWorkflowFound'),
        default: true
      }
    ]);

    if (!createNew) {
      return;
    }

    await createNewWorkflow(workflowService);
    return;
  }

  // Workflow exists - check if complete
  const isComplete = await workflowService.isComplete();

  if (isComplete) {
    // Workflow is complete - offer to start a new one or view status
    console.log('');
    const formattedStatus = await workflowService.getFormattedStatus();
    console.log(formattedStatus);

    const { completeAction } = await inquirer.prompt<{ completeAction: 'newWorkflow' | 'viewStatus' | 'back' }>([
      {
        type: 'list',
        name: 'completeAction',
        message: t('prompts.workflow.workflowComplete'),
        choices: [
          { name: t('prompts.workflow.action.newWorkflow'), value: 'newWorkflow' },
          { name: t('prompts.workflow.action.viewStatus'), value: 'viewStatus' },
          { name: t('prompts.workflow.action.back'), value: 'back' }
        ]
      }
    ]);

    if (completeAction === 'newWorkflow') {
      const { confirmNew } = await inquirer.prompt<{ confirmNew: boolean }>([
        {
          type: 'confirm',
          name: 'confirmNew',
          message: t('prompts.workflow.confirmNewWorkflow'),
          default: true
        }
      ]);

      if (confirmNew) {
        await createNewWorkflow(workflowService);
      }
    }
    // 'viewStatus' and 'back' just return
    return;
  }

  // Workflow exists and is not complete - show status and actions
  let continueMenu = true;
  while (continueMenu) {
    console.log('');
    const formattedStatus = await workflowService.getFormattedStatus();
    console.log(formattedStatus);

    const choices: Array<{ name: string; value: WorkflowAction }> = [];

    choices.push({ name: t('prompts.workflow.action.advance'), value: 'advance' });
    choices.push({ name: t('prompts.workflow.action.newWorkflow'), value: 'newWorkflow' });
    choices.push({ name: t('prompts.workflow.action.refresh'), value: 'status' });
    choices.push({ name: t('prompts.workflow.action.back'), value: 'back' });

    const { action } = await inquirer.prompt<{ action: WorkflowAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.workflow.action'),
        choices
      }
    ]);

    if (action === 'back') {
      continueMenu = false;
    } else if (action === 'newWorkflow') {
      const { confirmNew } = await inquirer.prompt<{ confirmNew: boolean }>([
        {
          type: 'confirm',
          name: 'confirmNew',
          message: t('prompts.workflow.confirmNewWorkflow'),
          default: false
        }
      ]);

      if (confirmNew) {
        const created = await createNewWorkflow(workflowService);
        if (created) {
          // Continue with the new workflow
          continue;
        }
      }
    } else if (action === 'advance') {
      try {
        const nextPhase = await workflowService.advance();
        if (nextPhase) {
          ui.displaySuccess(t('success.workflow.advanced', { phase: nextPhase, phaseName: PHASE_NAMES_PT[nextPhase] }));
        } else {
          ui.displaySuccess(t('success.workflow.completed'));
          // Workflow completed - ask if they want to start a new one
          const { startNew } = await inquirer.prompt<{ startNew: boolean }>([
            {
              type: 'confirm',
              name: 'startNew',
              message: t('prompts.workflow.noWorkflowFound'),
              default: true
            }
          ]);

          if (startNew) {
            await createNewWorkflow(workflowService);
          }
          continueMenu = false;
        }
      } catch (error) {
        ui.displayError(t('errors.workflow.advanceFailed'), error as Error);
      }
    }
    // 'status' just loops and refreshes
  }
}

type SkillAction = 'init' | 'list' | 'export' | 'create' | 'back';

async function runInteractiveSkills(): Promise<void> {
  const projectPath = process.cwd();

  let continueMenu = true;
  while (continueMenu) {
    const { action } = await inquirer.prompt<{ action: SkillAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.skill.action'),
        choices: [
          { name: t('prompts.skill.action.init'), value: 'init' },
          { name: t('prompts.skill.action.list'), value: 'list' },
          { name: t('prompts.skill.action.export'), value: 'export' },
          { name: t('prompts.skill.action.create'), value: 'create' },
          { name: t('prompts.skill.action.back'), value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      continueMenu = false;
      break;
    }

    if (action === 'init') {
      try {
        const { createSkillGenerator } = await import('./generators/skills');
        const generator = createSkillGenerator({ repoPath: projectPath });
        const result = await generator.generate({});

        ui.displaySuccess(t('success.skill.initialized', { path: result.skillsDir }));
        ui.displayInfo(t('info.skill.generated'), result.generatedSkills.join(', ') || 'none');
        if (result.skippedSkills.length > 0) {
          ui.displayInfo(t('info.skill.skipped'), result.skippedSkills.join(', '));
        }
      } catch (error) {
        ui.displayError(t('errors.skill.initFailed'), error as Error);
      }
    } else if (action === 'list') {
      try {
        const { createSkillRegistry, BUILT_IN_SKILLS } = await import('./workflow/skills');
        const registry = createSkillRegistry(projectPath);
        const discovered = await registry.discoverAll();

        console.log('\nBuilt-in Skills:');
        for (const skill of discovered.builtIn) {
          const scaffolded = discovered.all.find(s => s.slug === skill.slug && s.path.includes('.context'));
          const status = scaffolded ? '[scaffolded]' : '[available]';
          console.log(`  ${skill.slug} ${status}`);
          console.log(`    ${skill.metadata.description}`);
        }

        if (discovered.custom.length > 0) {
          console.log('\nCustom Skills:');
          for (const skill of discovered.custom) {
            console.log(`  ${skill.slug}`);
            console.log(`    ${skill.metadata.description}`);
          }
        }

        console.log(`\nTotal: ${discovered.all.length} skills (${discovered.builtIn.length} built-in, ${discovered.custom.length} custom)\n`);
      } catch (error) {
        ui.displayError(t('errors.skill.listFailed'), error as Error);
      }
    } else if (action === 'export') {
      try {
        const { preset } = await inquirer.prompt<{ preset: string }>([
          {
            type: 'list',
            name: 'preset',
            message: t('prompts.skill.exportPreset'),
            choices: [
              { name: t('prompts.skill.exportPreset.all'), value: 'all' },
              { name: t('prompts.skill.exportPreset.claude'), value: 'claude' },
              { name: t('prompts.skill.exportPreset.gemini'), value: 'gemini' },
              { name: t('prompts.skill.exportPreset.codex'), value: 'codex' }
            ],
            default: 'all'
          }
        ]);

        const { SkillExportService } = await import('./services/export/skillExportService');
        const exportService = new SkillExportService({
          ui,
          t,
          version: VERSION,
        });

        const result = await exportService.run(projectPath, {
          preset,
          includeBuiltIn: true,
        });

        ui.displaySuccess(t('success.skill.exported', {
          count: String(result.skillsExported.length),
          targets: String(result.targets.length)
        }));
      } catch (error) {
        ui.displayError(t('errors.skill.exportFailed'), error as Error);
      }
    } else if (action === 'create') {
      try {
        const { name, description, phases } = await inquirer.prompt<{
          name: string;
          description: string;
          phases: string;
        }>([
          {
            type: 'input',
            name: 'name',
            message: t('prompts.skill.name'),
            validate: (input: string) => input.trim().length > 0 || 'Name is required'
          },
          {
            type: 'input',
            name: 'description',
            message: t('prompts.skill.description'),
            default: ''
          },
          {
            type: 'input',
            name: 'phases',
            message: t('prompts.skill.phases'),
            default: 'E,V' // Default to Execution + Validation
          }
        ]);

        const phaseArray = phases.split(',').map(p => p.trim().toUpperCase()).filter(p => ['P', 'R', 'E', 'V', 'C'].includes(p));

        ui.startSpinner('Creating skill...');

        const { createSkillGenerator } = await import('./generators/skills');
        const generator = createSkillGenerator({ repoPath: projectPath });
        const skillPath = await generator.generateCustomSkill({
          name: name.trim(),
          description: description.trim() || `TODO: Describe when to use ${name}`,
          phases: phaseArray as any,
        });

        // AI-first: Try to fill skill with AI + LSP
        const defaults = await detectSmartDefaults();
        if (defaults.apiKeyConfigured && defaults.provider) {
          ui.updateSpinner('Enhancing skill with AI...', 'info');
          try {
            const { SkillFillService } = await import('./services/fill/skillFillService');
            const skillFillService = new SkillFillService({ ui, t, version: VERSION, defaultModel: DEFAULT_MODEL });
            await skillFillService.run(projectPath, {
              provider: defaults.provider,
              model: DEFAULT_MODEL,
              apiKey: getApiKeyFromEnv(defaults.provider!),
              skills: [name.trim()],
              semantic: true,
              useLsp: true,
            });
          } catch {
            // Fill failure is not critical - template is already created
          }
        }

        ui.updateSpinner('Skill created', 'success');
        ui.stopSpinner();

        ui.displaySuccess(t('success.skill.created', { name }));
        ui.displayInfo(t('info.skill.path'), skillPath);
      } catch (error) {
        ui.stopSpinner();
        ui.displayError(t('errors.skill.createFailed'), error as Error);
      }
    }
  }
}

// ============================================================================
// Quick Sync - Unified sync for agents, skills, and docs
// ============================================================================

async function runQuickSync(): Promise<void> {
  const projectPath = process.cwd();

  const quickSyncService = new QuickSyncService({
    ui,
    t,
    version: VERSION,
    defaultModel: DEFAULT_MODEL,
  });

  const result = await quickSyncService.run(projectPath, {
    force: false,
    dryRun: false,
    verbose: false,
  });

  // If docs are outdated, ask if user wants to update
  if (!result.docsUpdated) {
    const stats = await quickSyncService.getStats(projectPath);
    if (stats.daysOld) {
      const { updateDocs } = await inquirer.prompt<{ updateDocs: boolean }>([
        {
          type: 'confirm',
          name: 'updateDocs',
          message: t('prompts.quickSync.updateDocs'),
          default: true,
        },
      ]);

      if (updateDocs) {
        // Trigger fill with AI + LSP
        await runInteractiveLlmFill();
      }
    }
  }

  ui.displaySuccess(t('success.quickSync.complete'));
}

// ============================================================================
// Manage Agents - Submenu for agent operations
// ============================================================================

type AgentMenuAction = 'sync' | 'create' | 'list' | 'back';

async function runManageAgents(): Promise<void> {
  const projectPath = process.cwd();

  let continueMenu = true;
  while (continueMenu) {
    const { action } = await inquirer.prompt<{ action: AgentMenuAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.agents.action'),
        choices: [
          { name: t('prompts.agents.choice.sync'), value: 'sync' },
          { name: t('prompts.agents.choice.create'), value: 'create' },
          { name: t('prompts.agents.choice.list'), value: 'list' },
          { name: t('prompts.agents.choice.back'), value: 'back' },
        ],
      },
    ]);

    if (action === 'back') {
      continueMenu = false;
      break;
    }

    if (action === 'sync') {
      await runInteractiveSync();
    } else if (action === 'list') {
      await listAgents(projectPath);
    } else if (action === 'create') {
      await createCustomAgent(projectPath);
    }
  }
}

async function listAgents(projectPath: string): Promise<void> {
  const agentsPath = path.join(projectPath, '.context', 'agents');
  const fs = await import('fs-extra');

  if (!(await fs.pathExists(agentsPath))) {
    ui.displayWarning('No agents directory found. Run scaffold first.');
    return;
  }

  const files = await fs.readdir(agentsPath);
  const agents = files.filter(f => f.endsWith('.md') && f !== 'README.md');

  console.log('\nAgents:');
  for (const agent of agents) {
    const name = agent.replace('.md', '');
    console.log(`  ${colors.primary(name)}`);
  }
  console.log(`\nTotal: ${agents.length} agents\n`);
}

async function createCustomAgent(projectPath: string): Promise<void> {
  const { name, description, role } = await inquirer.prompt<{
    name: string;
    description: string;
    role: string;
  }>([
    {
      type: 'input',
      name: 'name',
      message: t('prompts.agent.name'),
      validate: (input: string) => input.trim().length > 0 || 'Name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: t('prompts.agent.description'),
    },
    {
      type: 'list',
      name: 'role',
      message: t('prompts.agent.role'),
      choices: [
        { name: 'Code Reviewer', value: 'code-reviewer' },
        { name: 'Bug Fixer', value: 'bug-fixer' },
        { name: 'Feature Developer', value: 'feature-developer' },
        { name: 'Test Writer', value: 'test-writer' },
        { name: 'Documentation Writer', value: 'documentation-writer' },
        { name: 'Security Auditor', value: 'security-auditor' },
        { name: 'Performance Optimizer', value: 'performance-optimizer' },
        { name: 'Custom...', value: 'custom' },
      ],
    },
  ]);

  let finalRole = role;
  if (role === 'custom') {
    const { customRole } = await inquirer.prompt<{ customRole: string }>([
      {
        type: 'input',
        name: 'customRole',
        message: 'Enter custom role:',
        validate: (input: string) => input.trim().length > 0 || 'Role is required',
      },
    ]);
    finalRole = customRole.trim();
  }

  ui.startSpinner(t('spinner.agent.creating'));

  try {
    const fs = await import('fs-extra');
    const agentsDir = path.join(projectPath, '.context', 'agents');
    await fs.ensureDir(agentsDir);

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const agentPath = path.join(agentsDir, `${slug}.md`);

    // Generate template content
    const template = `---
name: ${name.trim()}
description: ${description.trim() || `Custom agent: ${name.trim()}`}
role: ${finalRole}
custom: true
---

# ${name.trim()} Agent

## Role
${description.trim() || `Custom agent specialized in ${finalRole}`}

## Responsibilities
- Review and analyze code related to ${finalRole}
- Provide recommendations based on best practices
- Help maintain code quality and standards

## Guidelines
- Follow project conventions and patterns
- Consider performance and maintainability
- Document decisions and rationale

## Context
This agent should be invoked when working on tasks related to ${finalRole}.
`;

    // Write the agent file
    await fs.writeFile(agentPath, template, 'utf-8');

    // Try to fill with AI if API key is available
    const defaults = await detectSmartDefaults();
    if (defaults.apiKeyConfigured && defaults.provider) {
      ui.updateSpinner('Enhancing agent with AI...', 'info');

      try {
        // Run fill on just this agent
        const singleFillService = new FillService({
          ui,
          t,
          version: VERSION,
          defaultModel: DEFAULT_MODEL,
        });

        await singleFillService.run(projectPath, {
          model: DEFAULT_MODEL,
          provider: defaults.provider,
          apiKey: getApiKeyFromEnv(defaults.provider!),
          verbose: false,
          semantic: true,
          useLsp: true,
          limit: 1,
          include: [agentPath],
        });
      } catch {
        // Ignore fill errors - template is already saved
      }
    }

    ui.updateSpinner(t('spinner.agent.created'), 'success');
    ui.stopSpinner();

    ui.displaySuccess(t('success.agent.created', { name: name.trim() }));
    console.log(`  Path: ${agentPath}\n`);
  } catch (error) {
    ui.updateSpinner('Failed to create agent', 'fail');
    ui.stopSpinner();
    ui.displayError('Failed to create agent', error as Error);
  }
}

// ============================================================================
// Settings - Submenu for configuration
// ============================================================================

type SettingsAction = 'language' | 'back';

async function runSettings(): Promise<void> {
  let continueMenu = true;
  while (continueMenu) {
    const { action } = await inquirer.prompt<{ action: SettingsAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.settings.action'),
        choices: [
          { name: t('prompts.settings.choice.language'), value: 'language' },
          { name: t('prompts.settings.choice.back'), value: 'back' },
        ],
      },
    ]);

    if (action === 'back') {
      continueMenu = false;
      break;
    }

    if (action === 'language') {
      await selectLocale(true);
    }
  }
}

function filterOutLocaleArgs(args: string[]): string[] {
  const filtered: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--lang' || current === '--language' || current === '-l') {
      index += 1;
      continue;
    }
    if (current.startsWith('--lang=') || current.startsWith('--language=')) {
      continue;
    }
    filtered.push(current);
  }
  return filtered;
}

async function main(): Promise<void> {
  const userArgs = process.argv.slice(2);
  void scheduleVersionCheck();
  const meaningfulArgs = filterOutLocaleArgs(userArgs);
  if (meaningfulArgs.length === 0) {
    await runInteractive();
    return;
  }

  await program.parseAsync(process.argv);
}

/**
 * Check if an error is from user interrupt (Ctrl+C)
 */
function isUserInterrupt(error: unknown): boolean {
  if (error instanceof Error) {
    // Inquirer's ExitPromptError when user presses Ctrl+C
    if (error.name === 'ExitPromptError') return true;
    // Check message patterns
    if (error.message.includes('force closed')) return true;
    if (error.message.includes('User force closed')) return true;
  }
  return false;
}

/**
 * Handle graceful exit
 */
function handleGracefulExit(): void {
  console.log('');
  ui.displaySuccess(t('success.interactive.goodbye'));
  process.exit(0);
}

// Handle SIGINT (Ctrl+C) at process level
process.on('SIGINT', () => {
  handleGracefulExit();
});

if (require.main === module) {
  main().catch(error => {
    if (isUserInterrupt(error)) {
      handleGracefulExit();
    } else {
      ui.displayError(t('errors.cli.executionFailed'), error as Error);
      process.exit(1);
    }
  });
}
