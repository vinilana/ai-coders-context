export {
  HostHarnessHookAdapter,
  createHostHarnessHookAdapter,
  type HostHookAdapterOptions,
  type HostHookMapper,
  type HostHookAdapterRuntime,
} from './hostHookAdapter';

export {
  normalizeToolEvent,
  type NormalizedToolEvent,
} from './toolEventNormalizer';

export {
  resolveHarnessHookFromHostEvent,
  type ResolveHarnessHookOptions,
} from './resolveHarnessHookFromHostEvent';

export {
  resolveHookRepoRoot,
  type HookRepoRootResolution,
  type HookRepoRootResolutionSource,
  type ResolveHookRepoRootOptions,
} from './hookRepoRootResolver';

export {
  finalizeHostHookOutput,
  getHostHookOutputFields,
  type HostHookOutput,
} from './hostHookOutputContract';

export {
  mapHostHookResponse,
  mapHostHookResponseForSource,
} from './mapHostHookResponse';

export {
  HOOK_DISPATCH_BINARY_NAME,
  HOOK_DISPATCH_CLI,
  HOOK_DISPATCH_LOCAL_CLI,
  HOOK_DISPATCH_PINNED_CLI,
  CLAUDE_CODE_HOOK_DISPATCH_COMMAND,
  CODEX_HOOK_DISPATCH_COMMAND,
  buildHookDispatchCommand,
  getCanonicalHookDispatchCommands,
  isDotcontextBinaryOnPath,
  isDotcontextHookDispatchCommand,
  isCurrentDotcontextHookDispatchCommand,
  resolveHookDispatchCli,
  type HookDispatchCommandSource,
  type ResolveHookDispatchCommandOptions,
} from './hookDispatchCommands';

export {
  ensureHookHarnessSession,
  getHookHarnessSessionId,
  saveHookHarnessSession,
  type HookSessionAdapter,
  type HookSessionBinding,
  type ShellHookSource,
} from './hookSessionStore';

export { extractHarnessSessionId } from './extractHarnessSessionId';
export { formatNavigationExcerpt } from './formatNavigationExcerpt';
export { isSessionEndReentry } from './sessionEndReentry';

export type {
  HarnessHookEvent,
  HarnessHookResponse,
  HarnessHookSource,
} from '../../harness';
