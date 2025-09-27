interface FrontMatterConfig {
  id: string;
  goal: string;
  requiredInputs: string[];
  successCriteria: string[];
  relatedAgents?: string[];
}

export function createFrontMatter(config: FrontMatterConfig): string {
  const lines: string[] = ['---'];
  lines.push(`id: ${config.id}`);
  lines.push(`ai_update_goal: "${escapeYaml(config.goal)}"`);
  lines.push('required_inputs:');
  config.requiredInputs.forEach(item => {
    lines.push(`  - "${escapeYaml(item)}"`);
  });
  lines.push('success_criteria:');
  config.successCriteria.forEach(item => {
    lines.push(`  - "${escapeYaml(item)}"`);
  });
  if (config.relatedAgents && config.relatedAgents.length > 0) {
    lines.push('related_agents:');
    config.relatedAgents.forEach(agent => {
      lines.push(`  - "${escapeYaml(agent)}"`);
    });
  }
  lines.push('---\n');
  return lines.join('\n');
}

export function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
}
