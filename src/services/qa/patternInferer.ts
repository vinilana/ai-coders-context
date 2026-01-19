/**
 * Pattern Inferer
 *
 * Infers functional patterns (auth, database, API, etc.) from codebase-map.json
 * without re-analyzing the codebase. This is an optimization that uses
 * pre-computed symbol data to detect capabilities.
 */

import type { CodebaseMap, SymbolSummary } from '../../generators/documentation/codebaseMapGenerator';
import type { DetectedFunctionalPatterns, FunctionalPattern, PatternIndicator } from '../semantic/types';

/**
 * Pattern Inferer - derives functional patterns from codebase-map.json
 */
export class PatternInferer {
  /**
   * Infer functional patterns from a pre-computed codebase map
   */
  inferFromMap(map: CodebaseMap): DetectedFunctionalPatterns {
    const patterns: FunctionalPattern[] = [];
    const allSymbols = this.getAllSymbols(map);

    // Authentication pattern detection
    const authPattern = this.detectAuthPattern(allSymbols, map);
    if (authPattern) patterns.push(authPattern);

    // Database pattern detection
    const dbPattern = this.detectDatabasePattern(allSymbols, map);
    if (dbPattern) patterns.push(dbPattern);

    // API pattern detection
    const apiPattern = this.detectApiPattern(allSymbols, map);
    if (apiPattern) patterns.push(apiPattern);

    // Cache pattern detection
    const cachePattern = this.detectCachePattern(allSymbols);
    if (cachePattern) patterns.push(cachePattern);

    // Queue/messaging pattern detection
    const queuePattern = this.detectQueuePattern(allSymbols);
    if (queuePattern) patterns.push(queuePattern);

    // WebSocket pattern detection
    const wsPattern = this.detectWebSocketPattern(allSymbols);
    if (wsPattern) patterns.push(wsPattern);

    // Logging pattern detection
    const loggingPattern = this.detectLoggingPattern(allSymbols);
    if (loggingPattern) patterns.push(loggingPattern);

    // Validation pattern detection
    const validationPattern = this.detectValidationPattern(allSymbols);
    if (validationPattern) patterns.push(validationPattern);

    // Error handling pattern detection
    const errorPattern = this.detectErrorHandlingPattern(allSymbols);
    if (errorPattern) patterns.push(errorPattern);

    // Testing pattern detection
    const testingPattern = this.detectTestingPattern(allSymbols, map);
    if (testingPattern) patterns.push(testingPattern);

    return {
      hasAuthPattern: patterns.some((p) => p.type === 'auth'),
      hasDatabasePattern: patterns.some((p) => p.type === 'database'),
      hasApiPattern: patterns.some((p) => p.type === 'api'),
      hasCachePattern: patterns.some((p) => p.type === 'cache'),
      hasQueuePattern: patterns.some((p) => p.type === 'queue'),
      hasWebSocketPattern: patterns.some((p) => p.type === 'websocket'),
      hasLoggingPattern: patterns.some((p) => p.type === 'logging'),
      hasValidationPattern: patterns.some((p) => p.type === 'validation'),
      hasErrorHandlingPattern: patterns.some((p) => p.type === 'error-handling'),
      hasTestingPattern: patterns.some((p) => p.type === 'testing'),
      patterns,
    };
  }

  /**
   * Get all symbols from the map as a flat array
   */
  private getAllSymbols(map: CodebaseMap): SymbolSummary[] {
    return [
      ...map.symbols.classes,
      ...map.symbols.interfaces,
      ...map.symbols.functions,
      ...map.symbols.types,
      ...map.symbols.enums,
    ];
  }

  /**
   * Find symbols matching any of the given patterns
   */
  private findSymbolsMatching(
    symbols: SymbolSummary[],
    patterns: RegExp[]
  ): SymbolSummary[] {
    return symbols.filter((s) =>
      patterns.some((p) => p.test(s.name) || (s.file && p.test(s.file)))
    );
  }

  /**
   * Create pattern indicators from matched symbols
   */
  private createIndicators(
    matches: SymbolSummary[],
    reasonPrefix: string
  ): PatternIndicator[] {
    return matches.slice(0, 10).map((s) => ({
      file: s.file,
      symbol: s.name,
      line: s.line,
      reason: `${reasonPrefix}: ${s.name}`,
    }));
  }

  // Pattern detection methods

