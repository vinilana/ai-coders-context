import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import { createHarnessHookAdapter } from '../../../harness';
import {
  CLAUDE_CODE_HOOK_DISPATCH_COMMAND,
  CODEX_HOOK_DISPATCH_COMMAND,
} from '../hookDispatchCommands';
import {
  ensureHookHarnessSession,
  getHookHarnessSessionId,
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
});
