/**
 * ServeService - Handles the passthrough server for external AI agents
 */

import {
  CommandRouter,
  createStdinReader,
  type Response,
  type Notification,
  createErrorResponse,
  ErrorCodes
} from '../passthrough';

export interface ServeOptions {
  /** Output format: json (single response) or jsonl (line-delimited) */
  format?: 'json' | 'jsonl';
  /** Default repository path */
  repoPath?: string;
  /** Enable verbose logging to stderr */
  verbose?: boolean;
}

export class ServeService {
  private options: ServeOptions;
  private router: CommandRouter;
  private isRunning = false;

  constructor(options: ServeOptions = {}) {
    this.options = {
      format: 'jsonl',
      verbose: false,
      ...options
    };

    this.router = new CommandRouter({
      defaultRepoPath: this.options.repoPath,
      onNotification: (notification) => this.sendNotification(notification)
    });
  }

  /**
   * Start the server and listen for stdin commands
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    this.isRunning = true;

    const reader = createStdinReader();

    // Log startup message to stderr (not stdout, to avoid polluting JSON output)
    this.log('Passthrough server started. Waiting for JSON commands on stdin...');
    this.log(`Format: ${this.options.format}`);
    if (this.options.repoPath) {
      this.log(`Default repo path: ${this.options.repoPath}`);
    }

    // Handle incoming requests
    reader.on('request', async (request) => {
      this.log(`Received request: ${request.method} (id: ${request.id})`);

      try {
        const response = await this.router.route(request);
        this.sendResponse(response);
      } catch (error) {
        const errorResponse = createErrorResponse(
          request.id,
          ErrorCodes.EXECUTION_ERROR,
          error instanceof Error ? error.message : String(error)
        );
        this.sendResponse(errorResponse);
      }
    });

    // Handle parse errors
    reader.on('error', (error) => {
      const errorResponse = createErrorResponse(
        'unknown',
        error.code,
        error.message,
        { line: error.line }
      );
      this.sendResponse(errorResponse);
    });

    // Handle stdin close
    reader.on('close', async () => {
      this.log('stdin closed, shutting down...');
      await this.shutdown();
    });

    // Keep the process alive
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Send a response to stdout
   */
  private sendResponse(response: Response): void {
    const json = JSON.stringify(response);
    process.stdout.write(json + '\n');
  }

  /**
   * Send a notification to stdout
   */
  private sendNotification(notification: Notification): void {
    const json = JSON.stringify(notification);
    process.stdout.write(json + '\n');
  }

  /**
   * Log a message to stderr (if verbose mode is enabled)
   */
  private log(message: string): void {
    if (this.options.verbose) {
      process.stderr.write(`[serve] ${message}\n`);
    }
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.router.shutdown();
  }
}
