export interface AppConfig {
  botToken: string;
  tonApiBaseUrl: string;
  tonApiKey: string | null;
  coinGeckoBaseUrl: string;
  cacheTtlSeconds: number;
  storagePath: string;
}

const DEFAULT_TONAPI_BASE_URL = 'https://tonapi.io';
const DEFAULT_COINGECKO_BASE_URL = 'https://api.coingecko.com';
const DEFAULT_CACHE_TTL_SECONDS = 60;
const DEFAULT_STORAGE_PATH = './data/chats.json';

function readText(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function readPositiveInteger(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const text = readText(env, name);
  if (text === null) {
    return fallback;
  }
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const botToken = readText(env, 'BOT_TOKEN');
  if (botToken === null) {
    throw new Error('BOT_TOKEN environment variable is required');
  }
  return {
    botToken,
    tonApiBaseUrl: stripTrailingSlashes(readText(env, 'TONAPI_BASE_URL') ?? DEFAULT_TONAPI_BASE_URL),
    tonApiKey: readText(env, 'TONAPI_KEY'),
    coinGeckoBaseUrl: stripTrailingSlashes(
      readText(env, 'COINGECKO_BASE_URL') ?? DEFAULT_COINGECKO_BASE_URL,
    ),
    cacheTtlSeconds: readPositiveInteger(env, 'CACHE_TTL_SECONDS', DEFAULT_CACHE_TTL_SECONDS),
    storagePath: readText(env, 'STORAGE_PATH') ?? DEFAULT_STORAGE_PATH,
  };
}
