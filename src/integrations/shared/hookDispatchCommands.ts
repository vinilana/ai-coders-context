import * as fs from 'fs';
import * as path from 'path';

import { VERSION } from '../../version';

export type HookDispatchCommandSource = 'claude-code' | 'codex';

export const HOOK_DISPATCH_BINARY_NAME = 'dotcontext';

/**
 * Dispatch command used when a `dotcontext` executable is available on PATH.
 * Invoking the binary directly avoids spawning npx (and re-resolving the
 * package) on every host lifecycle event.
 */
export const HOOK_DISPATCH_LOCAL_CLI = `${HOOK_DISPATCH_BINARY_NAME} hook dispatch`;

/**
 * Fallback dispatch command pinned to the version of the CLI that performed
 * the install. Pinning avoids re-resolving the `latest` dist-tag from the npm
 * registry on every hook invocation, which adds startup latency and registry
 * traffic to every SessionStart/PostToolUse/Stop event.
 */
export const HOOK_DISPATCH_PINNED_CLI = `npx -y @dotcontext/cli@${VERSION} hook dispatch`;

export const HOOK_DISPATCH_CLI = HOOK_DISPATCH_PINNED_CLI;

export const CLAUDE_CODE_HOOK_DISPATCH_COMMAND =
  `${HOOK_DISPATCH_PINNED_CLI} --source claude-code`;

export const CODEX_HOOK_DISPATCH_COMMAND =
  `${HOOK_DISPATCH_PINNED_CLI} --source codex`;

export interface ResolveHookDispatchCommandOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

function candidateBinaryNames(platform: NodeJS.Platform): string[] {
  if (platform === 'win32') {
    return [
      `${HOOK_DISPATCH_BINARY_NAME}.cmd`,
      `${HOOK_DISPATCH_BINARY_NAME}.exe`,
      `${HOOK_DISPATCH_BINARY_NAME}.bat`,
      HOOK_DISPATCH_BINARY_NAME,
    ];
  }

  return [HOOK_DISPATCH_BINARY_NAME];
}

function isExecutableFile(filePath: string, platform: NodeJS.Platform): boolean {
  try {
    if (!fs.statSync(filePath).isFile()) {
      return false;
    }

    if (platform !== 'win32') {
      // A regular file named dotcontext is not enough: hooks invoke it
      // directly, so it must carry execute permission for this process.
      fs.accessSync(filePath, fs.constants.X_OK);
    }

    return true;
  } catch {
    // Missing, unreadable, or non-executable entries are expected while
    // scanning PATH.
    return false;
  }
}

/**
 * Detects a globally installed `dotcontext` executable by scanning PATH.
 * Detection is filesystem-only so install stays fast and side-effect free.
 */
export function isDotcontextBinaryOnPath(
  options: ResolveHookDispatchCommandOptions = {}
): boolean {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const pathValue = env.PATH ?? env.Path ?? '';
  const directories = pathValue.split(path.delimiter).filter(Boolean);
  const names = candidateBinaryNames(platform);

  for (const directory of directories) {
    for (const name of names) {
      if (isExecutableFile(path.join(directory, name), platform)) {
        return true;
      }
    }
  }

  return false;
}

export function resolveHookDispatchCli(
  options: ResolveHookDispatchCommandOptions = {}
): string {
  return isDotcontextBinaryOnPath(options)
    ? HOOK_DISPATCH_LOCAL_CLI
    : HOOK_DISPATCH_PINNED_CLI;
}

/**
 * Resolves the dispatch command persisted into host hook configs.
 * Prefers the local binary; falls back to version-pinned npx.
 */
export function buildHookDispatchCommand(
  source: HookDispatchCommandSource,
  options: ResolveHookDispatchCommandOptions = {}
): string {
  return `${resolveHookDispatchCli(options)} --source ${source}`;
}

/**
 * Both command forms recognized for this CLI version. The pinned-npx form is
 * always current; the local-binary form is only current while a `dotcontext`
 * executable is on PATH (see isCurrentDotcontextHookDispatchCommand).
 */
export function getCanonicalHookDispatchCommands(
  source: HookDispatchCommandSource
): string[] {
  return [
    `${HOOK_DISPATCH_LOCAL_CLI} --source ${source}`,
    `${HOOK_DISPATCH_PINNED_CLI} --source ${source}`,
  ];
}

export function isDotcontextHookDispatchCommand(
  command: unknown,
  source: HookDispatchCommandSource
): boolean {
  if (typeof command !== 'string') {
    return false;
  }

  return command.includes('hook dispatch')
    && command.includes(`--source ${source}`);
}

export function isCurrentDotcontextHookDispatchCommand(
  command: unknown,
  source: HookDispatchCommandSource,
  options: ResolveHookDispatchCommandOptions = {}
): boolean {
  if (typeof command !== 'string') {
    return false;
  }

  if (command === `${HOOK_DISPATCH_PINNED_CLI} --source ${source}`) {
    return true;
  }

  // The local-binary form is only current while the binary is actually on
  // PATH; otherwise re-running the installer must repair the config instead
  // of skipping it as up to date.
  return command === `${HOOK_DISPATCH_LOCAL_CLI} --source ${source}`
    && isDotcontextBinaryOnPath(options);
}
