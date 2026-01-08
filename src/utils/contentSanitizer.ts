/**
 * Content sanitizer utility for stripping AI reasoning/thinking from responses.
 *
 * AI models (especially Gemini) often include their reasoning process in outputs:
 * - "I will first read...", "Let me analyze...", "I need to..."
 * - Numbered planning steps
 * - Analysis headers like "### Reading file.ts"
 *
 * This utility strips these patterns while preserving actual content.
 */

export interface SanitizeOptions {
  /** Preserve YAML front matter at the start (default: true) */
  preserveFrontMatter?: boolean;
  /** Preserve HTML/Markdown comments (default: true) */
  preserveComments?: boolean;
  /** Maximum lines to scan for reasoning prefix (default: 100) */
  maxScanLines?: number;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  preserveFrontMatter: true,
  preserveComments: true,
  maxScanLines: 100,
};

/**
 * Patterns that indicate AI reasoning/thinking content.
 * These match full lines that should be removed.
 */
const REASONING_LINE_PATTERNS = [
  // Declarative statements about what the AI will do
  /^(?:I will|I'll|Let me|I need to|I'm going to|I should|I want to|I have to)\s+.+$/i,
  // First/Now/Next planning statements
  /^(?:First,?\s+I|Now,?\s+I|Next,?\s+I|Then,?\s+I|After that,?\s+I|Finally,?\s+I)\s+.+$/i,
  // Self-correction patterns
  /^(?:Wait,?\s+|Actually,?\s+|Hmm,?\s+|Oh,?\s+|Ah,?\s+).+$/i,
  // Analysis headers (### Reading..., ### Analyzing...)
  /^#{1,4}\s*(?:\d+\.\s*)?(?:Reading|Analyzing|Understanding|Looking at|Checking|Examining|Reviewing|Processing|Parsing|Scanning)\s+.+$/i,
  // Thought process markers
  /^(?:\*\*?)?(?:Thinking|Thought|Analysis|Reasoning|Planning)(?:\*\*?)?:?\s*.*/i,
  // "Let's" statements
  /^Let's\s+(?:start|begin|look|check|analyze|read|examine|review|see|first|now).+$/i,
];

/**
 * Patterns for numbered/bulleted planning steps at document start.
 * These are multiline patterns that match planning lists.
 */
const PLANNING_STEP_PATTERN = /^(?:\d+\.|[-*])\s+(?:Read|Analyze|Check|Look|Find|Get|Fetch|Examine|Review|Understand|Determine|Parse|Process|Scan|Search|Identify|Generate|Create|Write|Update)\s+.+$/i;

/**
 * Markers that indicate the start of actual content (not reasoning).
 */
const CONTENT_START_PATTERNS = [
  /^---\s*$/,                           // YAML front matter start
  /^#\s+[A-Z][A-Za-z0-9\s:,\-_]+$/,    // Main title (e.g., "# Project Overview")
  /^```/,                               // Code block start
  /^<!--/,                              // HTML comment (often agent markers)
  /^>\s+/,                              // Blockquote
  /^\|/,                                // Table row
  /^!\[/,                               // Image
  /^\[/,                                // Link at start of line
];

/**
 * Check if a line looks like AI reasoning.
 */
function isReasoningLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  return REASONING_LINE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if a line looks like a planning step (numbered or bulleted).
 */
function isPlanningStep(line: string): boolean {
  return PLANNING_STEP_PATTERN.test(line.trim());
}

/**
 * Check if a line indicates the start of actual content.
 */
function isContentStart(line: string): boolean {
  return CONTENT_START_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Extract YAML front matter from content if present.
 * Returns [frontMatter, remainingContent] or [null, content] if no front matter.
 */
function extractFrontMatter(content: string): [string | null, string] {
  if (!content.startsWith('---')) {
    return [null, content];
  }

  const lines = content.split('\n');
  let endIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return [null, content];
  }

  const frontMatter = lines.slice(0, endIndex + 1).join('\n');
  const remaining = lines.slice(endIndex + 1).join('\n');

  return [frontMatter, remaining];
}

/**
 * Check if we're inside a code block.
 */
function isInsideCodeBlock(lines: string[], currentIndex: number): boolean {
  let codeBlockCount = 0;

  for (let i = 0; i < currentIndex; i++) {
    if (lines[i].trim().startsWith('```')) {
      codeBlockCount++;
    }
  }

  // Odd count means we're inside a code block
  return codeBlockCount % 2 === 1;
}

