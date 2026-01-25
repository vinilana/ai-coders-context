import * as path from 'path';
import * as fs from 'fs-extra';

export interface CommandTemplate {
  /** Slash command name (without leading slash) */
  name: string;
  description: string;
  body: string;
}

export interface CommandGeneratorResult {
  commandsDir: string;
  generated: string[];
  skipped: string[];
}

function defaultMcpCommandTemplates(): CommandTemplate[] {
  return [
    {
      name: 'mcp-context-init',
      description: 'Initialize .context scaffolding via MCP',
      body: `When invoked, call the MCP tool \`context\` with action \`init\`.

Use sensible defaults:
- \`type\`: \`both\`
- \`includeContentStubs\`: true
- \`skipContentGeneration\`: true

Then list the pending files returned by the tool (if any) and suggest next steps (\`fillSingle\`, then \`workflow-init\`).`,
    },
    {
      name: 'context-sync',
      description: 'Sync/export .context via CLI',
      body: `When invoked, run the CLI command:

\`npx @ai-coders/context export-context\`

Use the default policy (do not pass \`--preset all\`) so the sync matches these defaults:
- codex: commands + skills
- antigravity: commands + skills
- github copilot: skills + agents
- claude code: rules + agents + skills + commands
- cursor: skills + agents + commands

If the user requests a specific tool only, use \`--preset\` (e.g. \`--preset codex\`) and keep the same component defaults.`,
    },
  ];
}

function wrapAsCommandMarkdown(t: CommandTemplate): string {
  return `---
name: ${t.name}
description: ${t.description}
---

# /${t.name}

${t.body}
`;
}

export class CommandGenerator {
  async generate(outputDir: string, options?: { force?: boolean }): Promise<CommandGeneratorResult> {
    const force = Boolean(options?.force);
    const commandsDir = path.join(outputDir, 'commands');
    await fs.ensureDir(commandsDir);

    const generated: string[] = [];
    const skipped: string[] = [];

    const readmePath = path.join(commandsDir, 'README.md');
    if (!await fs.pathExists(readmePath) || force) {
      const content = `# Slash Commands

These commands are prompt templates intended to be synced into AI tools that support custom slash commands / prompt files.

- **Source of truth**: \`.context/commands/\`
- **Export/sync**: use the tool's sync/export functionality (see repository docs) to copy these into each tool's folder.
`;
      await fs.writeFile(readmePath, content, 'utf-8');
      generated.push(readmePath);
    } else {
      skipped.push(readmePath);
    }

    for (const template of defaultMcpCommandTemplates()) {
      const legacyDir = path.join(commandsDir, template.name);
      const legacyFile = path.join(legacyDir, 'COMMAND.md');
      const commandFile = path.join(commandsDir, `${template.name}.md`);

      // Backward compatible: if legacy folder format exists, don't overwrite unless force
      if (await fs.pathExists(legacyFile) && !force) {
        skipped.push(legacyFile);
        continue;
      }

      if (await fs.pathExists(commandFile) && !force) {
        skipped.push(commandFile);
        continue;
      }

      await fs.writeFile(commandFile, wrapAsCommandMarkdown(template), 'utf-8');
      generated.push(commandFile);
    }

    return { commandsDir, generated, skipped };
  }
}
