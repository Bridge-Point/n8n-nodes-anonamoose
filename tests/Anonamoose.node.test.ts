import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Anonamoose } from '../nodes/Anonamoose/Anonamoose.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

const mockHttpRequest = vi.fn();

function createMockContext(overrides: {
  params?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  items?: INodeExecutionData[];
  continueOnFail?: boolean;
}): IExecuteFunctions {
  const {
    params = {},
    credentials = { baseUrl: 'http://localhost:3000', apiToken: 'test-token' },
    items = [{ json: {} }],
    continueOnFail = false,
  } = overrides;

  return {
    getInputData: () => items,
    getCredentials: vi.fn().mockResolvedValue(credentials),
    getNodeParameter: vi.fn().mockImplementation((name: string, _i: number, fallback?: unknown) => {
      if (name in params) return params[name];
      if (fallback !== undefined) return fallback;
      return '';
    }),
    getNode: () => ({ name: 'Anonamoose', type: 'anonamoose', typeVersion: 1, position: [0, 0] }),
    helpers: { httpRequest: mockHttpRequest } as any,
    continueOnFail: () => continueOnFail,
  } as unknown as IExecuteFunctions;
}

describe('Anonamoose Node', () => {
  const node = new Anonamoose();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('description', () => {
    it('should have correct metadata', () => {
      expect(node.description.displayName).toBe('Anonamoose');
      expect(node.description.name).toBe('anonamoose');
      expect(node.description.version).toBe(1);
    });

    it('should define all operations', () => {
      const opProp = node.description.properties.find(p => p.name === 'operation');
      const values = (opProp as any).options.map((o: any) => o.value);
      expect(values).toEqual(['redact', 'rehydrate', 'dictionaryAdd', 'dictionaryDelete']);
    });

    it('should have locale as a top-level property', () => {
      const localeProp = node.description.properties.find(p => p.name === 'locale');
      expect(localeProp).toBeDefined();
      expect(localeProp!.type).toBe('options');
      const values = (localeProp as any).options.map((o: any) => o.value);
      expect(values).toContain('AU');
      expect(values).toContain('NZ');
      expect(values).toContain('UK');
      expect(values).toContain('US');
    });

    it('should show sessionId only for rehydrate', () => {
      const sessionProp = node.description.properties.find(p => p.name === 'sessionId');
      expect(sessionProp!.displayOptions!.show!.operation).toEqual(['rehydrate']);
    });

    it('should show locale only for redact', () => {
      const localeProp = node.description.properties.find(p => p.name === 'locale');
      expect(localeProp!.displayOptions!.show!.operation).toEqual(['redact']);
    });
  });

  describe('redact', () => {
    it('should POST /api/v1/redact with text', async () => {
      const responseData = {
        redactedText: 'My name is [REDACTED]',
        sessionId: 'abc-123',
        detections: [{ type: 'ner', category: 'PERSON', confidence: 0.95 }],
      };
      mockHttpRequest.mockResolvedValueOnce(responseData);

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'My name is Sarah', locale: '' },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual(responseData);

      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/redact',
        body: { text: 'My name is Sarah' },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        json: true,
      });
    });

    it('should include locale when specified', async () => {
      mockHttpRequest.mockResolvedValueOnce({ redactedText: 'ok', sessionId: 'x', detections: [] });

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'call 04 1234 5678', locale: 'AU' },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { text: 'call 04 1234 5678', locale: 'AU' },
        }),
      );
    });

    it('should not include locale when empty', async () => {
      mockHttpRequest.mockResolvedValueOnce({ redactedText: 'ok', sessionId: 'x', detections: [] });

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'test', locale: '' },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { text: 'test' },
        }),
      );
    });
  });

  describe('rehydrate', () => {
    it('should POST /api/v1/sessions/:id/hydrate', async () => {
      mockHttpRequest.mockResolvedValueOnce({ text: 'My name is Sarah' });

      const ctx = createMockContext({
        params: { operation: 'rehydrate', text: 'My name is [REDACTED]', sessionId: 'abc-123' },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual({ text: 'My name is Sarah' });

      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/sessions/abc-123/hydrate',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: { text: 'My name is [REDACTED]' },
        json: true,
      });
    });

    it('should URL-encode session IDs with special characters', async () => {
      mockHttpRequest.mockResolvedValueOnce({ text: 'ok' });

      const ctx = createMockContext({
        params: { operation: 'rehydrate', text: 'test', sessionId: 'id/with spaces' },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/v1/sessions/id%2Fwith%20spaces/hydrate',
        }),
      );
    });
  });

  describe('dictionaryAdd', () => {
    it('should POST /api/v1/dictionary with entries', async () => {
      mockHttpRequest.mockResolvedValueOnce({ success: true, count: 2 });

      const ctx = createMockContext({
        params: { operation: 'dictionaryAdd', terms: 'Alice\nBob', caseSensitive: true, wholeWord: false },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual({ success: true, count: 2 });

      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/dictionary',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: {
          entries: [
            { term: 'Alice', caseSensitive: true, wholeWord: false },
            { term: 'Bob', caseSensitive: true, wholeWord: false },
          ],
        },
        json: true,
      });
    });

    it('should filter blank lines and trim terms', async () => {
      mockHttpRequest.mockResolvedValueOnce({ success: true, count: 1 });

      const ctx = createMockContext({
        params: { operation: 'dictionaryAdd', terms: '\n  Foo  \n\n' },
      });

      await node.execute.call(ctx);

      const body = mockHttpRequest.mock.calls[0][0].body;
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].term).toBe('Foo');
    });
  });

  describe('dictionaryDelete', () => {
    it('should DELETE /api/v1/dictionary/by-terms with terms', async () => {
      mockHttpRequest.mockResolvedValueOnce({ success: true, deleted: 2 });

      const ctx = createMockContext({
        params: { operation: 'dictionaryDelete', deleteTerms: 'Alice\nCharlie' },
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toEqual({ success: true, deleted: 2 });

      expect(mockHttpRequest).toHaveBeenCalledTimes(1);
      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: 'http://localhost:3000/api/v1/dictionary/by-terms',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: { terms: ['Alice', 'Charlie'] },
        json: true,
      });
    });

    it('should filter blank lines and trim terms', async () => {
      mockHttpRequest.mockResolvedValueOnce({ success: true, deleted: 1 });

      const ctx = createMockContext({
        params: { operation: 'dictionaryDelete', deleteTerms: '\n  Alice  \n\n' },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { terms: ['Alice'] },
        }),
      );
    });
  });

  describe('base URL handling', () => {
    it('should strip trailing slashes from base URL', async () => {
      mockHttpRequest.mockResolvedValueOnce({ redactedText: 'ok', sessionId: 'x', detections: [] });

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'test', locale: '' },
        credentials: { baseUrl: 'http://localhost:3000///', apiToken: 'tok' },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/v1/redact',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should throw on API error when continueOnFail is false', async () => {
      mockHttpRequest.mockRejectedValueOnce(new Error('Connection refused'));

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'test', locale: '' },
        continueOnFail: false,
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Connection refused');
    });

    it('should return error json when continueOnFail is true', async () => {
      mockHttpRequest.mockRejectedValueOnce(new Error('Server error'));

      const ctx = createMockContext({
        params: { operation: 'redact', text: 'test', locale: '' },
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0][0].json).toHaveProperty('error', 'Server error');
    });
  });
});
