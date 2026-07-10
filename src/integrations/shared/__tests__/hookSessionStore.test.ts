import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import { createHarnessHookAdapter } from '../../../harness';
import {
  CLAUDE_CODE_HOOK_DISPATCH_COMMAND,
  CODEX_HOOK_DISPATCH_COMMAND,
} from '../hookDispatchCommands';
import {
  completeHookHarnessSession,
  ensureHookHarnessSession,
  getHookHarnessSessionId,
  listHookHarnessSessionBindings,
  removeHookHarnessSession,
  saveHookHarnessSession,
  sweepStaleHookHarnessSessions,
  touchHookHarnessSession,
  type HookSessionAdapter,
} from '../hookSessionStore';
import { VERSION } from '../../../version';

describe('hookDispatchCommands', () => {
  it('pins the npx dispatch command to the installed CLI version', () => {
    expect(CLAUDE_CODE_HOOK_DISPATCH_COMMAND).toContain(`npx -y @dotcontext/cli@${VERSION}`);
    expect(CODEX_HOOK_DISPATCH_COMMAND).toContain(`npx -y @dotcontext/cli@${VERSION}`);
    expect(CLAUDE_CODE_HOOK_DISPATCH_COMMAND).not.toContain('@latest');
    expect(CODEX_HOOK_DISPATCH_COMMAND).not.toContain('@latest');
  });
});

describe('hookSessionStore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dotcontext-hook-session-'));
    await fs.ensureDir(path.join(tempDir, '.context', 'runtime', 'sessions'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('creates and reuses harness session bindings per host session', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-1';

    const first = await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const second = await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(second).toBe(first);

    const stored = await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(stored).toBe(first);
  });

  it('touches updatedAt when a binding is reused', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-touch';

    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const staleTimestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const [binding] = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    await saveHookHarnessSession({ ...binding, updatedAt: staleTimestamp });

    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const [touched] = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    expect(Date.parse(touched.updatedAt)).toBeGreaterThan(Date.parse(staleTimestamp));
  });

  it('removes bindings and tolerates missing entries', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-remove';

    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    await removeHookHarnessSession({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    })).toBeUndefined();

    await expect(removeHookHarnessSession({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'never-bound',
    })).resolves.toBeUndefined();
  });

  it('completes the bound harness session and removes the binding', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-complete';

    const harnessSessionId = await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const completed = await completeHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(completed).toBe(true);

    const sessionPath = path.join(
      tempDir, '.context', 'runtime', 'sessions', harnessSessionId, 'session.json'
    );
    const session = await fs.readJson(sessionPath);
    expect(session.status).toBe('completed');

    expect(await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    })).toBeUndefined();
  });

  it('touches updatedAt for an existing binding and no-ops without one', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-tool-touch';

    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const staleTimestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const [binding] = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    await saveHookHarnessSession({ ...binding, updatedAt: staleTimestamp });

    await touchHookHarnessSession({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const [touched] = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    expect(Date.parse(touched.updatedAt)).toBeGreaterThan(Date.parse(staleTimestamp));

    await expect(touchHookHarnessSession({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'never-bound',
    })).resolves.toBeUndefined();
  });

  it('keeps the binding when completion fails transiently so the sweep can retry', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-transient';

    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    const failingAdapter: HookSessionAdapter = {
      handle: async () => ({
        ok: false,
        source: 'claude-code',
        error: { message: 'EBUSY: resource busy or locked' },
      }),
    };

    const completed = await completeHookHarnessSession(failingAdapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(completed).toBe(false);
    expect(await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    })).toBeDefined();

    const retried = await completeHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(retried).toBe(true);
    expect(await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    })).toBeUndefined();
  });

  it('removes the binding when the harness session is confirmed missing', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });
    const hostSessionId = 'claude-host-missing';

    const harnessSessionId = await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    await fs.remove(path.join(tempDir, '.context', 'runtime', 'sessions', harnessSessionId));

    const completed = await completeHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    });

    expect(completed).toBe(false);
    expect(await getHookHarnessSessionId({
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId,
    })).toBeUndefined();
  });

  it('returns false without a binding and never throws', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });

    await expect(completeHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'never-bound',
    })).resolves.toBe(false);
  });

  it('sweeps stale bindings but keeps fresh and current ones', async () => {
    const adapter = createHarnessHookAdapter({ repoPath: tempDir, source: 'claude-code' });

    const staleSessionId = await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'stale-host',
    });
    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'fresh-host',
    });
    await ensureHookHarnessSession(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      hostSessionId: 'current-host',
    });

    const staleTimestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const bindings = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    const staleBinding = bindings.find((binding) => binding.hostSessionId === 'stale-host')!;
    const currentBinding = bindings.find((binding) => binding.hostSessionId === 'current-host')!;
    await saveHookHarnessSession({ ...staleBinding, updatedAt: staleTimestamp });
    await saveHookHarnessSession({ ...currentBinding, updatedAt: staleTimestamp });

    const swept = await sweepStaleHookHarnessSessions(adapter, {
      repoPath: tempDir,
      source: 'claude-code',
      currentHostSessionId: 'current-host',
    });

    expect(swept).toBe(1);

    const remaining = await listHookHarnessSessionBindings(tempDir, 'claude-code');
    const remainingHosts = remaining.map((binding) => binding.hostSessionId).sort();
    expect(remainingHosts).toEqual(['current-host', 'fresh-host']);

    const staleSessionPath = path.join(
      tempDir, '.context', 'runtime', 'sessions', staleSessionId, 'session.json'
    );
    const staleSession = await fs.readJson(staleSessionPath);
    expect(staleSession.status).toBe('completed');
  });
});
