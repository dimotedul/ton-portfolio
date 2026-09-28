import { describe, expect, it, vi } from 'vitest';
import type { CoinGeckoClient } from '../api/coingecko';
import { NotFoundError } from '../api/errors';
import type { TonApiClient } from '../api/tonapi';
import { createPortfolioService } from '../services/portfolioService';
import type { TonApiAccount } from '../types/api';
import {
  OWNER_RAW,
  SCAM_JETTON_RAW,
  USDT_RAW,
  makeAddressRef,
  makeJettonPreview,
} from './fixtures';

function createTonApi(overrides: Partial<TonApiClient> = {}): TonApiClient {
  return {
    getAccount: () =>
      Promise.resolve({ address: OWNER_RAW, balance: 2_000_000_000, status: 'active' }),
    getJettonBalances: () =>
      Promise.resolve([
        {
          balance: '100000000',
          jetton: makeJettonPreview(),
          wallet_address: makeAddressRef(OWNER_RAW),
        },
        {
          balance: '5000000',
          jetton: makeJettonPreview({
            address: SCAM_JETTON_RAW,
            symbol: 'SCAM',
            verification: 'blacklist',
          }),
          wallet_address: makeAddressRef(OWNER_RAW),
        },
      ]),
    getEvents: () => Promise.resolve([]),
    getJettonRates: () =>
      Promise.resolve({
        [USDT_RAW]: { prices: { USD: 1 } },
        [SCAM_JETTON_RAW]: { prices: { USD: 10 } },
      }),
    ...overrides,
  };
}

const coinGecko: CoinGeckoClient = {
  getTonPrice: () => Promise.resolve({ usd: 3, change24hPercent: 2 }),
};

describe('createPortfolioService', () => {
  it('builds a sorted portfolio and excludes scam tokens from the total', async () => {
    const service = createPortfolioService({ tonApi: createTonApi(), coinGecko, cacheTtlMs: 1000 });
    const snapshot = await service.getPortfolio('UQabc');
    expect(snapshot.holdings.map((holding) => holding.symbol)).toEqual(['USDT', 'SCAM', 'TON']);
    expect(snapshot.totalUsd).toBe(106);
    expect(snapshot.tonPrice).toEqual({ usd: 3, change24hPercent: 2 });
  });

  it('treats an unknown account as empty', async () => {
    const service = createPortfolioService({
      tonApi: createTonApi({
        getAccount: () => Promise.reject(new NotFoundError()),
        getJettonBalances: () => Promise.reject(new NotFoundError()),
      }),
      coinGecko,
      cacheTtlMs: 1000,
    });
    const snapshot = await service.getPortfolio('UQabc');
    expect(snapshot.holdings).toHaveLength(1);
    expect(snapshot.holdings[0]).toMatchObject({ symbol: 'TON', rawBalance: 0n });
  });

  it('keeps working when the TON price is unavailable', async () => {
    const service = createPortfolioService({
      tonApi: createTonApi(),
      coinGecko: { getTonPrice: () => Promise.reject(new Error('down')) },
      cacheTtlMs: 1000,
    });
    const snapshot = await service.getPortfolio('UQabc');
    expect(snapshot.tonPrice).toBeNull();
    expect(snapshot.holdings.find((holding) => holding.symbol === 'TON')?.valueUsd).toBeNull();
    expect(snapshot.totalUsd).toBe(100);
  });

  it('caches results until the TTL passes or a refresh is forced', async () => {
    const getAccount = vi.fn(() =>
      Promise.resolve<TonApiAccount>({ address: OWNER_RAW, balance: 1, status: 'active' }),
    );
    let currentTime = 0;
    const service = createPortfolioService({
      tonApi: createTonApi({ getAccount }),
      coinGecko,
      cacheTtlMs: 1000,
      now: () => currentTime,
    });
    await service.getPortfolio('UQabc');
    await service.getPortfolio('UQabc');
    expect(getAccount).toHaveBeenCalledTimes(1);
    await service.getPortfolio('UQabc', { forceRefresh: true });
    expect(getAccount).toHaveBeenCalledTimes(2);
    currentTime = 5000;
    await service.getPortfolio('UQabc');
    expect(getAccount).toHaveBeenCalledTimes(3);
  });
});
