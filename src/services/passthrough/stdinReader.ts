/**
 * StdinReader - Reads JSON commands from stdin line by line
 */

import { createInterface, Interface as ReadlineInterface } from 'readline';
import { EventEmitter } from 'events';
import { BaseRequestSchema, type BaseRequest, ErrorCodes } from './protocol';

export interface StdinReaderEvents {
  request: (request: BaseRequest) => void;
  error: (error: { code: string; message: string; line: string }) => void;
  close: () => void;
}

export class StdinReader extends EventEmitter {
  private readline: ReadlineInterface | null = null;
  private isClosed = false;

  constructor() {
    super();
  }

  /**
   * Start reading from stdin
   */
  start(): void {
    if (this.readline) {
      return;
    }

    this.readline = createInterface({
      input: process.stdin,
      output: undefined,
      terminal: false
    });

    this.readline.on('line', (line: string) => {
      this.processLine(line);
    });

    this.readline.on('close', () => {
      this.isClosed = true;
      this.emit('close');
    });

    this.readline.on('error', (err: Error) => {
      this.emit('error', {
        code: ErrorCodes.PARSE_ERROR,
        message: err.message,
        line: ''
      });
    });
  }

  /**
   * Stop reading from stdin
   */
  stop(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    this.isClosed = true;
  }

  /**
   * Check if the reader is closed
   */
  get closed(): boolean {
    return this.isClosed;
  }

  /**
   * Process a single line of input
   */
  private processLine(line: string): void {
    const trimmed = line.trim();

    // Ignore empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      return;
    }

    // Try to parse as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      this.emit('error', {
        code: ErrorCodes.PARSE_ERROR,
        message: 'Invalid JSON',
        line: trimmed
      });
      return;
    }

    // Validate against base request schema
    const validation = BaseRequestSchema.safeParse(parsed);
    if (!validation.success) {
      this.emit('error', {
        code: ErrorCodes.INVALID_REQUEST,
        message: validation.error.message,
        line: trimmed
      });
      return;
    }

    this.emit('request', validation.data);
  }

  // Type-safe event emitter methods
  override on<K extends keyof StdinReaderEvents>(
    event: K,
    listener: StdinReaderEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof StdinReaderEvents>(
    event: K,
    ...args: Parameters<StdinReaderEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

/**
 * Create and start a stdin reader
 */
export function createStdinReader(): StdinReader {
  const reader = new StdinReader();
  reader.start();
  return reader;
}
