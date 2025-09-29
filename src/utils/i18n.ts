export type Locale = 'en' | 'pt-BR';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'pt-BR'];
export const DEFAULT_LOCALE: Locale = 'en';

const englishMessages = {
  'cli.name': 'AI Coders Context by aicoders.academy',
  'cli.tagline': 'Scaffold documentation and agent playbooks with or without LLM assistance',
  'cli.description': 'Scaffold documentation and agent playbooks for your repository',
  'global.options.lang': 'Language for CLI output (en or pt-BR)',
  'ui.version': 'Version {version}',
  'ui.projectConfiguration.title': '📋 Project Configuration:',
  'ui.projectConfiguration.repository': 'Repository:',
  'ui.projectConfiguration.output': 'Output:',
  'ui.projectConfiguration.mode': 'Scaffold Mode:',
  'ui.progress.starting': 'Starting...',
  'ui.analysis.complete.title': '📊 Repository Analysis Complete',
  'ui.analysis.files': 'Files',
  'ui.analysis.directories': 'Directories',
  'ui.analysis.totalSize': 'Total Size',
  'ui.fileTypeDistribution.title': '📁 File Type Distribution:',
  'ui.generationSummary.title': '✨ Scaffold Complete!',
  'ui.generationSummary.documentation': 'Documentation files',
  'ui.generationSummary.agents': 'Agent playbooks',
  'ui.generationSummary.timeElapsed': 'Time elapsed',
  'ui.generationSummary.nextStep': 'Next step: customize the generated templates to match your project.',
  'ui.error.title': '❌ Error Occurred',
  'info.prompt.title': 'System Prompt',
  'info.prompt.usingCustom': 'Using prompt from {path}.',
  'info.prompt.usingPackage': 'Using packaged prompt at {path}.',
  'info.prompt.usingBundled': 'Using built-in prompt bundled with ai-context.',
  'info.update.available.title': 'Update available',
  'info.update.available.detail': 'A newer version {latest} is available (current {current}). Update with {command}.',
  'commands.init.description': 'Generate docs and agent scaffolding for a repository',
  'commands.init.arguments.repoPath': 'Path to the repository to analyze',
  'commands.init.arguments.type': 'Scaffold type: "docs", "agents", or "both" (default)',
  'commands.init.options.output': 'Output directory for generated assets',
  'commands.init.options.exclude': 'Glob patterns to exclude from analysis',
  'commands.init.options.include': 'Glob patterns to include during analysis',
  'commands.init.options.verbose': 'Enable verbose logging',
  'commands.fill.description': 'Use an LLM to fill generated docs and agent playbooks with the latest repo context',
  'commands.fill.arguments.repoPath': 'Path to the repository root used to build context',
  'commands.fill.options.output': 'Scaffold directory containing docs/ and agents/',
  'commands.fill.options.apiKey': 'API key for the LLM provider',
  'commands.fill.options.model': 'LLM model to use',
  'commands.fill.options.provider': 'LLM provider (openrouter only)',
  'commands.fill.options.baseUrl': 'Custom base URL for provider APIs',
  'commands.fill.options.prompt': 'Path to an instruction prompt',
  'commands.fill.options.limit': 'Maximum number of files to process',
  'commands.fill.options.exclude': 'Glob patterns to exclude from repository analysis',
  'commands.fill.options.include': 'Glob patterns to include during analysis',
  'commands.fill.options.verbose': 'Enable verbose logging',
  'commands.plan.description': 'Create a development plan that links documentation and agent playbooks',
  'commands.plan.arguments.planName': 'Name of the plan (used to create the file slug)',
  'commands.plan.options.output': 'Scaffold directory containing docs/ and agents/',
  'commands.plan.options.title': 'Custom title for the plan document',
  'commands.plan.options.summary': 'Seed summary for the plan header',
  'commands.plan.options.force': 'Overwrite the plan if it already exists (scaffold mode)',
  'commands.plan.options.fill': 'Use an LLM to fill or update the plan instead of scaffolding',
  'commands.plan.options.repo': 'Repository root to summarize for additional context',
  'commands.plan.options.apiKey': 'API key for the LLM provider',
  'commands.plan.options.model': 'LLM model to use',
  'commands.plan.options.provider': 'LLM provider (openrouter only)',
  'commands.plan.options.baseUrl': 'Custom base URL for provider APIs',
  'commands.plan.options.prompt': 'Path to a plan update instruction prompt',
  'commands.plan.options.dryRun': 'Preview updates without writing files',
  'commands.plan.options.include': 'Glob patterns to include during repository analysis',
  'commands.plan.options.exclude': 'Glob patterns to exclude from repository analysis',
  'commands.plan.options.verbose': 'Enable verbose logging',
  'errors.init.scaffoldFailed': 'Failed to scaffold repository assets',
  'errors.fill.failed': 'Failed to fill documentation with LLM assistance',
  'errors.plan.creationFailed': 'Failed to create plan template',
  'errors.init.invalidType': 'Invalid scaffold type "{value}". Expected one of: {allowed}',
  'errors.common.repoMissing': 'Repository path does not exist: {path}',
  'warnings.scaffold.noneSelected': 'No documentation or agent playbooks selected. Nothing to scaffold.',
  'steps.init.analyze': 'Analyzing repository structure',
  'steps.init.docs': 'Scaffolding documentation',
  'steps.init.agents': 'Scaffolding agent playbooks',
  'spinner.repo.scanning': 'Scanning repository...',
  'spinner.repo.scanComplete': 'Found {fileCount} files across {directoryCount} directories',
  'spinner.docs.creating': 'Creating docs directory and templates...',
  'spinner.docs.created': 'Documentation scaffold created ({count} files)',
  'spinner.agents.creating': 'Creating agent directory and templates...',
  'spinner.agents.created': 'Agent scaffold created ({count} files)',
  'spinner.plan.creating': 'Creating plan template...',
  'spinner.plan.created': 'Plan template created',
  'spinner.plan.creationFailed': 'Failed to create plan template',
  'success.scaffold.ready': 'Scaffold ready in {path}',
  'success.plan.createdAt': 'Plan created at {path}',
  'errors.fill.missingDocsScaffold': 'Documentation scaffold not found. Run `ai-context init` first.',
  'errors.fill.missingAgentsScaffold': 'Agent scaffold not found. Run `ai-context init` first.',
  'steps.fill.analyze': 'Analyzing repository structure',
  'warnings.fill.noTargets': 'No Markdown files found in .context/docs or .context/agents. Run "ai-context init" before filling.',
  'steps.fill.processFiles': 'Updating {count} files with {model}',
  'spinner.fill.processing': 'Processing {path}...',
  'spinner.fill.noContent': 'No content received for {path}',
  'messages.fill.emptyResponse': 'Empty response from LLM',
  'messages.fill.previewStart': '--- Preview Start ---',
  'messages.fill.previewEnd': '--- Preview End ---',
  'spinner.fill.updated': 'Updated {path}',
  'spinner.fill.failed': 'Failed {path}',
  'steps.fill.summary': 'Summarizing LLM usage',
  'success.fill.completed': 'LLM-assisted update complete. Review the changes and commit when ready.',
  'errors.plan.invalidName': 'Plan name must contain at least one alphanumeric character.',
  'messages.plan.regenerated': 'Regenerated {path} before LLM fill.',
  'messages.plan.created': 'Created {path} before LLM fill.',
  'info.plan.scaffolded.title': 'Plan scaffolded',
  'errors.plan.missingPlansDir': 'Plans directory not found. Run `ai-context plan <name>` to create one.',
  'errors.plan.notFound': 'Plan not found. Expected {expected}.',
  'steps.plan.summary': 'Summarizing repository state',
  'spinner.planFill.analyzingRepo': 'Analyzing repository...',
  'spinner.planFill.summaryReady': 'Repository summary ready',
  'steps.plan.update': 'Updating {path} with {model}',
  'spinner.planFill.updating': 'Filling {path}...',
  'spinner.planFill.noContent': 'No content received from LLM',
  'spinner.planFill.dryRun': 'Dry run - preview follows',
  'spinner.planFill.updated': 'Updated {path}',
  'spinner.planFill.failed': 'Failed to fill plan',
  'steps.plan.summaryResults': 'Summarizing LLM usage',
  'success.plan.filled': 'Plan fill complete. Review the updates and commit when ready.',
  'errors.commands.analyzeRemoved': 'The analyze command has been removed in the scaffolding-only version of ai-context.',
  'errors.commands.updateRemoved': 'The update command is no longer supported. Re-run `ai-context init` to refresh scaffolds.',
  'errors.commands.previewRemoved': 'Preview mode has been retired. Use the generated docs and agent templates directly.',
  'errors.commands.guidelinesRemoved': 'Guidelines generation relied on LLMs and is no longer available.',
  'errors.cli.executionFailed': 'CLI execution failed',
  'prompts.main.action': 'What would you like to do?',
  'prompts.main.choice.scaffold': 'Generate documentation/agent scaffolding',
  'prompts.main.choice.fill': 'Fill docs and agents with an LLM',
  'prompts.main.choice.plan': 'Create a development plan',
  'prompts.main.choice.changeLanguage': 'Change language',
  'prompts.main.choice.exit': 'Exit interactive mode',
  'prompts.scaffold.repoPath': 'Repository path to analyze',
  'prompts.scaffold.type': 'What should we scaffold?',
  'prompts.scaffold.typeBoth': 'Docs and agents',
  'prompts.scaffold.typeDocs': 'Docs only',
  'prompts.scaffold.typeAgents': 'Agents only',
  'prompts.common.verbose': 'Enable verbose logging?',
  'prompts.fill.repoPath': 'Repository path containing the scaffold',
  'prompts.fill.promptPath': 'Custom prompt path (leave blank to use the bundled default)',
  'prompts.fill.limit': 'Maximum number of files to update (leave blank for all)',
  'prompts.fill.overrideModel': 'Override provider/model configuration?',
  'prompts.fill.model': 'Model identifier',
  'prompts.fill.provideApiKey': 'Provide an API key for this run?',
  'prompts.fill.apiKey': 'API key',
  'prompts.plan.name': 'Plan name (used for the file slug)',
  'prompts.plan.mode': 'How would you like to work with this plan?',
  'prompts.plan.modeScaffold': 'Scaffold a plan template',
  'prompts.plan.modeFill': 'Create a plan with AI (outline or AI-filled)',
  'prompts.plan.summary': 'Optional summary to seed the plan (leave blank to add later)',
  'prompts.plan.repoPath': 'Repository root for context',
  'prompts.plan.dryRun': 'Preview updates without writing files?',
  'prompts.language.select': 'Choose the CLI language / Escolha o idioma do CLI',
  'prompts.language.option.en': 'English / Inglês',
  'prompts.language.option.pt-BR': 'Portuguese (Brazil) / Português (Brasil)',
  'errors.plan.fillFailed': 'Failed to fill plan with LLM assistance',
  'errors.fill.promptMissing': 'Prompt file not found at {path}.',
  'errors.fill.apiKeyMissing': '{provider} API key is required. Set one of {envVars} or use --api-key.',
  'info.interactive.returning.title': 'Main menu',
  'info.interactive.returning.detail': 'Returning to the interactive menu. Pick another action or choose Exit.',
  'success.interactive.goodbye': 'Goodbye! Thanks for using ai-context.'
} as const;