  private detectAuthPattern(
    symbols: SymbolSummary[],
    map: CodebaseMap
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for auth-related symbols
    const authPatterns = [
      /^(auth|login|logout|verify|jwt|token|session|password|credential|oauth)/i,
      /Auth$/i,
      /Authentication$/i,
      /Authenticator$/i,
    ];
    const authSymbols = this.findSymbolsMatching(symbols, authPatterns);
    indicators.push(...this.createIndicators(authSymbols, 'Auth-related symbol'));

    // Check for auth-related file paths
    const authFilePaths = symbols.filter((s) =>
      /\/(auth|login|session|middleware)\//i.test(s.file)
    );
    for (const s of authFilePaths.slice(0, 5)) {
      indicators.push({
        file: s.file,
        reason: 'Auth-related file path',
      });
    }

    // Check architecture layers for auth indicators
    if (map.architecture.layers.some((l) => /auth/i.test(l.name))) {
      indicators.push({
        file: '',
        reason: 'Auth-related architecture layer detected',
      });
    }

    if (indicators.length === 0) return null;

    return {
      type: 'auth',
      confidence: Math.min(1, indicators.length * 0.15),
      indicators: indicators.slice(0, 10),
      description: 'Authentication and authorization functionality',
    };
  }

  private detectDatabasePattern(
    symbols: SymbolSummary[],
    map: CodebaseMap
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for database-related symbols
    const dbPatterns = [
      /^(repository|model|entity|schema|migration|query|database|db)/i,
      /Repository$/i,
      /Model$/i,
      /Entity$/i,
      /Schema$/i,
    ];
    const dbSymbols = this.findSymbolsMatching(symbols, dbPatterns);
    indicators.push(...this.createIndicators(dbSymbols, 'Database-related symbol'));

    // Check for database-related file paths
    const dbFilePaths = symbols.filter((s) =>
      /\/(models?|repositories|entities|migrations?|schemas?|database)\//i.test(s.file)
    );
    for (const s of dbFilePaths.slice(0, 5)) {
      indicators.push({
        file: s.file,
        reason: 'Database-related file path',
      });
    }

    // Check architecture layers for data layer
    const hasDataLayer = map.architecture.layers.some((l) =>
      /repository|model|data/i.test(l.name)
    );
    if (hasDataLayer) {
      indicators.push({
        file: '',
        reason: 'Data layer detected in architecture',
      });
    }

    if (indicators.length === 0) return null;

    return {
      type: 'database',
      confidence: Math.min(1, indicators.length * 0.15),
      indicators: indicators.slice(0, 10),
      description: 'Database access and ORM functionality',
    };
  }

  private detectApiPattern(
    symbols: SymbolSummary[],
    map: CodebaseMap
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for API-related symbols
    const apiPatterns = [
      /^(controller|handler|router|route|endpoint|api|rest|graphql|resolver)/i,
      /Controller$/i,
      /Handler$/i,
      /Router$/i,
      /Resolver$/i,
    ];
    const apiSymbols = this.findSymbolsMatching(symbols, apiPatterns);
    indicators.push(...this.createIndicators(apiSymbols, 'API-related symbol'));

    // Check for API-related file paths
    const apiFilePaths = symbols.filter((s) =>
      /\/(routes?|controllers?|handlers?|api|endpoints?|resolvers?)\//i.test(s.file)
    );
    for (const s of apiFilePaths.slice(0, 5)) {
      indicators.push({
        file: s.file,
        reason: 'API-related file path',
      });
    }

    // Check architecture layers for controller layer
    const hasControllerLayer = map.architecture.layers.some((l) =>
      /controller|handler|route/i.test(l.name)
    );
    if (hasControllerLayer) {
      indicators.push({
        file: '',
        reason: 'Controller layer detected in architecture',
      });
    }

    // Check for API frameworks in stack
    const apiFrameworks = ['express', 'fastify', 'nestjs', 'koa', 'hapi', 'graphql'];
    if (map.stack.frameworks.some((f) => apiFrameworks.includes(f.toLowerCase()))) {
      indicators.push({
        file: '',
        reason: `API framework detected: ${map.stack.frameworks.filter((f) =>
          apiFrameworks.includes(f.toLowerCase())
        ).join(', ')}`,
      });
    }

    if (indicators.length === 0) return null;

    return {
      type: 'api',
      confidence: Math.min(1, indicators.length * 0.15),
      indicators: indicators.slice(0, 10),
      description: 'API endpoints and routing',
    };
  }

  private detectCachePattern(symbols: SymbolSummary[]): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for cache-related symbols
    const cachePatterns = [/^(cache|redis|memcache|lru|ttl)/i, /Cache$/i];
    const cacheSymbols = this.findSymbolsMatching(symbols, cachePatterns);
    indicators.push(...this.createIndicators(cacheSymbols, 'Cache-related symbol'));

    if (indicators.length === 0) return null;

