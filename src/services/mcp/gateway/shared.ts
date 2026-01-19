/**
 * Shared Utilities for Gateway Handlers
 *
 * Common utilities used across multiple gateway handlers.
 */

/**
 * Minimal UI interface for services that require UI dependencies.
 * Returns no-op functions for all UI operations since MCP handlers
 * return structured data instead of displaying output.
 */
export const minimalUI = {
  displayOutput: () => {},
  displaySuccess: () => {},
  displayError: () => {},
  displayInfo: () => {},
  displayWarning: () => {},
  displayWelcome: () => {},
  displayPrevcExplanation: () => {},
  displayStep: () => {},
  displayBox: () => {},
  startSpinner: () => {},
  stopSpinner: () => {},
  updateSpinner: () => {},
  prompt: async () => '',
  confirm: async () => true,
};

/**
 * Mock translation function for services that require i18n.
 */
export const mockTranslate = (key: string) => key;

/**
 * Tool execution context for AI tools.
 */
export const toolContext = { toolCallId: '', messages: [] };
