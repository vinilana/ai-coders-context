import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { CLIInterface } from './cliUI';
import { LLMClientFactory } from '../services/llmClientFactory';

interface InteractiveAnswers {
  command: 'generate-all' | 'generate-docs' | 'generate-agents' | 'generate-guidelines' | 'analyze' | 'update' | 'preview' | 'exit';
  repoPath?: string;
  outputDir?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  excludePatterns?: string;
  includePatterns?: string;
  guidelineCategories?: string[];
  projectType?: string;
  complexity?: string;
  teamSize?: string;
  includeExamples?: boolean;
  includeTools?: boolean;
  inputPrice?: number;
  outputPrice?: number;
  usePricing?: boolean;
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
    const { command } = await inquirer.prompt<{ command: InteractiveAnswers['command'] }>({
      type: 'list',
      name: 'command',
      message: 'What would you like to generate?',
      choices: [
          {
            name: '🚀 Generate everything (docs + agents + guidelines)',
            value: 'generate-all',
            short: 'Generate All'
          },
          {
            name: '📚 Generate documentation only',
            value: 'generate-docs',
            short: 'Generate Docs'
          },
          {
            name: '🤖 Generate AI agent prompts only',
            value: 'generate-agents',
            short: 'Generate Agents'
          },
          {
            name: '📋 Generate development guidelines only',
            value: 'generate-guidelines',
            short: 'Generate Guidelines'
          },
          new inquirer.Separator(),
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
          new inquirer.Separator(),
          {
            name: '❌ Exit',
            value: 'exit',
            short: 'Exit'
          }
        ]
      });

    if (command === 'exit') {
      return { command };
    }

    // Get common parameters
    const commonAnswers = await this.promptCommonParameters();

    // Get command-specific parameters
    let specificAnswers: Partial<InteractiveAnswers> = {};
    
