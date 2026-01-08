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
  return ['claude', 'github', 'cursor', 'all'];
}
