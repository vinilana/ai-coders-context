import {
  buildHookDispatchCommand,
  CLAUDE_CODE_HOOK_DISPATCH_COMMAND,
  isCurrentDotcontextHookDispatchCommand,
  isDotcontextHookDispatchCommand,
  type ResolveHookDispatchCommandOptions,
} from '../../shared/hookDispatchCommands';

export { CLAUDE_CODE_HOOK_DISPATCH_COMMAND };

export interface ClaudeCodeHookCommandEntry {
  type: 'command';
  command: string;
}

export interface ClaudeCodeHookMatcherEntry {
  matcher?: string;
  hooks: ClaudeCodeHookCommandEntry[];
}

export type ClaudeCodeHookTemplate = ClaudeCodeHookMatcherEntry[];

export function buildClaudeCodeHookTemplates(
  command: string = buildHookDispatchCommand('claude-code')
): Record<'SessionStart' | 'PostToolUse' | 'Stop' | 'SessionEnd', ClaudeCodeHookTemplate> {
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
        hooks: [{ type: 'command', command }],
      },
    ],
    SessionEnd: [
      {
        hooks: [{ type: 'command', command }],
      },
    ],
  };
}

/**
 * Static template shape built with the pinned npx command. Prefer
 * buildClaudeCodeHookTemplates() when writing configs so the command can
 * resolve to the local dotcontext binary when it is available.
 */
export const CLAUDE_CODE_HOOK_TEMPLATES: Record<
  'SessionStart' | 'PostToolUse' | 'Stop' | 'SessionEnd',
  ClaudeCodeHookTemplate
> = buildClaudeCodeHookTemplates(CLAUDE_CODE_HOOK_DISPATCH_COMMAND);

export function buildClaudeCodeHooksFragment(
  options?: ResolveHookDispatchCommandOptions
): Record<string, ClaudeCodeHookTemplate> {
  return buildClaudeCodeHookTemplates(buildHookDispatchCommand('claude-code', options));
}

export function isDotcontextClaudeCodeHookCommand(command: unknown): boolean {
  return isDotcontextHookDispatchCommand(command, 'claude-code');
}

export function isCurrentClaudeCodeHookCommand(
  command: unknown,
  options?: ResolveHookDispatchCommandOptions
): boolean {
  return isCurrentDotcontextHookDispatchCommand(command, 'claude-code', options);
}