/**
 * Find where the actual content starts (after reasoning prefix).
 */
function findContentStart(lines: string[], maxScanLines: number): number {
  let consecutiveEmptyOrReasoning = 0;
  let lastReasoningEnd = -1;

  for (let i = 0; i < Math.min(lines.length, maxScanLines); i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip if inside code block
    if (isInsideCodeBlock(lines, i)) {
      // If we hit a code block early, it's likely actual content
      if (lastReasoningEnd === -1) {
        return 0;
      }
      break;
    }

    // Empty line
    if (!trimmed) {
      consecutiveEmptyOrReasoning++;
      continue;
    }

    // Check if this looks like content start
    if (isContentStart(line)) {
      // If we haven't seen any reasoning yet, start from beginning
      if (lastReasoningEnd === -1) {
        return 0;
      }
      return i;
    }

    // Check if this is reasoning
    if (isReasoningLine(line) || isPlanningStep(line)) {
      lastReasoningEnd = i;
      consecutiveEmptyOrReasoning++;
      continue;
    }

    // This line doesn't look like reasoning
    // If we haven't seen any reasoning, content starts at beginning
    if (lastReasoningEnd === -1) {
      return 0;
    }

    // We've seen reasoning before, and this isn't reasoning
    // Check if there was a gap (empty lines) between reasoning and this
    if (consecutiveEmptyOrReasoning > 0) {
      return i;
    }

    // No clear break, but line doesn't match reasoning patterns
    // Be conservative and treat as content
    return i;
  }

  // If we scanned everything and it's all reasoning, return length
  // (which means empty content after sanitization)
  if (lastReasoningEnd !== -1) {
    return lastReasoningEnd + 1;
  }

  return 0;
}

/**
 * Sanitize AI response by removing reasoning/thinking prefix.
 *
 * @param content - The raw AI response text
 * @param options - Sanitization options
 * @returns Sanitized content with reasoning stripped
 */
export function sanitizeAIResponse(content: string, options?: SanitizeOptions): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = content;
  let frontMatter: string | null = null;

  // Extract and preserve front matter if enabled
  if (opts.preserveFrontMatter) {
    [frontMatter, result] = extractFrontMatter(result);
  }

  // Split into lines for analysis
  const lines = result.split('\n');

  // Find where actual content starts
  const contentStartIndex = findContentStart(lines, opts.maxScanLines);

  // Extract content from that point
  result = lines.slice(contentStartIndex).join('\n').trim();

  // Restore front matter if we had it
  if (frontMatter) {
    result = frontMatter + '\n' + result;
  }

  return result;
}

/**
 * Check if content has a reasoning prefix that would be stripped.
 *
 * @param content - The content to check
 * @returns True if the content starts with AI reasoning patterns
 */
export function hasReasoningPrefix(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const lines = content.split('\n');

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (isReasoningLine(trimmed) || isPlanningStep(trimmed)) {
      return true;
    }

    // If first non-empty line isn't reasoning, no prefix
    return false;
  }

  return false;
}

/**
 * Extract just the final content, stripping all reasoning.
 * This is a stricter version that looks for clear content markers.
 *
 * @param content - The raw AI response
 * @returns The extracted final content
 */
export function extractFinalContent(content: string): string {
  return sanitizeAIResponse(content, {
    preserveFrontMatter: true,
    preserveComments: true,
    maxScanLines: 150,
  });
}
