import type {
  TonApiAccount,
  TonApiEvent,
  TonApiEventsResponse,
  TonApiJettonBalance,
  TonApiJettonBalancesResponse,
  TonApiRate,
  TonApiRatesResponse,
} from '../types/api';
import { requestJson, type RequestDependencies } from './request';

export interface TonApiClientConfig {
  baseUrl: string;
  apiKey: string | null;
}

export interface TonApiClient {
  getAccount(address: string): Promise<TonApiAccount>;
  getJettonBalances(address: string): Promise<TonApiJettonBalance[]>;
  getEvents(address: string, limit: number): Promise<TonApiEvent[]>;
  getJettonRates(tokenAddresses: readonly string[]): Promise<Record<string, TonApiRate>>;
}

const RATES_CHUNK_SIZE = 100;

function splitIntoChunks<T>(items: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    chunks.push(items.slice(start, start + chunkSize));
  }
  return chunks;
}

export function createTonApiClient(
  config: TonApiClientConfig,
  dependencies: RequestDependencies = {},
): TonApiClient {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (config.apiKey !== null) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  function get<T>(path: string, query?: Record<string, string | number>): Promise<T> {
    return requestJson<T>({ ...dependencies, baseUrl: config.baseUrl, path, headers, query });
  }

  return {
    getAccount(address) {
      return get<TonApiAccount>(`/v2/accounts/${encodeURIComponent(address)}`);
    },

    async getJettonBalances(address) {
      const response = await get<TonApiJettonBalancesResponse>(
        `/v2/accounts/${encodeURIComponent(address)}/jettons`,
      );
      return response.balances;
    },

    async getEvents(address, limit) {
      const response = await get<TonApiEventsResponse>(
        `/v2/accounts/${encodeURIComponent(address)}/events`,
        { limit },
      );
      return response.events;
    },

    async getJettonRates(tokenAddresses) {
      const merged: Record<string, TonApiRate> = {};
      for (const chunk of splitIntoChunks(tokenAddresses, RATES_CHUNK_SIZE)) {
        const response = await get<TonApiRatesResponse>('/v2/rates', {
          tokens: chunk.join(','),
          currencies: 'usd',
        });
        Object.assign(merged, response.rates);
      }
      return merged;
    },
  };
}