export type TranslationKey = keyof typeof englishMessages;

type TranslationDictionary = Record<TranslationKey, string>;

const portugueseMessages: TranslationDictionary = {
  'cli.name': 'AI Coders Context by aicoders.academy',
  'cli.tagline': 'Gere documentação e playbooks de agentes com ou sem assistência de IA',
  'cli.description': 'Crie bases de documentação e playbooks de agentes para o seu repositório',
  'global.options.lang': 'Idioma para a saída do CLI (en ou pt-BR)',
  'ui.version': 'Versão {version}',
  'ui.projectConfiguration.title': '📋 Configuração do Projeto:',
  'ui.projectConfiguration.repository': 'Repositório:',
  'ui.projectConfiguration.output': 'Saída:',
  'ui.projectConfiguration.mode': 'Modo de scaffold:',
  'ui.progress.starting': 'Iniciando...',
  'ui.analysis.complete.title': '📊 Análise do repositório concluída',
  'ui.analysis.files': 'Arquivos',
  'ui.analysis.directories': 'Diretórios',
  'ui.analysis.totalSize': 'Tamanho total',
  'ui.fileTypeDistribution.title': '📁 Distribuição de tipos de arquivo:',
  'ui.generationSummary.title': '✨ Scaffold concluído!',
  'ui.generationSummary.documentation': 'Arquivos de documentação',
  'ui.generationSummary.agents': 'Playbooks de agente',
  'ui.generationSummary.timeElapsed': 'Tempo decorrido',
  'ui.generationSummary.nextStep': 'Próximo passo: personalize os templates gerados para o seu projeto.',
  'ui.error.title': '❌ Ocorreu um erro',
  'info.prompt.title': 'Prompt do sistema',
  'info.prompt.usingCustom': 'Usando prompt em {path}.',
  'info.prompt.usingPackage': 'Usando prompt empacotado em {path}.',
  'info.prompt.usingBundled': 'Usando prompt padrão incluído no ai-context.',
  'info.update.available.title': 'Atualização disponível',
  'info.update.available.detail': 'Uma nova versão {latest} está disponível (atual {current}). Atualize com {command}.',
  'commands.init.description': 'Gerar bases de documentação e agentes para um repositório',
  'commands.init.arguments.repoPath': 'Caminho do repositório a ser analisado',
  'commands.init.arguments.type': 'Tipo de base: "docs", "agents" ou "both" (padrão)',
  'commands.init.options.output': 'Diretório de saída para os artefatos gerados',
  'commands.init.options.exclude': 'Padrões glob para excluir da análise',
  'commands.init.options.include': 'Padrões glob para incluir durante a análise',
  'commands.init.options.verbose': 'Ativa logs detalhados',
  'commands.fill.description': 'Usar um assistente de IA para preencher docs e agents com o contexto mais recente do repositório',
  'commands.fill.arguments.repoPath': 'Caminho da raiz do repositório usado para montar o contexto',
  'commands.fill.options.output': 'Diretório com docs/ e agents/ gerados pela base',
  'commands.fill.options.apiKey': 'Chave de API para o provedor de LLM',
  'commands.fill.options.model': 'Modelo de LLM a ser utilizado',
  'commands.fill.options.provider': 'Provedor de LLM (apenas openrouter)',
  'commands.fill.options.baseUrl': 'URL base personalizada para as APIs do provedor',
  'commands.fill.options.prompt': 'Caminho para o prompt de instrução',
  'commands.fill.options.limit': 'Número máximo de arquivos a processar',
  'commands.fill.options.exclude': 'Padrões glob para excluir da análise do repositório',
  'commands.fill.options.include': 'Padrões glob para incluir durante a análise',
  'commands.fill.options.verbose': 'Ativa logs detalhados',
  'commands.plan.description': 'Criar um plano de desenvolvimento que conecta docs e playbooks de agentes',
  'commands.plan.arguments.planName': 'Nome do plano (usado como slug do arquivo)',
  'commands.plan.options.output': 'Diretório com docs/ e agents/ gerados pela base',
  'commands.plan.options.title': 'Título personalizado para o plano',
  'commands.plan.options.summary': 'Resumo inicial para o cabeçalho do plano',
  'commands.plan.options.force': 'Sobrescreve o plano se ele já existir (modo base)',
  'commands.plan.options.fill': 'Usa um assistente de IA para preencher ou atualizar o plano em vez de apenas gerar',
  'commands.plan.options.repo': 'Raiz do repositório para sumarização adicional',
  'commands.plan.options.apiKey': 'Chave de API para o provedor de LLM',
  'commands.plan.options.model': 'Modelo de LLM a ser utilizado',
  'commands.plan.options.provider': 'Provedor de LLM (apenas openrouter)',
  'commands.plan.options.baseUrl': 'URL base personalizada para as APIs do provedor',
  'commands.plan.options.prompt': 'Caminho para o prompt de atualização do plano',
  'commands.plan.options.dryRun': 'Pré-visualiza as atualizações sem escrever arquivos',
  'commands.plan.options.include': 'Padrões glob para incluir na análise do repositório',
  'commands.plan.options.exclude': 'Padrões glob para excluir da análise do repositório',
  'commands.plan.options.verbose': 'Ativa logs detalhados',
  'errors.init.scaffoldFailed': 'Falha ao gerar os artefatos base',
  'errors.fill.failed': 'Falha ao preencher documentação e agentes com ajuda de um assistente de IA',
  'errors.plan.creationFailed': 'Falha ao criar o template do plano',
  'errors.init.invalidType': 'Tipo de base "{value}" inválido. Use um dos seguintes: {allowed}',
  'errors.common.repoMissing': 'O caminho do repositório não existe: {path}',
  'warnings.scaffold.noneSelected': 'Nenhuma documentação ou playbook selecionado. Nada a gerar.',
  'steps.init.analyze': 'Analisando a estrutura do repositório',
  'steps.init.docs': 'Gerando bases de documentação',
  'steps.init.agents': 'Gerando playbooks de agentes',
  'spinner.repo.scanning': 'Escaneando o repositório...',
  'spinner.repo.scanComplete': 'Encontrados {fileCount} arquivos em {directoryCount} diretórios',
  'spinner.docs.creating': 'Criando diretório e templates de docs...',
  'spinner.docs.created': 'Scaffold de documentação criado ({count} arquivos)',
  'spinner.agents.creating': 'Criando diretório e templates de agentes...',
  'spinner.agents.created': 'Scaffold de agentes criado ({count} arquivos)',
  'spinner.plan.creating': 'Criando template de plano...',
  'spinner.plan.created': 'Template de plano criado',
  'spinner.plan.creationFailed': 'Falha ao criar o template do plano',
  'success.scaffold.ready': 'Base disponível em {path}',
  'success.plan.createdAt': 'Plano criado em {path}',
  'errors.fill.missingDocsScaffold': 'Scaffold de documentação não encontrado. Execute `ai-context init` primeiro.',
  'errors.fill.missingAgentsScaffold': 'Scaffold de agentes não encontrado. Execute `ai-context init` primeiro.',
  'steps.fill.analyze': 'Analisando a estrutura do repositório',
  'warnings.fill.noTargets': 'Nenhum arquivo Markdown foi encontrado em .context/docs ou .context/agents. Execute "ai-context init" antes de preencher.',
  'steps.fill.processFiles': 'Atualizando {count} arquivos com {model}',
  'spinner.fill.processing': 'Processando {path}...',
  'spinner.fill.noContent': 'Nenhum conteúdo recebido para {path}',
  'messages.fill.emptyResponse': 'Resposta vazia do assistente de IA',
  'messages.fill.previewStart': '--- Início da prévia ---',
  'messages.fill.previewEnd': '--- Fim da prévia ---',
  'spinner.fill.updated': 'Atualizado {path}',
  'spinner.fill.failed': 'Falha em {path}',
  'steps.fill.summary': 'Resumindo o uso do assistente de IA',
  'success.fill.completed': 'Preenchimento com assistente de IA concluído. Revise as mudanças e faça o commit quando estiver pronto.',
  'errors.plan.invalidName': 'O nome do plano deve conter ao menos um caractere alfanumérico.',
  'messages.plan.regenerated': 'Regerado {path} antes do preenchimento com assistente de IA.',
  'messages.plan.created': 'Criado {path} antes do preenchimento com assistente de IA.',
  'info.plan.scaffolded.title': 'Plano criado',
  'errors.plan.missingPlansDir': 'Diretório de planos não encontrado. Execute `ai-context plan <nome>` para criar um.',
  'errors.plan.notFound': 'Plano não encontrado. Esperado {expected}.',
  'steps.plan.summary': 'Resumindo estado do repositório',
  'spinner.planFill.analyzingRepo': 'Analisando repositório...',
  'spinner.planFill.summaryReady': 'Resumo do repositório pronto',
  'steps.plan.update': 'Atualizando {path} com {model}',
  'spinner.planFill.updating': 'Preenchendo {path}...',
  'spinner.planFill.noContent': 'Nenhum conteúdo recebido do assistente de IA',
  'spinner.planFill.dryRun': 'Execução simulada - prévia a seguir',
  'spinner.planFill.updated': 'Atualizado {path}',
  'spinner.planFill.failed': 'Falha ao preencher o plano',
  'steps.plan.summaryResults': 'Resumindo o uso do assistente de IA',
  'success.plan.filled': 'Preenchimento do plano concluído. Revise as atualizações e faça o commit quando estiver pronto.',
  'errors.commands.analyzeRemoved': 'O comando analyze foi removido na versão focada em bases do ai-context.',
  'errors.commands.updateRemoved': 'O comando update não é mais suportado. Execute `ai-context init` novamente para atualizar as bases.',
  'errors.commands.previewRemoved': 'O modo de pré-visualização foi descontinuado. Use diretamente os docs e playbooks gerados.',
  'errors.commands.guidelinesRemoved': 'A geração de guidelines dependia de LLMs e não está mais disponível.',
  'errors.cli.executionFailed': 'Falha na execução do CLI',
  'prompts.main.action': 'O que você gostaria de fazer?',
  'prompts.main.choice.scaffold': 'Gerar bases de documentação/agentes',
  'prompts.main.choice.fill': 'Preencher docs e agentes com um LLM',
  'prompts.main.choice.plan': 'Criar um plano de desenvolvimento',
  'prompts.main.choice.changeLanguage': 'Mudar idioma',
  'prompts.main.choice.exit': 'Sair do modo interativo',
  'prompts.scaffold.repoPath': 'Caminho do repositório para analisar',
  'prompts.scaffold.type': 'O que devemos gerar?',
  'prompts.scaffold.typeBoth': 'Docs e playbooks',
  'prompts.scaffold.typeDocs': 'Somente docs',
  'prompts.scaffold.typeAgents': 'Somente playbooks',
  'prompts.common.verbose': 'Ativar logs detalhados?',
  'prompts.fill.repoPath': 'Caminho do repositório que contém a base',
  'prompts.fill.promptPath': 'Caminho do prompt personalizado (deixe em branco para usar o padrão incluso)',
  'prompts.fill.limit': 'Número máximo de arquivos a atualizar (deixe em branco para todos)',
  'prompts.fill.overrideModel': 'Sobrescrever configuração de provedor/modelo?',
  'prompts.fill.model': 'Identificador do modelo',
  'prompts.fill.provideApiKey': 'Informar uma chave de API para esta execução?',
  'prompts.fill.apiKey': 'Chave de API',
  'prompts.plan.name': 'Nome do plano (usado no slug do arquivo)',
  'prompts.plan.mode': 'Como você quer trabalhar com este plano?',
  'prompts.plan.modeScaffold': 'Gerar um template de plano',
  'prompts.plan.modeFill': 'Criar um plano com I.A. (cria um plano com o contexto atual)',
  'prompts.plan.summary': 'Resumo opcional para iniciar o plano (deixe em branco para adicionar depois)',
  'prompts.plan.repoPath': 'Raiz do repositório para contexto',
  'prompts.plan.dryRun': 'Pré-visualizar atualizações sem escrever arquivos?',
  'prompts.language.select': 'Escolha o idioma do CLI / Choose the CLI language',
  'prompts.language.option.en': 'Inglês / English',
  'prompts.language.option.pt-BR': 'Português (Brasil) / Portuguese (Brazil)',
  'errors.plan.fillFailed': 'Falha ao preencher o plano com ajuda de um assistente de IA',
  'errors.fill.promptMissing': 'Arquivo de prompt não encontrado em {path}.',
  'errors.fill.apiKeyMissing': 'É necessária uma chave de API {provider}. Defina uma das variáveis {envVars} ou use --api-key.',
  'info.interactive.returning.title': 'Menu principal',
  'info.interactive.returning.detail': 'Voltando ao menu interativo. Escolha outra ação ou selecione Sair.',
  'success.interactive.goodbye': 'Até logo! Obrigado por usar o ai-context.'
};

