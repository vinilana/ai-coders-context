import {
  BaseRequestSchema,
  RequestSchema,
  ToolCallRequestSchema,
  ContextBuildRequestSchema,
  createSuccessResponse,
  createErrorResponse,
  createProgressNotification,
  createToolCallNotification,
  createToolResultNotification,
  ErrorCodes
} from './protocol';

describe('Protocol Types', () => {
  describe('BaseRequestSchema', () => {
    it('should validate a valid base request', () => {
      const request = {
        id: 'test-123',
        method: 'test.method',
        params: { key: 'value' }
      };

      const result = BaseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-123');
        expect(result.data.method).toBe('test.method');
      }
    });

    it('should validate a request without params', () => {
      const request = {
        id: 'test-123',
        method: 'capabilities'
      };

      const result = BaseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject a request without id', () => {
      const request = {
        method: 'test.method'
      };

      const result = BaseRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject a request without method', () => {
      const request = {
        id: 'test-123'
      };

      const result = BaseRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('ToolCallRequestSchema', () => {
    it('should validate a valid tool call request', () => {
      const request = {
        id: 'req-1',
        method: 'tool.call',
        params: {
          tool: 'readFile',
          args: { filePath: '/test/file.ts' }
        }
      };

      const result = ToolCallRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject a tool call without tool name', () => {
      const request = {
        id: 'req-1',
        method: 'tool.call',
        params: {
          args: { filePath: '/test/file.ts' }
        }
      };

      const result = ToolCallRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('ContextBuildRequestSchema', () => {
    it('should validate a context build request with defaults', () => {
      const request = {
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: '/path/to/repo'
        }
      };

      const result = ContextBuildRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params.contextType).toBe('compact');
      }
    });

    it('should validate a context build request with all options', () => {
      const request = {
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: '/path/to/repo',
          contextType: 'documentation',
          targetFile: 'src/index.ts',
          options: {
            useLSP: true,
            maxContextLength: 16000
          }
        }
      };

      const result = ContextBuildRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('RequestSchema (discriminated union)', () => {
    it('should parse capabilities request', () => {
      const request = {
        id: 'req-1',
        method: 'capabilities'
      };

      const result = RequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should parse tool.list request', () => {
      const request = {
        id: 'req-1',
        method: 'tool.list'
      };

      const result = RequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject unknown method', () => {
      const request = {
        id: 'req-1',
        method: 'unknown.method'
      };

      const result = RequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

describe('Response Helpers', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response', () => {
      const response = createSuccessResponse('req-1', { data: 'test' });

      expect(response).toEqual({
        id: 'req-1',
        success: true,
        result: { data: 'test' }
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const response = createErrorResponse(
        'req-1',
        ErrorCodes.TOOL_NOT_FOUND,
        'Tool not found: unknown'
      );

      expect(response).toEqual({
        id: 'req-1',
        success: false,
        error: {
          code: ErrorCodes.TOOL_NOT_FOUND,
          message: 'Tool not found: unknown'
        }
      });
    });

    it('should include details when provided', () => {
      const response = createErrorResponse(
        'req-1',
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { field: 'name' }
      );

      expect(response.error.details).toEqual({ field: 'name' });
    });
  });
});

describe('Notification Helpers', () => {
  describe('createProgressNotification', () => {
    it('should create a progress notification', () => {
      const notification = createProgressNotification(1, 'Processing...');

      expect(notification).toEqual({
        type: 'progress',
        data: {
          step: 1,
          message: 'Processing...',
          totalSteps: undefined
        }
      });
    });

    it('should include totalSteps when provided', () => {
      const notification = createProgressNotification(2, 'Step 2 of 5', 5);

      expect(notification.data.totalSteps).toBe(5);
    });
  });

  describe('createToolCallNotification', () => {
    it('should create a tool call notification', () => {
      const notification = createToolCallNotification('readFile', { path: '/test.ts' });

      expect(notification).toEqual({
        type: 'tool_call',
        data: {
          toolName: 'readFile',
          args: { path: '/test.ts' }
        }
      });
    });
  });

  describe('createToolResultNotification', () => {
    it('should create a tool result notification', () => {
      const notification = createToolResultNotification('readFile', true, '1024 bytes');

      expect(notification).toEqual({
        type: 'tool_result',
        data: {
          toolName: 'readFile',
          success: true,
          summary: '1024 bytes'
        }
      });
    });
  });
});
