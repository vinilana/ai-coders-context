import * as fs from 'fs-extra';
import * as path from 'path';

import { getContextRootPath } from '../../shared/context';
import type { HarnessHookResponse } from '../../harness';

import { extractHarnessSessionId } from './extractHarnessSessionId';

export type ShellHookSource = 'claude-code' | 'codex';

export interface HookSessionBinding {
  harnessSessionId: string;
  hostSessionId: string;
  source: ShellHookSource;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
}

interface HookSessionStoreDocument {
  bindings: Record<string, Record<string, HookSessionBinding>>;
}

export type HookSessionAdapterParams =
  | {
    action: 'createSession';
    name: string;
    metadata?: Record<string, unknown>;
  }
  | {
    action: 'completeSession';
    sessionId: string;
    note?: string;
  };

export interface HookSessionAdapter {
  handle(event: {
    tool: 'harness';
    params: HookSessionAdapterParams;
    source?: string;
  }): Promise<HarnessHookResponse>;
}

/**
 * Bindings older than this are treated as leftovers from host sessions that
 * ended without a SessionEnd hook (crash, closed terminal) and are completed
 * during the next SessionStart sweep.
 */
export const STALE_HOOK_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function storeKey(source: ShellHookSource, hostSessionId: string): string {
  return `${source}:${hostSessionId}`;
}

async function getStorePath(repoPath: string): Promise<string> {
  const contextRoot = await getContextRootPath(repoPath);
  return path.join(contextRoot, 'runtime', 'hooks', 'host-sessions.json');
}

async function readStore(repoPath: string): Promise<HookSessionStoreDocument> {
  const storePath = await getStorePath(repoPath);
  if (!await fs.pathExists(storePath)) {
    return { bindings: {} };
  }

  try {
    const document = await fs.readJson(storePath) as HookSessionStoreDocument;
    if (!document.bindings || typeof document.bindings !== 'object') {
      return { bindings: {} };
    }
    return document;
  } catch {
    return { bindings: {} };
  }
}

async function writeStore(repoPath: string, document: HookSessionStoreDocument): Promise<void> {
  const storePath = await getStorePath(repoPath);
  await fs.ensureDir(path.dirname(storePath));
  await fs.writeJson(storePath, document, { spaces: 2 });
}

export async function getHookHarnessSessionId(options: {
  repoPath: string;
  source: ShellHookSource;
  hostSessionId: string;
}): Promise<string | undefined> {
  const document = await readStore(options.repoPath);
  const binding = document.bindings[options.source]?.[options.hostSessionId];
  return binding?.harnessSessionId;
}

export async function saveHookHarnessSession(binding: HookSessionBinding): Promise<void> {
  const document = await readStore(binding.repoPath);
  const sourceBindings = document.bindings[binding.source] ?? {};
  sourceBindings[binding.hostSessionId] = binding;
  document.bindings[binding.source] = sourceBindings;
  await writeStore(binding.repoPath, document);
}

export async function ensureHookHarnessSession(
  adapter: HookSessionAdapter,
  options: {
    repoPath: string;
    source: ShellHookSource;
    hostSessionId: string;
  }
): Promise<string> {
  const document = await readStore(options.repoPath);
  const existing = document.bindings[options.source]?.[options.hostSessionId];
  if (existing) {
    existing.updatedAt = new Date().toISOString();
    await writeStore(options.repoPath, document);
    return existing.harnessSessionId;
  }

  const now = new Date().toISOString();
  const response = await adapter.handle({
    tool: 'harness',
    params: {
      action: 'createSession',
      name: `hook:${options.source}:${options.hostSessionId.slice(0, 12)}`,
      metadata: {
        host: options.source,
        hostSessionId: options.hostSessionId,
      },
    },
    source: options.source,
  });

  const harnessSessionId = extractHarnessSessionId(response);
  if (!response.ok || !harnessSessionId) {
    const message = !response.ok ? response.error.message : 'Harness session id missing from createSession response';
    throw new Error(message);
  }

  await saveHookHarnessSession({
    harnessSessionId,
    hostSessionId: options.hostSessionId,
    source: options.source,
    repoPath: options.repoPath,
    createdAt: now,
    updatedAt: now,
  });

  return harnessSessionId;
}

export function hookSessionStoreKey(source: ShellHookSource, hostSessionId: string): string {
  return storeKey(source, hostSessionId);
}

