import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { CLIInterface } from './cliUI';
import { LLMClientFactory } from '../services/llmClientFactory';

interface InteractiveAnswers {
  command: 'init' | 'analyze' | 'update' | 'preview' | 'exit';
  repoPath?: string;
  initType?: 'docs' | 'agents' | 'both';
  outputDir?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  excludePatterns?: string;
  includePatterns?: string;
}

export class InteractiveMode {
  private ui: CLIInterface;

  constructor() {
    this.ui = new CLIInterface();
  }

  async start(): Promise<void> {
    this.ui.displayWelcome('0.1.0');
    
    console.log(chalk.cyan('\n🎯 Interactive Mode\n'));
    console.log(chalk.gray('Let me help you get started with AI Context Generator!\n'));

    const answers = await this.promptMainCommand();

    if (answers.command === 'exit') {
      console.log(chalk.yellow('\n👋 Goodbye!\n'));
      process.exit(0);
    }

    // Execute the selected command
    await this.executeCommand(answers);
  }

  private async promptMainCommand(): Promise<InteractiveAnswers> {
    const { command } = await inquirer.prompt<{ command: InteractiveAnswers['command'] }>([
      {
        type: 'list',
        name: 'command',
        message: 'What would you like to do?',
        choices: [
          {
            name: '🚀 Initialize documentation and AI agents for a new project',
            value: 'init',
            short: 'Initialize'
          },
          {
            name: '🔍 Analyze repository structure and estimate costs',
            value: 'analyze',
            short: 'Analyze'
          },
          {
            name: '🔄 Update existing documentation with recent changes',
            value: 'update',
            short: 'Update'
          },
          {
            name: '👁️  Preview what changes would be made',
            value: 'preview',
            short: 'Preview'
          },
          {
            name: '❌ Exit',
            value: 'exit',
            short: 'Exit'
          }
        ]
      }
    ]);

    if (command === 'exit') {
      return { command };
    }

    // Get common parameters
    const commonAnswers = await this.promptCommonParameters();

    // Get command-specific parameters
    let specificAnswers: Partial<InteractiveAnswers> = {};
    
    switch (command) {
      case 'init':
        specificAnswers = await this.promptInitParameters();
        break;
      case 'update':
      case 'preview':
        // These commands might need additional parameters in the future
        break;
    }

    return {
      command,
      ...commonAnswers,
      ...specificAnswers
    };
  }