const dictionaries: Record<Locale, TranslationDictionary> = {
  en: englishMessages,
  'pt-BR': portugueseMessages
};

export type TranslateParams = Record<string, string | number | undefined>;

export type TranslateFn = (key: TranslationKey, params?: TranslateParams) => string;

export function createTranslator(locale: Locale): TranslateFn {
  const normalized = normalizeLocale(locale);
  return (key: TranslationKey, params?: TranslateParams) => {
    const dictionary = dictionaries[normalized] || dictionaries[DEFAULT_LOCALE];
    const fallback = dictionaries[DEFAULT_LOCALE];
    const template = dictionary[key] ?? fallback[key];
    return fillTemplate(template, params);
  };
}

export function normalizeLocale(locale: string): Locale {
  return SUPPORTED_LOCALES.find(candidate => candidate.toLowerCase() === locale.toLowerCase()) || DEFAULT_LOCALE;
}

export function detectLocale(argv: string[], envLocale?: string | null): Locale {
  const candidateFromArgs = extractLocaleFromArgs(argv);
  if (candidateFromArgs) {
    return normalizeLocale(candidateFromArgs);
  }
  if (envLocale) {
    return normalizeLocale(envLocale);
  }
  return DEFAULT_LOCALE;
}

function extractLocaleFromArgs(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const segment = argv[index];
    if (segment === '--lang' || segment === '--language' || segment === '-l') {
      return argv[index + 1];
    }
    if (segment.startsWith('--lang=')) {
      return segment.split('=')[1];
    }
    if (segment.startsWith('--language=')) {
      return segment.split('=')[1];
    }
  }
  return undefined;
}

function fillTemplate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = params[key];
    return value === undefined ? '' : String(value);
  });
}

export function isSupportedLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.some(candidate => candidate.toLowerCase() === locale.toLowerCase());
}