/**
 * Marks a binding as recently active so long-lived host sessions that keep
 * emitting tool events (but never re-trigger SessionStart) are not treated
 * as stale by the SessionStart sweep.
 */
export async function touchHookHarnessSession(options: {
  repoPath: string;
  source: ShellHookSource;
  hostSessionId: string;
}): Promise<void> {
  const document = await readStore(options.repoPath);
  const binding = document.bindings[options.source]?.[options.hostSessionId];
  if (!binding) {
    return;
  }

  binding.updatedAt = new Date().toISOString();
  await writeStore(options.repoPath, document);
}

export async function listHookHarnessSessionBindings(
  repoPath: string,
  source: ShellHookSource
): Promise<HookSessionBinding[]> {
  const document = await readStore(repoPath);
  return Object.values(document.bindings[source] ?? {});
}

export async function removeHookHarnessSession(options: {
  repoPath: string;
  source: ShellHookSource;
  hostSessionId: string;
}): Promise<void> {
  const document = await readStore(options.repoPath);
  const sourceBindings = document.bindings[options.source];
  if (!sourceBindings || !(options.hostSessionId in sourceBindings)) {
    return;
  }

  delete sourceBindings[options.hostSessionId];
  await writeStore(options.repoPath, document);
}

function isMissingHarnessSessionMessage(message: string): boolean {
  return message.includes('Harness session not found');
}

/**
 * Completes the harness session bound to a host session and removes the
 * binding. Never throws: session hygiene must not break hook dispatch.
 * The binding is removed only when completion succeeds or the session is
 * confirmed missing; transient failures keep the binding so the SessionStart
 * stale sweep can retry completion instead of leaking an active session.
 */
export async function completeHookHarnessSession(
  adapter: HookSessionAdapter,
  options: {
    repoPath: string;
    source: ShellHookSource;
    hostSessionId: string;
    note?: string;
  }
): Promise<boolean> {
  let harnessSessionId: string | undefined;
  try {
    harnessSessionId = await getHookHarnessSessionId(options);
  } catch {
    return false;
  }

  if (!harnessSessionId) {
    return false;
  }

  let completed = false;
  let sessionMissing = false;
  try {
    const response = await adapter.handle({
      tool: 'harness',
      params: {
        action: 'completeSession',
        sessionId: harnessSessionId,
        note: options.note ?? 'Host session ended',
      },
      source: options.source,
    });
    completed = response.ok;
    sessionMissing = !response.ok && isMissingHarnessSessionMessage(response.error.message);
  } catch (error) {
    completed = false;
    sessionMissing = error instanceof Error && isMissingHarnessSessionMessage(error.message);
  }

  if (completed || sessionMissing) {
    try {
      await removeHookHarnessSession(options);
    } catch {
      // Binding cleanup must never make hook dispatch blocking.
    }
  }

  return completed;
}

/**
 * Completes and unbinds harness sessions whose bindings have not been touched
 * within maxAgeMs. Covers host sessions that ended without a SessionEnd hook
 * (crash, closed terminal), so runtime sessions do not stay open forever.
 */
export async function sweepStaleHookHarnessSessions(
  adapter: HookSessionAdapter,
  options: {
    repoPath: string;
    source: ShellHookSource;
    currentHostSessionId?: string;
    maxAgeMs?: number;
    now?: Date;
  }
): Promise<number> {
  const maxAgeMs = options.maxAgeMs ?? STALE_HOOK_SESSION_MAX_AGE_MS;
  const cutoff = (options.now ?? new Date()).getTime() - maxAgeMs;

  let bindings: HookSessionBinding[];
  try {
    bindings = await listHookHarnessSessionBindings(options.repoPath, options.source);
  } catch {
    return 0;
  }

  let swept = 0;
  for (const binding of bindings) {
    if (binding.hostSessionId === options.currentHostSessionId) {
      continue;
    }

    const updatedAt = Date.parse(binding.updatedAt);
    if (Number.isNaN(updatedAt) || updatedAt > cutoff) {
      continue;
    }

    await completeHookHarnessSession(adapter, {
      repoPath: options.repoPath,
      source: options.source,
      hostSessionId: binding.hostSessionId,
      note: 'Stale host session swept at SessionStart',
    });
    swept += 1;
  }

  return swept;
}