  private async promptCommonParameters(): Promise<Partial<InteractiveAnswers>> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoPath',
        message: 'Enter the path to your repository:',
        default: '.',
        validate: async (input: string) => {
          const resolvedPath = path.resolve(input);
          if (await fs.pathExists(resolvedPath)) {
            return true;
          }
          return 'Path does not exist. Please enter a valid path.';
        }
      },
      {
        type: 'input',
        name: 'outputDir',
        message: 'Where should the output be saved?',
        default: './.context'
      }
    ]);

    return answers;
  }

  private async promptInitParameters(): Promise<Partial<InteractiveAnswers>> {
    const initAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'initType',
        message: 'What would you like to initialize?',
        choices: [
          {
            name: '📚 Both documentation and AI agents (recommended)',
            value: 'both',
            short: 'Both'
          },
          {
            name: '📄 Documentation only',
            value: 'docs',
            short: 'Docs only'
          },
          {
            name: '🤖 AI agents only',
            value: 'agents',
            short: 'Agents only'
          }
        ],
        default: 'both'
      }
    ]);

    // Ask for LLM configuration
    const llmAnswers = await this.promptLLMConfiguration();

    // Ask for patterns
    const patternAnswers = await this.promptPatterns();

    return {
      ...initAnswers,
      ...llmAnswers,
      ...patternAnswers
    };
  }

  private async promptLLMConfiguration(): Promise<Partial<InteractiveAnswers>> {
    // First check if any API keys are already set in environment
    const availableProviders = this.getAvailableProviders();
    
    let provider: string;
    let model: string;
    let apiKey: string | undefined;

    if (availableProviders.length > 0) {
      const { useExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useExisting',
          message: `Found API keys for: ${availableProviders.join(', ')}. Use existing configuration?`,
          default: true
        }
      ]);

      if (useExisting) {
        provider = availableProviders[0];
        model = this.getDefaultModelForProvider(provider);
        return { provider, model };
      }
    }

    // Ask for provider
    const { selectedProvider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProvider',
        message: 'Choose your LLM provider:',
        choices: [
          { name: '🌐 OpenRouter (access to multiple models)', value: 'openrouter' },
          { name: '🤖 OpenAI (GPT models)', value: 'openai' },
          { name: '🧠 Anthropic (Claude models)', value: 'anthropic' },
          { name: '🔷 Google Gemini', value: 'gemini' },
          { name: '🚀 Grok (xAI)', value: 'grok' }
        ]
      }
    ]);

    provider = selectedProvider;

    // Ask for model based on provider
    const modelChoices = this.getModelsForProvider(provider);
    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Choose a model:',
        choices: modelChoices,
        default: this.getDefaultModelForProvider(provider)
      }
    ]);

    model = selectedModel;

    // Check if API key is needed
    const envVars = LLMClientFactory.getEnvironmentVariables()[provider as keyof ReturnType<typeof LLMClientFactory.getEnvironmentVariables>];
    let hasApiKey = false;
    
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        hasApiKey = true;
        break;
      }
    }

    if (!hasApiKey) {
      const { enteredApiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'enteredApiKey',
          message: `Enter your ${provider.toUpperCase()} API key:`,
          mask: '*',
          validate: (input: string) => {
            if (input.length > 0) {
              return true;
            }
            return `API key is required. Get one from ${this.getProviderUrl(provider)}`;
          }
        }
      ]);

      apiKey = enteredApiKey;
    }

    return { provider, model, apiKey };
  }

  private async promptPatterns(): Promise<Partial<InteractiveAnswers>> {
    const { hasPatterns } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasPatterns',
        message: 'Do you want to customize file include/exclude patterns?',
        default: false
      }
    ]);

    if (!hasPatterns) {
      return {};
    }

    const patterns = await inquirer.prompt([
      {
        type: 'input',
        name: 'includePatterns',
        message: 'Enter patterns to include (comma-separated, e.g., "src/**/*.ts,lib/**/*.js"):',
        default: ''
      },
      {
        type: 'input',
        name: 'excludePatterns',
        message: 'Enter additional patterns to exclude (comma-separated, e.g., "tests/**,*.test.ts"):',
        default: ''
      }
    ]);

    return patterns;
  }

  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    const providerMap = LLMClientFactory.getEnvironmentVariables();

    for (const [provider, envVars] of Object.entries(providerMap)) {
      for (const envVar of envVars) {
        if (process.env[envVar]) {
          providers.push(provider);
          break;
        }
      }
    }

    return providers;
  }

  private getDefaultModelForProvider(provider: string): string {
    const defaults: Record<string, string> = {
      openrouter: 'google/gemini-2.5-flash-preview-05-20',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-haiku-20240307',
      gemini: 'gemini-2.5-flash-preview-05-20',
      grok: 'grok-beta'
    };

    return defaults[provider] || 'default';
  }

  private getModelsForProvider(provider: string): Array<{ name: string; value: string }> {
    const models: Record<string, Array<{ name: string; value: string }>> = {
      openrouter: [
        { name: '💰 Google Gemini 2.5 Flash (recommended, fast & cheap)', value: 'google/gemini-2.5-flash-preview-05-20' },
        { name: '🚀 GPT-4o Mini (fast & capable)', value: 'openai/gpt-4o-mini' },
        { name: '⚡ Claude 3 Haiku (very fast)', value: 'anthropic/claude-3-haiku' },
        { name: '🧠 Claude 3.5 Sonnet (powerful)', value: 'anthropic/claude-3.5-sonnet' },
        { name: '💎 GPT-4o (most capable)', value: 'openai/gpt-4o' }
      ],
      openai: [
        { name: '💰 GPT-4o Mini (recommended, fast & cheap)', value: 'gpt-4o-mini' },
        { name: '🚀 GPT-4o (most capable)', value: 'gpt-4o' },
        { name: '📚 GPT-4 Turbo', value: 'gpt-4-turbo' }
      ],
      anthropic: [
        { name: '⚡ Claude 3 Haiku (recommended, fast & cheap)', value: 'claude-3-haiku-20240307' },
        { name: '🧠 Claude 3.5 Sonnet (powerful)', value: 'claude-3-5-sonnet-20241022' },
        { name: '💎 Claude 3 Opus (most capable)', value: 'claude-3-opus-20240229' }
      ],
      gemini: [
        { name: '⚡ Gemini 2.5 Flash (recommended)', value: 'gemini-2.5-flash-preview-05-20' },
        { name: '🧠 Gemini 1.5 Pro', value: 'gemini-1.5-pro' }
      ],
      grok: [
        { name: '🚀 Grok Beta', value: 'grok-beta' }
      ]
    };

    return models[provider] || [];
  }

  private getProviderUrl(provider: string): string {
    const urls: Record<string, string> = {
      openrouter: 'https://openrouter.ai/keys',
      openai: 'https://platform.openai.com/api-keys',
      anthropic: 'https://console.anthropic.com/account/keys',
      gemini: 'https://makersuite.google.com/app/apikey',
      grok: 'https://console.x.ai/'
    };

    return urls[provider] || 'your provider\'s website';
  }

  private async executeCommand(answers: InteractiveAnswers): Promise<void> {
    const args: string[] = [];

    // Build command arguments
    args.push(answers.command);
    
    if (answers.repoPath) {
      args.push(answers.repoPath);
    }

    if (answers.command === 'init' && answers.initType) {
      args.push(answers.initType);
    }

    // Add options
    if (answers.outputDir) {
      args.push('--output', answers.outputDir);
    }

    if (answers.provider) {
      args.push('--provider', answers.provider);
    }

    if (answers.model) {
      args.push('--model', answers.model);
    }

    if (answers.apiKey) {
      args.push('--api-key', answers.apiKey);
    }

    if (answers.includePatterns) {
      const patterns = answers.includePatterns.split(',').map(p => p.trim()).filter(p => p);
      if (patterns.length > 0) {
        args.push('--include', ...patterns);
      }
    }

    if (answers.excludePatterns) {
      const patterns = answers.excludePatterns.split(',').map(p => p.trim()).filter(p => p);
      if (patterns.length > 0) {
        args.push('--exclude', ...patterns);
      }
    }

    // Show the command that will be executed
    console.log(chalk.gray('\n📋 Executing command:'));
    console.log(chalk.cyan(`ai-context ${args.join(' ')}\n`));

    // Import and execute the command
    const { runGenerate, runAnalyze, runUpdate, runPreview } = await import('../index');
    
    try {
      switch (answers.command) {
        case 'init':
          await runGenerate(answers.repoPath!, {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            docsOnly: answers.initType === 'docs',
            agentsOnly: answers.initType === 'agents'
          });
          break;

        case 'analyze':
          await runAnalyze(answers.repoPath!, {
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p)
          });
          break;

        case 'update':
          await runUpdate(answers.repoPath!, {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p)
          });
          break;

        case 'preview':
          await runPreview(answers.repoPath!, {
            output: answers.outputDir,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p)
          });
          break;
      }
    } catch (error) {
      this.ui.displayError(`Failed to execute ${answers.command}`, error as Error);
      process.exit(1);
    }
  }
}