    switch (command) {
      case 'generate-all':
        specificAnswers = await this.promptGenerateParameters(true);
        break;
      case 'generate-docs':
        specificAnswers = await this.promptGenerateParameters(false);
        break;
      case 'generate-agents':
        specificAnswers = await this.promptGenerateParameters(false);
        break;
      case 'generate-guidelines':
        specificAnswers = await this.promptGuidelinesParameters();
        break;
      case 'analyze':
        specificAnswers = await this.promptAnalyzeParameters();
        break;
      case 'update':
      case 'preview':
        specificAnswers = await this.promptPreviewParameters();
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

  private async promptGuidelinesParameters(): Promise<Partial<InteractiveAnswers>> {
    // Ask for LLM configuration first
    const llmAnswers = await this.promptLLMConfiguration();

    // Ask for patterns
    const patternAnswers = await this.promptPatterns();

    // Ask for guidelines configuration
    const guidelineAnswers = await this.promptGuidelinesConfiguration();

    return {
      ...llmAnswers,
      ...patternAnswers,
      ...guidelineAnswers
    };
  }

  private async promptAnalyzeParameters(): Promise<Partial<InteractiveAnswers>> {
    // Ask for custom pricing
    const pricingAnswers = await this.promptCustomPricing();

    // Ask for patterns
    const patternAnswers = await this.promptPatterns();

    return {
      ...pricingAnswers,
      ...patternAnswers
    };
  }

  private async promptPreviewParameters(): Promise<Partial<InteractiveAnswers>> {
    // Ask for custom pricing
    const pricingAnswers = await this.promptCustomPricing();

    // Ask for patterns
    const patternAnswers = await this.promptPatterns();

    return {
      ...pricingAnswers,
      ...patternAnswers
    };
  }

  private async promptCustomPricing(): Promise<Partial<InteractiveAnswers>> {
    const { usePricing } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'usePricing',
        message: 'Do you want to provide pricing for cost estimation?',
        default: false
      }
    ]);

    if (!usePricing) {
      return { usePricing: false };
    }

    console.log(chalk.gray('\n💰 Pricing Configuration'));
    console.log(chalk.gray('Enter your token pricing (per 1M tokens):\n'));

    const pricingAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputPrice',
        message: 'Input token price per 1M tokens (e.g., 2.50 for $2.50):',
        validate: (input: string) => {
          const num = parseFloat(input);
          return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
        },
        filter: (input: string) => parseFloat(input)
      },
      {
        type: 'input',
        name: 'outputPrice',
        message: 'Output token price per 1M tokens (e.g., 10.00 for $10.00):',
        validate: (input: string) => {
          const num = parseFloat(input);
          return !isNaN(num) && num >= 0 || 'Please enter a valid positive number';
        },
        filter: (input: string) => parseFloat(input)
      }
    ]);

    return {
      usePricing: true,
      ...pricingAnswers
    };
  }

  private async promptGenerateParameters(includeGuidelines: boolean): Promise<Partial<InteractiveAnswers>> {
    // Ask for LLM configuration
    const llmAnswers = await this.promptLLMConfiguration();

    // Ask for patterns
    const patternAnswers = await this.promptPatterns();

    let guidelineAnswers = {};
    if (includeGuidelines) {
      // For generate-all, ask if they want to include guidelines configuration
      const { configureGuidelines } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'configureGuidelines',
          message: 'Do you want to configure guidelines generation options?',
          default: false
        }
      ]);

      if (configureGuidelines) {
        guidelineAnswers = await this.promptGuidelinesConfiguration();
      }
    }

    return {
      ...llmAnswers,
      ...patternAnswers,
      ...guidelineAnswers
    };
  }

  private async promptGuidelinesConfiguration(): Promise<Partial<InteractiveAnswers>> {
    // Ask for specific categories or comprehensive guidelines
    const { guidelineScope } = await inquirer.prompt([
      {
        type: 'list',
        name: 'guidelineScope',
        message: 'What type of guidelines would you like to generate?',
        choices: [
          {
            name: '🎯 Comprehensive guidelines (all categories)',
            value: 'comprehensive',
            short: 'Comprehensive'
          },
          {
            name: '🔧 Specific categories only',
            value: 'specific',
            short: 'Specific'
          }
        ],
        default: 'comprehensive'
      }
    ]);

    let guidelineCategories: string[] = [];

    if (guidelineScope === 'specific') {
      const { selectedCategories } = await inquirer.prompt<{ selectedCategories: string[] }>({
        type: 'checkbox',
        name: 'selectedCategories',
        message: 'Select the guideline categories to generate:',
        choices: [
          { name: '🧪 Testing guidelines', value: 'testing' },
          { name: '🎨 Frontend guidelines', value: 'frontend' },
          { name: '⚙️ Backend guidelines', value: 'backend' },
          { name: '🗄️ Database guidelines', value: 'database' },
          { name: '🔒 Security guidelines', value: 'security' },
          { name: '⚡ Performance guidelines', value: 'performance' },
          { name: '✨ Code style guidelines', value: 'code-style' },
          { name: '🌲 Git workflow guidelines', value: 'git-workflow' },
          { name: '🚀 Deployment guidelines', value: 'deployment' },
          { name: '📊 Monitoring guidelines', value: 'monitoring' },
          { name: '📚 Documentation guidelines', value: 'documentation' },
          { name: '🏗️ Architecture guidelines', value: 'architecture' }
        ],
        validate: (answer: any) => {
          if (!answer || answer.length === 0) {
            return 'Please select at least one category.';
          }
          return true;
        }
      });
      guidelineCategories = selectedCategories;
    }

    // Ask for project configuration
    const projectConfig = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'What type of project is this?',
        choices: [
          { name: '🤖 Auto-detect based on codebase', value: 'auto' },
          { name: '🎨 Frontend application', value: 'frontend' },
          { name: '⚙️ Backend service', value: 'backend' },
          { name: '🌐 Full-stack application', value: 'fullstack' },
          { name: '📱 Mobile application', value: 'mobile' },
          { name: '🖥️ Desktop application', value: 'desktop' },
          { name: '📦 Library/package', value: 'library' }
        ],
        default: 'auto'
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'How complex is your project?',
        choices: [
          { name: '🤖 Auto-detect based on codebase', value: 'auto' },
          { name: '🟢 Simple (few components, straightforward logic)', value: 'simple' },
          { name: '🟡 Moderate (multiple modules, some complexity)', value: 'moderate' },
          { name: '🔴 Complex (many modules, intricate architecture)', value: 'complex' }
        ],
        default: 'auto'
      },
      {
        type: 'list',
        name: 'teamSize',
        message: 'What is your team size?',
        choices: [
          { name: '🤖 Auto-detect/assume medium team', value: 'auto' },
          { name: '👤 Small team (1-3 people)', value: 'small' },
          { name: '👥 Medium team (4-10 people)', value: 'medium' },
          { name: '👨‍👩‍👧‍👦 Large team (10+ people)', value: 'large' }
        ],
        default: 'auto'
      }
    ]);

    // Ask for additional features
    const features = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'includeExamples',
        message: 'Include code examples in guidelines?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeTools',
        message: 'Include tool recommendations in guidelines?',
        default: true
      }
    ]);

    return {
      guidelineCategories,
      ...projectConfig,
      ...features
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

    // Build command arguments - map interactive commands to CLI commands
    let cliCommand: string;
    switch (answers.command) {
      case 'generate-all':
        cliCommand = 'init';
        break;
      case 'generate-docs':
        cliCommand = 'init';
        break;
      case 'generate-agents':
        cliCommand = 'init';
        break;
      case 'generate-guidelines':
        cliCommand = 'guidelines';
        break;
      default:
        cliCommand = answers.command;
    }
    
    args.push(cliCommand);
    
    if (answers.repoPath) {
      args.push(answers.repoPath);
    }
    
    // Add init type for generate commands
    if (answers.command === 'generate-docs') {
      args.push('docs');
    } else if (answers.command === 'generate-agents') {
      args.push('agents');
    } else if (answers.command === 'generate-all') {
      args.push('both');
    }

    // Add command-specific arguments
    if (answers.command === 'generate-guidelines' && answers.guidelineCategories && answers.guidelineCategories.length > 0) {
      args.push(...answers.guidelineCategories);
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

    // Add guidelines-specific options
    if (answers.command === 'generate-guidelines') {
      if (answers.projectType && answers.projectType !== 'auto') {
        args.push('--project-type', answers.projectType);
      }
      if (answers.complexity && answers.complexity !== 'auto') {
        args.push('--complexity', answers.complexity);
      }
      if (answers.teamSize && answers.teamSize !== 'auto') {
        args.push('--team-size', answers.teamSize);
      }
      if (answers.includeExamples) {
        args.push('--include-examples');
      }
      if (answers.includeTools) {
        args.push('--include-tools');
      }
    }

    // Add pricing options for analyze and preview commands
    if ((answers.command === 'analyze' || answers.command === 'preview') && answers.usePricing) {
      if (answers.inputPrice !== undefined) {
        args.push('--input-price', answers.inputPrice.toString());
      }
      if (answers.outputPrice !== undefined) {
        args.push('--output-price', answers.outputPrice.toString());
      }
    }

    // Show the command that will be executed
    console.log(chalk.gray('\n📋 Executing command:'));
    console.log(chalk.cyan(`ai-context ${args.join(' ')}\n`));

    // Import and execute the command
    const { runGenerate, runAnalyze, runUpdate, runPreview, runGuidelines } = await import('../index');
    
    try {
      switch (answers.command) {
        case 'generate-all':
          await runGenerate(answers.repoPath!, {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            verbose: true // Enable verbose for interactive mode
          });
          break;

        case 'generate-docs':
          await runGenerate(answers.repoPath!, {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            docsOnly: true,
            verbose: true // Enable verbose for interactive mode
          });
          break;

        case 'generate-agents':
          await runGenerate(answers.repoPath!, {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            agentsOnly: true,
            verbose: true // Enable verbose for interactive mode
          });
          break;

        case 'generate-guidelines':
          await runGuidelines(answers.repoPath!, answers.guidelineCategories || [], {
            output: answers.outputDir,
            provider: answers.provider,
            model: answers.model,
            apiKey: answers.apiKey,
            projectType: answers.projectType !== 'auto' ? answers.projectType : undefined,
            complexity: answers.complexity !== 'auto' ? answers.complexity : undefined,
            teamSize: answers.teamSize !== 'auto' ? answers.teamSize : undefined,
            includeExamples: answers.includeExamples,
            includeTools: answers.includeTools,
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            verbose: true // Enable verbose for interactive mode
          });
          break;

        case 'analyze':
          await runAnalyze(answers.repoPath!, {
            include: answers.includePatterns?.split(',').map(p => p.trim()).filter(p => p),
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            inputPrice: answers.inputPrice,
            outputPrice: answers.outputPrice,
            verbose: true // Enable verbose for interactive mode
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
            exclude: answers.excludePatterns?.split(',').map(p => p.trim()).filter(p => p),
            inputPrice: answers.inputPrice,
            outputPrice: answers.outputPrice,
            verbose: true // Enable verbose for interactive mode
          });
          break;
      }
    } catch (error) {
      this.ui.displayError(`Failed to execute ${answers.command}`, error as Error);
      process.exit(1);
    }
  }
}