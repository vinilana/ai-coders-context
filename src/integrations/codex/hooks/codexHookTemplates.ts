import {
  buildHookDispatchCommand,
  CODEX_HOOK_DISPATCH_COMMAND,
  isCurrentDotcontextHookDispatchCommand,
  isDotcontextHookDispatchCommand,
  type ResolveHookDispatchCommandOptions,
} from '../../shared/hookDispatchCommands';

export { CODEX_HOOK_DISPATCH_COMMAND };

export interface CodexHookCommandEntry {
  type: 'command';
  command: string;
}

export interface CodexHookMatcherEntry {
  matcher?: string;
  hooks: CodexHookCommandEntry[];
}

export type CodexHookTemplate = CodexHookMatcherEntry[];

export function buildCodexHookTemplates(
  command: string = buildHookDispatchCommand('codex')
): Record<'SessionStart' | 'PostToolUse' | 'Stop', CodexHookTemplate> {
  return {
    SessionStart: [
      {
        matcher: '*',
        hooks: [{ type: 'command', command }],
      },
    ],
    PostToolUse: [
      {
        matcher: '^Write$|^Edit$|^Bash$',
        hooks: [{ type: 'command', command }],
      },
    ],
    Stop: [
      {
        matcher: '*',
        hooks: [{ type: 'command', command }],
      },
    ],
  };
}

/**
 * Static template shape built with the pinned npx command. Prefer
 * buildCodexHookTemplates() when writing configs so the command can resolve
 * to the local dotcontext binary when it is available.
 */
export const CODEX_HOOK_TEMPLATES: Record<
  'SessionStart' | 'PostToolUse' | 'Stop',
  CodexHookTemplate
> = buildCodexHookTemplates(CODEX_HOOK_DISPATCH_COMMAND);

export function buildCodexHooksFragment(
  options?: ResolveHookDispatchCommandOptions
): Record<string, CodexHookTemplate> {
  return buildCodexHookTemplates(buildHookDispatchCommand('codex', options));
}

export function buildCodexHooksDocument(
  options?: ResolveHookDispatchCommandOptions
): { hooks: Record<string, CodexHookTemplate> } {
  return { hooks: buildCodexHooksFragment(options) };
}

export function isDotcontextCodexHookCommand(command: unknown): boolean {
  return isDotcontextHookDispatchCommand(command, 'codex');
}

export function isCurrentCodexHookCommand(
  command: unknown,
  options?: ResolveHookDispatchCommandOptions
): boolean {
  return isCurrentDotcontextHookDispatchCommand(command, 'codex', options);
}

export interface BuildCodexTomlHookBlocksOptions {
  includeFeatures?: boolean;
  resolveOptions?: ResolveHookDispatchCommandOptions;
}

export function buildCodexTomlHookBlocks(
  options: BuildCodexTomlHookBlocksOptions = {}
): string {
  const lines: string[] = [];

  if (options.includeFeatures ?? true) {
    lines.push('[features]', 'hooks = true', '');
  }

  const templates = buildCodexHookTemplates(
    buildHookDispatchCommand('codex', options.resolveOptions)
  );

  for (const [eventName, entries] of Object.entries(templates)) {
    for (const entry of entries) {
      lines.push(`[[hooks.${eventName}]]`);
      if (entry.matcher) {
        lines.push(`matcher = ${JSON.stringify(entry.matcher)}`);
      }
      for (const hook of entry.hooks) {
        lines.push(`command = ${JSON.stringify(hook.command)}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

export const CODEX_HOOK_TRUST_REMINDER =
  'After install, run /hooks in Codex and trust project hooks when prompted.';
