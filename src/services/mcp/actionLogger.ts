/**
 * MCP Action Logger
 *
 * Records MCP tool activity to a JSONL log under .context/workflow/.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { resolveContextRoot } from '../shared/contextRootResolver';

type ActionStatus = 'success' | 'error';

export interface MCPActionLogEntry {
  timestamp: string;
  tool: string;
  action: string;
  status: ActionStatus;
  details?: Record<string, unknown>;
  error?: string;
}

const SENSITIVE_KEYS = new Set([
  'apiKey',
  'token',
  'secret',
  'password',
  'authorization',
  'prompt',
  'content',
  'messages',
  'semanticContext',
]);

const MAX_DEPTH = 4;
const MAX_ARRAY = 20;
const MAX_STRING = 200;

async function resolveContextPath(repoPath: string): Promise<string> {
  const resolution = await resolveContextRoot({
    startPath: repoPath,
    validate: false,
  });
  return resolution.contextPath;
}

function sanitizeValue(value: unknown, depth: number = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth >= MAX_DEPTH) return '[truncated]';

  if (typeof value === 'string') {
    if (value.length <= MAX_STRING) return value;
    return `${value.slice(0, MAX_STRING)}...`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const trimmed = value.slice(0, MAX_ARRAY).map((item) => sanitizeValue(item, depth + 1));
    if (value.length > MAX_ARRAY) {
      trimmed.push(`...(${value.length - MAX_ARRAY} more items)`);
    }
    return trimmed;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) {
        result[key] = '[redacted]';
      } else {
        result[key] = sanitizeValue(entryValue, depth + 1);
      }
    }
    return result;
  }

  return String(value);
}

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  return sanitizeValue(details) as Record<string, unknown>;
}

export async function logMcpAction(
  repoPath: string,
  entry: Omit<MCPActionLogEntry, 'timestamp'> & { timestamp?: string }
): Promise<void> {
  try {
    const contextPath = await resolveContextPath(repoPath);
    const contextExists = await fs.pathExists(contextPath);
    if (!contextExists) {
      return;
    }
    const logPath = path.join(contextPath, 'workflow', 'actions.jsonl');

    const payload: MCPActionLogEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      tool: entry.tool,
      action: entry.action,
      status: entry.status,
      ...(entry.details ? { details: sanitizeDetails(entry.details) } : {}),
      ...(entry.error ? { error: entry.error } : {}),
    };

    await fs.ensureDir(path.dirname(logPath));
    await fs.appendFile(logPath, `${JSON.stringify(payload)}\n`, 'utf-8');
  } catch {
    // Logging should never block tool execution.
  }
}
