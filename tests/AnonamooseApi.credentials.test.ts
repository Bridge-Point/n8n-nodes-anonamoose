import { describe, it, expect } from 'vitest';
import { AnonamooseApi } from '../credentials/AnonamooseApi.credentials';

describe('AnonamooseApi Credentials', () => {
  const creds = new AnonamooseApi();

  it('should have correct name and display name', () => {
    expect(creds.name).toBe('anonamooseApi');
    expect(creds.displayName).toBe('Anonamoose API');
  });

  it('should link to documentation', () => {
    expect(creds.documentationUrl).toBe('https://docs.anonamoose.net');
  });

  it('should define baseUrl property with default', () => {
    const baseUrl = creds.properties.find(p => p.name === 'baseUrl');
    expect(baseUrl).toBeDefined();
    expect(baseUrl!.type).toBe('string');
    expect(baseUrl!.default).toBe('http://localhost:3001');
  });

  it('should define apiToken property as password', () => {
    const apiToken = creds.properties.find(p => p.name === 'apiToken');
    expect(apiToken).toBeDefined();
    expect(apiToken!.type).toBe('string');
    expect((apiToken as any).typeOptions.password).toBe(true);
    expect(apiToken!.default).toBe('');
  });

  it('should have exactly 2 properties', () => {
    expect(creds.properties).toHaveLength(2);
  });
});
