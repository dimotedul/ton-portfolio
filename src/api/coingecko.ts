import type { CoinGeckoSimplePriceResponse } from '../types/api';
import type { TonPrice } from '../types/domain';
import { InvalidResponseError } from './errors';
import { requestJson, type RequestDependencies } from './request';

export interface CoinGeckoClientConfig {
  baseUrl: string;
}

export interface CoinGeckoClient {
  getTonPrice(): Promise<TonPrice>;
}

export function createCoinGeckoClient(
  config: CoinGeckoClientConfig,
  dependencies: RequestDependencies = {},
): CoinGeckoClient {
  return {
    async getTonPrice() {
      const response = await requestJson<CoinGeckoSimplePriceResponse>({
        ...dependencies,
        baseUrl: config.baseUrl,
        path: '/api/v3/simple/price',
        query: {
          ids: 'the-open-network',
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
        headers: { Accept: 'application/json' },
      });
      const entry = response['the-open-network'];
      if (entry === undefined || typeof entry.usd !== 'number') {
        throw new InvalidResponseError();
      }
      return {
        usd: entry.usd,
        change24hPercent: typeof entry.usd_24h_change === 'number' ? entry.usd_24h_change : null,
      };
    },
  };
}
