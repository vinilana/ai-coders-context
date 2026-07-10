import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import {
  buildHookDispatchCommand,
  CLAUDE_CODE_HOOK_DISPATCH_COMMAND,
  CODEX_HOOK_DISPATCH_COMMAND,
  getCanonicalHookDispatchCommands,
  HOOK_DISPATCH_LOCAL_CLI,
  HOOK_DISPATCH_PINNED_CLI,
  isCurrentDotcontextHookDispatchCommand,
  isDotcontextBinaryOnPath,
  resolveHookDispatchCli,
} from '../hookDispatchCommands';
import { VERSION } from '../../../version';

describe('hookDispatchCommands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dotcontext-dispatch-cmd-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('pins the npx fallback to the installed CLI version instead of @latest', () => {
    expect(HOOK_DISPATCH_PINNED_CLI).toBe(`npx -y @dotcontext/cli@${VERSION} hook dispatch`);
    expect(CLAUDE_CODE_HOOK_DISPATCH_COMMAND).not.toContain('@latest');
    expect(CODEX_HOOK_DISPATCH_COMMAND).not.toContain('@latest');
  });

  describe('isDotcontextBinaryOnPath', () => {
    it('detects a dotcontext executable on PATH', async () => {
      const binaryPath = path.join(tempDir, 'dotcontext');
      await fs.outputFile(binaryPath, '#!/bin/sh\n');
      await fs.chmod(binaryPath, 0o755);

      expect(isDotcontextBinaryOnPath({
        env: { PATH: tempDir },
        platform: 'linux',
      })).toBe(true);
    });

    it('ignores a non-executable file named dotcontext on POSIX', async () => {
      const binaryPath = path.join(tempDir, 'dotcontext');
      await fs.outputFile(binaryPath, 'not a binary\n');
      await fs.chmod(binaryPath, 0o644);

      expect(isDotcontextBinaryOnPath({
        env: { PATH: tempDir },
        platform: 'linux',
      })).toBe(false);
    });

    it('detects Windows launcher variants', async () => {
      await fs.outputFile(path.join(tempDir, 'dotcontext.cmd'), '@echo off\n');

      expect(isDotcontextBinaryOnPath({
        env: { PATH: tempDir },
        platform: 'win32',
      })).toBe(true);
    });

    it('returns false when the binary is absent', () => {
      expect(isDotcontextBinaryOnPath({
        env: { PATH: tempDir },
        platform: 'linux',
      })).toBe(false);
    });

    it('ignores directories that match the binary name', async () => {
      await fs.ensureDir(path.join(tempDir, 'dotcontext'));

      expect(isDotcontextBinaryOnPath({
        env: { PATH: tempDir },
        platform: 'linux',
      })).toBe(false);
    });
  });

  describe('resolveHookDispatchCli / buildHookDispatchCommand', () => {
    it('prefers the local binary when it is on PATH', async () => {
      const binaryPath = path.join(tempDir, 'dotcontext');
      await fs.outputFile(binaryPath, '#!/bin/sh\n');
      await fs.chmod(binaryPath, 0o755);
      const options = { env: { PATH: tempDir }, platform: 'linux' as const };

      expect(resolveHookDispatchCli(options)).toBe(HOOK_DISPATCH_LOCAL_CLI);
      expect(buildHookDispatchCommand('claude-code', options)).toBe(
        `${HOOK_DISPATCH_LOCAL_CLI} --source claude-code`
      );
    });

    it('falls back to the pinned npx command when the binary is absent', () => {
      const options = { env: { PATH: tempDir }, platform: 'linux' as const };

      expect(resolveHookDispatchCli(options)).toBe(HOOK_DISPATCH_PINNED_CLI);
      expect(buildHookDispatchCommand('codex', options)).toBe(
        `${HOOK_DISPATCH_PINNED_CLI} --source codex`
      );
    });
  });

  describe('isCurrentDotcontextHookDispatchCommand', () => {
    it('accepts both canonical command forms when the binary is on PATH', async () => {
      const binaryPath = path.join(tempDir, 'dotcontext');
      await fs.outputFile(binaryPath, '#!/bin/sh\n');
      await fs.chmod(binaryPath, 0o755);
      const options = { env: { PATH: tempDir }, platform: 'linux' as const };

      for (const command of getCanonicalHookDispatchCommands('claude-code')) {
        expect(isCurrentDotcontextHookDispatchCommand(command, 'claude-code', options)).toBe(true);
      }
    });

    it('treats the pinned form as current even without the binary on PATH', () => {
      const options = { env: { PATH: tempDir }, platform: 'linux' as const };

      expect(isCurrentDotcontextHookDispatchCommand(
        `${HOOK_DISPATCH_PINNED_CLI} --source claude-code`,
        'claude-code',
        options
      )).toBe(true);
    });

    it('treats the local-binary form as stale when the binary left PATH', () => {
      const options = { env: { PATH: tempDir }, platform: 'linux' as const };

      expect(isCurrentDotcontextHookDispatchCommand(
        `${HOOK_DISPATCH_LOCAL_CLI} --source claude-code`,
        'claude-code',
        options
      )).toBe(false);
    });

    it('rejects the legacy @latest command so installs upgrade it', () => {
      expect(isCurrentDotcontextHookDispatchCommand(
        'npx -y @dotcontext/cli@latest hook dispatch --source claude-code',
        'claude-code'
      )).toBe(false);
    });

    it('rejects commands for another source and non-strings', () => {
      expect(isCurrentDotcontextHookDispatchCommand(
        `${HOOK_DISPATCH_LOCAL_CLI} --source codex`,
        'claude-code'
      )).toBe(false);
      expect(isCurrentDotcontextHookDispatchCommand(undefined, 'codex')).toBe(false);
    });
  });
});