    return {
      type: 'cache',
      confidence: Math.min(1, indicators.length * 0.2),
      indicators: indicators.slice(0, 10),
      description: 'Caching and data memoization',
    };
  }

  private detectQueuePattern(symbols: SymbolSummary[]): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for queue-related symbols
    const queuePatterns = [
      /^(queue|worker|job|task|consumer|producer|message)/i,
      /Queue$/i,
      /Worker$/i,
      /Job$/i,
    ];
    const queueSymbols = this.findSymbolsMatching(symbols, queuePatterns);
    indicators.push(...this.createIndicators(queueSymbols, 'Queue-related symbol'));

    if (indicators.length === 0) return null;

    return {
      type: 'queue',
      confidence: Math.min(1, indicators.length * 0.2),
      indicators: indicators.slice(0, 10),
      description: 'Message queues and background jobs',
    };
  }

  private detectWebSocketPattern(
    symbols: SymbolSummary[]
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for WebSocket-related symbols
    const wsPatterns = [
      /^(websocket|socket|ws|realtime|broadcast|subscribe)/i,
      /Socket$/i,
      /WebSocket$/i,
    ];
    const wsSymbols = this.findSymbolsMatching(symbols, wsPatterns);
    indicators.push(...this.createIndicators(wsSymbols, 'WebSocket-related symbol'));

    if (indicators.length === 0) return null;

    return {
      type: 'websocket',
      confidence: Math.min(1, indicators.length * 0.2),
      indicators: indicators.slice(0, 10),
      description: 'Real-time WebSocket communication',
    };
  }

  private detectLoggingPattern(symbols: SymbolSummary[]): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for logging-related symbols
    const logPatterns = [/^(logger|log|logging|telemetry|metrics)/i, /Logger$/i];
    const logSymbols = this.findSymbolsMatching(symbols, logPatterns);
    indicators.push(...this.createIndicators(logSymbols, 'Logging-related symbol'));

    if (indicators.length === 0) return null;

    return {
      type: 'logging',
      confidence: Math.min(1, indicators.length * 0.2),
      indicators: indicators.slice(0, 10),
      description: 'Logging and observability',
    };
  }

  private detectValidationPattern(
    symbols: SymbolSummary[]
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for validation-related symbols
    const validPatterns = [
      /^(valid|schema|sanitize|parse|check|assert)/i,
      /Validator$/i,
      /Schema$/i,
    ];
    const validSymbols = this.findSymbolsMatching(symbols, validPatterns);
    indicators.push(...this.createIndicators(validSymbols, 'Validation-related symbol'));

    if (indicators.length === 0) return null;

    return {
      type: 'validation',
      confidence: Math.min(1, indicators.length * 0.2),
      indicators: indicators.slice(0, 10),
      description: 'Input validation and schema enforcement',
    };
  }

  private detectErrorHandlingPattern(
    symbols: SymbolSummary[]
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for error-related symbols
    const errorPatterns = [
      /^(error|exception|handler|catch|fallback)/i,
      /Error$/i,
      /Exception$/i,
    ];
    const errorSymbols = this.findSymbolsMatching(symbols, errorPatterns);
    indicators.push(...this.createIndicators(errorSymbols, 'Error handling symbol'));

    // Check for error-related file paths
    const errorFilePaths = symbols.filter((s) =>
      /\/(errors?|exceptions?)\//i.test(s.file)
    );
    for (const s of errorFilePaths.slice(0, 5)) {
      indicators.push({
        file: s.file,
        reason: 'Error handling file path',
      });
    }

    if (indicators.length === 0) return null;

    return {
      type: 'error-handling',
      confidence: Math.min(1, indicators.length * 0.15),
      indicators: indicators.slice(0, 10),
      description: 'Error handling and exception management',
    };
  }

  private detectTestingPattern(
    symbols: SymbolSummary[],
    map: CodebaseMap
  ): FunctionalPattern | null {
    const indicators: PatternIndicator[] = [];

    // Check for test frameworks in stack
    if (map.stack.testFrameworks.length > 0) {
      indicators.push({
        file: '',
        reason: `Test frameworks: ${map.stack.testFrameworks.join(', ')}`,
      });
    }

    // Check for test-related file paths
    const testFilePaths = symbols.filter(
      (s) =>
        /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(s.file) ||
        /\/__tests__\//.test(s.file)
    );
    for (const s of testFilePaths.slice(0, 5)) {
      indicators.push({
        file: s.file,
        reason: 'Test file',
      });
    }

    if (indicators.length === 0) return null;

    return {
      type: 'testing',
      confidence: Math.min(1, indicators.length * 0.15),
      indicators: indicators.slice(0, 10),
      description: 'Testing infrastructure and test files',
    };
  }
}
