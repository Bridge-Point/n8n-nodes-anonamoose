import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Anonamoose } from '../nodes/Anonamoose/Anonamoose.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

// ── Mock helpers ────────────────────────────────────────────────────

const mockRequest = vi.fn();

const mockNode = { name: 'Anonamoose', type: 'anonamoose', typeVersion: 1, position: [0, 0] };

function createMockExecuteFunctions(overrides: {
  operation: string;
  params?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  items?: INodeExecutionData[];
  continueOnFail?: boolean;
}): IExecuteFunctions {
  const {
    operation,
    params = {},
    credentials = { baseUrl: 'http://localhost:3001', apiToken: 'test-token' },
    items = [{ json: {} }],
    continueOnFail = false,
  } = overrides;

  return {
    getInputData: () => items,
    getCredentials: vi.fn().mockResolvedValue(credentials),
    getNodeParameter: vi.fn().mockImplementation((name: string) => {
      if (name === 'operation') return operation;
      return params[name] ?? '';
    }),
    getNode: () => mockNode,
    helpers: { request: mockRequest } as any,
    continueOnFail: () => continueOnFail,
  } as unknown as IExecuteFunctions;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Anonamoose Node', () => {
  const node = new Anonamoose();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Description ──────────────────────────────────────────────────

  describe('description', () => {
    it('should have correct metadata', () => {
      expect(node.description.displayName).toBe('Anonamoose');
      expect(node.description.name).toBe('anonamoose');
      expect(node.description.version).toBe(1);
      expect(node.description.group).toEqual(['transform']);
      expect(node.description.icon).toBe('file:anonamoose.svg');
    });

    it('should require anonamooseApi credentials', () => {
      expect(node.description.credentials).toEqual([
        { name: 'anonamooseApi', required: true },
      ]);
    });

    it('should have single main input and output', () => {
      expect(node.description.inputs).toEqual(['main']);
      expect(node.description.outputs).toEqual(['main']);
    });

    it('should define all 6 operations', () => {
      const operationProp = node.description.properties.find(p => p.name === 'operation');
      expect(operationProp).toBeDefined();
      expect(operationProp!.type).toBe('options');
      expect(operationProp!.noDataExpression).toBe(true);

      const options = (operationProp as any).options;
      const values = options.map((o: any) => o.value);
      expect(values).toEqual(['redact', 'hydrate', 'dictionaryAdd', 'dictionaryList', 'proxy', 'stats']);
    });

    it('should have action labels on all operations', () => {
      const operationProp = node.description.properties.find(p => p.name === 'operation');
      const options = (operationProp as any).options;
      for (const opt of options) {
        expect(opt.action).toBeDefined();
        expect(opt.action.length).toBeGreaterThan(0);
      }
    });

    it('should show text field for redact and hydrate only', () => {
      const textProp = node.description.properties.find(p => p.name === 'text');
      expect(textProp!.displayOptions!.show!.operation).toEqual(['redact', 'hydrate']);
    });

    it('should show sessionId field for hydrate only', () => {
      const sessionProp = node.description.properties.find(p => p.name === 'sessionId');
      expect(sessionProp!.displayOptions!.show!.operation).toEqual(['hydrate']);
    });

    it('should show dictionary fields for dictionaryAdd only', () => {
      const termsProp = node.description.properties.find(p => p.name === 'terms');
      const caseProp = node.description.properties.find(p => p.name === 'caseSensitive');
      const wholeProp = node.description.properties.find(p => p.name === 'wholeWord');
      expect(termsProp!.displayOptions!.show!.operation).toEqual(['dictionaryAdd']);
      expect(caseProp!.displayOptions!.show!.operation).toEqual(['dictionaryAdd']);
      expect(wholeProp!.displayOptions!.show!.operation).toEqual(['dictionaryAdd']);
    });

    it('should show requestBody for proxy only', () => {
      const bodyProp = node.description.properties.find(p => p.name === 'requestBody');
      expect(bodyProp!.displayOptions!.show!.operation).toEqual(['proxy']);
      expect(bodyProp!.type).toBe('json');
    });

    it('should have subtitle showing current operation', () => {
      expect(node.description.subtitle).toBe('={{ $parameter["operation"] }}');
    });

    it('should mark text, sessionId, and terms as required', () => {
      const textProp = node.description.properties.find(p => p.name === 'text');
      const sessionProp = node.description.properties.find(p => p.name === 'sessionId');
      const termsProp = node.description.properties.find(p => p.name === 'terms');
      expect((textProp as any).required).toBe(true);
      expect((sessionProp as any).required).toBe(true);
      expect((termsProp as any).required).toBe(true);
    });
  });

  // ── Redact ───────────────────────────────────────────────────────

  describe('redact operation', () => {
    it('should call POST /api/v1/redact with text', async () => {
      const responseData = {
        redacted: 'My name is [REDACTED]',
        sessionId: 'abc-123',
        detections: [{ type: 'ner', category: 'PERSON', original: 'Sarah' }],
      };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: 'My name is Sarah' },
      });

      const result = await node.execute.call(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3001/api/v1/redact',
        body: { text: 'My name is Sarah' },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        json: true,
      });
    });

    it('should reject empty text', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: '' },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Text parameter cannot be empty');
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  // ── Hydrate ──────────────────────────────────────────────────────

  describe('hydrate operation', () => {
    it('should call POST /api/v1/sessions/:id/hydrate', async () => {
      const responseData = { text: 'My name is Sarah' };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({
        operation: 'hydrate',
        params: { text: 'My name is [REDACTED]', sessionId: 'abc-123' },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3001/api/v1/sessions/abc-123/hydrate',
        body: { text: 'My name is [REDACTED]' },
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
        json: true,
      });
    });

    it('should URL-encode session IDs with special characters', async () => {
      mockRequest.mockResolvedValueOnce({ text: 'ok' });

      const ctx = createMockExecuteFunctions({
        operation: 'hydrate',
        params: { text: 'test', sessionId: 'id/with spaces&chars' },
      });

      await node.execute.call(ctx);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/v1/sessions/id%2Fwith%20spaces%26chars/hydrate',
        }),
      );
    });

    it('should reject empty text', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'hydrate',
        params: { text: '', sessionId: 'abc-123' },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Text parameter cannot be empty');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('should reject empty sessionId', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'hydrate',
        params: { text: 'some text', sessionId: '' },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Session ID cannot be empty');
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  // ── Dictionary Add ───────────────────────────────────────────────

  describe('dictionaryAdd operation', () => {
    it('should split terms by newline and POST to /api/v1/dictionary', async () => {
      const responseData = { added: 3 };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({
        operation: 'dictionaryAdd',
        params: {
          terms: 'Project Apollo\nJohn Smith\nACME Corp',
          caseSensitive: true,
          wholeWord: false,
        },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3001/api/v1/dictionary',
        body: {
          entries: [
            { term: 'Project Apollo', caseSensitive: true, wholeWord: false, enabled: true },
            { term: 'John Smith', caseSensitive: true, wholeWord: false, enabled: true },
            { term: 'ACME Corp', caseSensitive: true, wholeWord: false, enabled: true },
          ],
        },
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        json: true,
      });
    });

    it('should filter out blank lines from terms', async () => {
      mockRequest.mockResolvedValueOnce({ added: 1 });

      const ctx = createMockExecuteFunctions({
        operation: 'dictionaryAdd',
        params: {
          terms: '\n  \nAlice\n\n',
          caseSensitive: false,
          wholeWord: true,
        },
      });

      await node.execute.call(ctx);

      const body = mockRequest.mock.calls[0][0].body;
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].term).toBe('Alice');
      expect(body.entries[0].wholeWord).toBe(true);
    });

    it('should trim whitespace from terms', async () => {
      mockRequest.mockResolvedValueOnce({ added: 2 });

      const ctx = createMockExecuteFunctions({
        operation: 'dictionaryAdd',
        params: {
          terms: '  Foo  \n  Bar  ',
          caseSensitive: false,
          wholeWord: false,
        },
      });

      await node.execute.call(ctx);

      const entries = mockRequest.mock.calls[0][0].body.entries;
      expect(entries[0].term).toBe('Foo');
      expect(entries[1].term).toBe('Bar');
    });

    it('should reject empty terms (all blank lines)', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'dictionaryAdd',
        params: {
          terms: '\n  \n\n',
          caseSensitive: false,
          wholeWord: false,
        },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('At least one dictionary term is required');
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  // ── Dictionary List ──────────────────────────────────────────────

  describe('dictionaryList operation', () => {
    it('should call GET /api/v1/dictionary', async () => {
      const responseData = { entries: [{ term: 'Alice' }] };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({ operation: 'dictionaryList' });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'http://localhost:3001/api/v1/dictionary',
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-token' }),
        json: true,
      });
    });
  });

  // ── Stats ────────────────────────────────────────────────────────

  describe('stats operation', () => {
    it('should call GET /api/v1/stats', async () => {
      const responseData = { totalRedactions: 42, activeSessions: 3 };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({ operation: 'stats' });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'http://localhost:3001/api/v1/stats',
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-token' }),
        json: true,
      });
    });
  });

  // ── Proxy ────────────────────────────────────────────────────────

  describe('proxy operation', () => {
    it('should call POST /v1/chat/completions with redact/hydrate headers', async () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello Sarah' }],
      };
      const responseData = {
        choices: [{ message: { content: 'Hello [REDACTED]' } }],
      };
      mockRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockExecuteFunctions({
        operation: 'proxy',
        params: { requestBody },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3001/v1/chat/completions',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-anonamoose-redact': 'true',
          'x-anonamoose-hydrate': 'true',
        },
        json: true,
      });
    });

    it('should reject non-object request body (string)', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'proxy',
        params: { requestBody: 'not an object' },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Request body must be a JSON object');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('should reject null request body', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'proxy',
        params: { requestBody: null },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Request body must be a JSON object');
    });

    it('should reject array request body', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'proxy',
        params: { requestBody: [1, 2, 3] },
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Request body must be a JSON object');
    });
  });

  // ── Base URL handling ────────────────────────────────────────────

  describe('base URL handling', () => {
    it('should strip trailing slashes from base URL', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true });

      const ctx = createMockExecuteFunctions({
        operation: 'stats',
        credentials: { baseUrl: 'http://localhost:3001///', apiToken: 'tok' },
      });

      await node.execute.call(ctx);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/v1/stats',
        }),
      );
    });

    it('should fall back to default URL when baseUrl is undefined', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true });

      const ctx = createMockExecuteFunctions({
        operation: 'stats',
        credentials: { baseUrl: undefined, apiToken: 'tok' },
      });

      await node.execute.call(ctx);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/v1/stats',
        }),
      );
    });
  });

  // ── Auth handling ────────────────────────────────────────────────

  describe('auth handling', () => {
    it('should omit Authorization header when apiToken is empty', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true });

      const ctx = createMockExecuteFunctions({
        operation: 'stats',
        credentials: { baseUrl: 'http://localhost:3001', apiToken: '' },
      });

      await node.execute.call(ctx);

      const headers = mockRequest.mock.calls[0][0].headers;
      expect(headers).not.toHaveProperty('Authorization');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Authorization header when apiToken is set', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true });

      const ctx = createMockExecuteFunctions({
        operation: 'stats',
        credentials: { baseUrl: 'http://localhost:3001', apiToken: 'my-secret' },
      });

      await node.execute.call(ctx);

      const headers = mockRequest.mock.calls[0][0].headers;
      expect(headers['Authorization']).toBe('Bearer my-secret');
    });
  });

  // ── Multi-item processing ────────────────────────────────────────

  describe('multi-item processing', () => {
    it('should process multiple input items', async () => {
      mockRequest
        .mockResolvedValueOnce({ redacted: 'first' })
        .mockResolvedValueOnce({ redacted: 'second' });

      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: 'test' },
        items: [{ json: {} }, { json: {} }],
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toEqual({ redacted: 'first' });
      expect(result[0][1].json).toEqual({ redacted: 'second' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  // ── Error handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('should wrap API errors in NodeApiError when continueOnFail is false', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Connection refused'));

      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: 'test' },
        continueOnFail: false,
      });

      await expect(node.execute.call(ctx)).rejects.toThrow();
    });

    it('should throw NodeOperationError directly for validation errors', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: '' },
        continueOnFail: false,
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Text parameter cannot be empty');
    });

    it('should return error object when continueOnFail is true', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Server error'));

      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: 'test' },
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toHaveProperty('error');
    });

    it('should return validation error message when continueOnFail is true', async () => {
      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: '' },
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toHaveProperty('error');
      expect((result[0][0].json as any).error).toContain('Text parameter cannot be empty');
    });

    it('should continue processing remaining items after error with continueOnFail', async () => {
      mockRequest
        .mockRejectedValueOnce(new Error('Item 1 failed'))
        .mockResolvedValueOnce({ redacted: 'item 2 ok' });

      const ctx = createMockExecuteFunctions({
        operation: 'redact',
        params: { text: 'test' },
        items: [{ json: {} }, { json: {} }],
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toHaveProperty('error');
      expect(result[0][1].json).toEqual({ redacted: 'item 2 ok' });
    });
  });
});
