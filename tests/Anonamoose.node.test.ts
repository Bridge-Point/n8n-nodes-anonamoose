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
    getNodeParameter: vi.fn().mockImplementation((name: string) => {
      if (name === 'options') return params.options ?? {};
      return params[name] ?? '';
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
      expect(node.description.group).toEqual(['transform']);
      expect(node.description.icon).toBe('file:anonamoose.svg');
    });

    it('should require anonamooseApi credentials', () => {
      expect(node.description.credentials).toEqual([
        { name: 'anonamooseApi', required: true },
      ]);
    });

    it('should have text and options properties', () => {
      const names = node.description.properties.map(p => p.name);
      expect(names).toContain('text');
      expect(names).toContain('options');
    });

    it('should define locale option with AU/NZ/UK/US values', () => {
      const optionsProp = node.description.properties.find(p => p.name === 'options');
      const localeOption = (optionsProp as any).options.find((o: any) => o.name === 'locale');
      expect(localeOption).toBeDefined();
      const values = localeOption.options.map((o: any) => o.value);
      expect(values).toContain('AU');
      expect(values).toContain('NZ');
      expect(values).toContain('UK');
      expect(values).toContain('US');
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
        params: { text: 'My name is Sarah', options: {} },
      });

      const result = await node.execute.call(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
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
        params: { text: 'call 04 1234 5678', options: { locale: 'AU' } },
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
        params: { text: 'test', options: { locale: '' } },
      });

      await node.execute.call(ctx);

      expect(mockHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { text: 'test' },
        }),
      );
    });
  });

  describe('base URL handling', () => {
    it('should strip trailing slashes from base URL', async () => {
      mockHttpRequest.mockResolvedValueOnce({ redactedText: 'ok', sessionId: 'x', detections: [] });

      const ctx = createMockContext({
        params: { text: 'test', options: {} },
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

  describe('multi-item processing', () => {
    it('should process multiple input items', async () => {
      mockHttpRequest
        .mockResolvedValueOnce({ redactedText: 'first', sessionId: '1', detections: [] })
        .mockResolvedValueOnce({ redactedText: 'second', sessionId: '2', detections: [] });

      const ctx = createMockContext({
        params: { text: 'test', options: {} },
        items: [{ json: {} }, { json: {} }],
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toHaveProperty('redactedText', 'first');
      expect(result[0][1].json).toHaveProperty('redactedText', 'second');
      expect(mockHttpRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should throw on API error when continueOnFail is false', async () => {
      mockHttpRequest.mockRejectedValueOnce(new Error('Connection refused'));

      const ctx = createMockContext({
        params: { text: 'test', options: {} },
        continueOnFail: false,
      });

      await expect(node.execute.call(ctx)).rejects.toThrow('Connection refused');
    });

    it('should return error json when continueOnFail is true', async () => {
      mockHttpRequest.mockRejectedValueOnce(new Error('Server error'));

      const ctx = createMockContext({
        params: { text: 'test', options: {} },
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toHaveProperty('error', 'Server error');
    });

    it('should continue processing after error with continueOnFail', async () => {
      mockHttpRequest
        .mockRejectedValueOnce(new Error('Item 1 failed'))
        .mockResolvedValueOnce({ redactedText: 'item 2 ok', sessionId: '2', detections: [] });

      const ctx = createMockContext({
        params: { text: 'test', options: {} },
        items: [{ json: {} }, { json: {} }],
        continueOnFail: true,
      });

      const result = await node.execute.call(ctx);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toHaveProperty('error');
      expect(result[0][1].json).toHaveProperty('redactedText', 'item 2 ok');
    });
  });
});
