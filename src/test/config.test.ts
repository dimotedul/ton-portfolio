import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({ BOT_TOKEN: '123:abc' })).toEqual({
      botToken: '123:abc',
      tonApiBaseUrl: 'https://tonapi.io',
      tonApiKey: null,
      coinGeckoBaseUrl: 'https://api.coingecko.com',
      cacheTtlSeconds: 60,
      storagePath: './data/chats.json',
    });
  });

  it('reads overrides and strips trailing slashes', () => {
    const config = loadConfig({
      BOT_TOKEN: '123:abc',
      TONAPI_KEY: 'key',
      TONAPI_BASE_URL: 'https://proxy.test/',
      CACHE_TTL_SECONDS: '30',
    });
    expect(config).toMatchObject({
      tonApiKey: 'key',
      tonApiBaseUrl: 'https://proxy.test',
      cacheTtlSeconds: 30,
    });
  });

  it('falls back to the default for an invalid cache TTL', () => {
    expect(loadConfig({ BOT_TOKEN: 'x', CACHE_TTL_SECONDS: 'abc' }).cacheTtlSeconds).toBe(60);
  });

  it('requires the bot token', () => {
    expect(() => loadConfig({})).toThrow('BOT_TOKEN');
  });
});
