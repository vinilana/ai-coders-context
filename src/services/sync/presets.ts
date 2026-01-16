import path from 'node:path';
import type { TargetPreset, PresetName } from './types';

export const TARGET_PRESETS: Record<Exclude<PresetName, 'all'>, TargetPreset> = {
  claude: {
    name: 'claude',
    path: '.claude/agents',
    description: 'Claude Code agents directory'
  },
  github: {
    name: 'github',
    path: '.github/agents',
    description: 'GitHub Copilot agents directory'
  },
  cursor: {
    name: 'cursor',
    path: '.cursor/agents',
    description: 'Cursor AI agents directory'
  },
  windsurf: {
    name: 'windsurf',
    path: '.windsurf/agents',
    description: 'Windsurf (Codeium) agents directory'
  },
  cline: {
    name: 'cline',
    path: '.cline/agents',
    description: 'Cline VS Code extension agents directory'
  },
  continue: {
    name: 'continue',
    path: '.continue/agents',
    description: 'Continue.dev agents directory'
  },
  antigravity: {
    name: 'antigravity',
    path: '.agent/agents',
    description: 'Google Antigravity agents directory'
  },
  trae: {
    name: 'trae',
    path: '.trae/agents',
    description: 'Trae AI agents directory'
  }
};

export function resolvePresets(presetName: PresetName): TargetPreset[] {
  if (presetName === 'all') {
    return Object.values(TARGET_PRESETS);
  }

  const preset = TARGET_PRESETS[presetName];
  return preset ? [preset] : [];
}

export function getPresetByPath(targetPath: string): TargetPreset | undefined {
  const normalizedTarget = path.normalize(path.resolve(targetPath));

  for (const preset of Object.values(TARGET_PRESETS)) {
    const normalizedPreset = path.normalize(path.resolve(preset.path));

    if (normalizedTarget === normalizedPreset ||
        normalizedTarget.startsWith(normalizedPreset + path.sep)) {
      return preset;
    }
  }

  return undefined;
}

export function getAllPresetNames(): PresetName[] {
  return ['claude', 'github', 'cursor', 'windsurf', 'cline', 'continue', 'antigravity', 'trae', 'all'];
}
