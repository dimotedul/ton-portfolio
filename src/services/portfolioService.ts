import type { CoinGeckoClient } from '../api/coingecko';
import { NotFoundError } from '../api/errors';
import {
  mapAccountBalance,
  mapEvents,
  mapJettonBalances,
  mapJettonPrices,
} from '../api/mappers';
import type { TonApiClient } from '../api/tonapi';
import { buildHoldings, calculateTotalUsd } from '../lib/portfolio';
import { collectJettonAddresses, priceTransactions } from '../lib/transactions';
import type {
  HistorySnapshot,
  JettonBalance,
  PortfolioSnapshot,
  TonPrice,
} from '../types/domain';
import { TtlCache } from './ttlCache';

export const HISTORY_EVENT_LIMIT = 20;
const MAX_CACHED_ADDRESSES = 500;

export interface FetchOptions {
  forceRefresh?: boolean;
}

export interface PortfolioService {
  getPortfolio(address: string, options?: FetchOptions): Promise<PortfolioSnapshot>;
  getHistory(address: string, options?: FetchOptions): Promise<HistorySnapshot>;
}

export interface PortfolioServiceDependencies {
  tonApi: TonApiClient;
  coinGecko: CoinGeckoClient;
  cacheTtlMs: number;
  now?: () => number;
}

async function recoverNotFound<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return fallback;
    }
    throw error;
  }
}

export function createPortfolioService(
  dependencies: PortfolioServiceDependencies,
): PortfolioService {
  const now = dependencies.now ?? Date.now;
  const portfolioCache = new TtlCache<PortfolioSnapshot>(
    dependencies.cacheTtlMs,
    MAX_CACHED_ADDRESSES,
    now,
  );
  const historyCache = new TtlCache<HistorySnapshot>(
    dependencies.cacheTtlMs,
    MAX_CACHED_ADDRESSES,
    now,
  );
  const noJettons: JettonBalance[] = [];

  async function loadTonPrice(): Promise<TonPrice | null> {
    try {
      return await dependencies.coinGecko.getTonPrice();
    } catch {
      return null;
    }
  }

  async function loadJettonPrices(tokenAddresses: readonly string[]): Promise<Map<string, number>> {
    if (tokenAddresses.length === 0) {
      return new Map();
    }
    try {
      return mapJettonPrices(await dependencies.tonApi.getJettonRates(tokenAddresses));
    } catch {
      return new Map();
    }
  }

  async function loadPortfolio(address: string): Promise<PortfolioSnapshot> {
    const [balanceNano, jettons, tonPrice] = await Promise.all([
      recoverNotFound(
        async () => mapAccountBalance(await dependencies.tonApi.getAccount(address)),
        0n,
      ),
      recoverNotFound(
        async () => mapJettonBalances(await dependencies.tonApi.getJettonBalances(address)),
        noJettons,
      ),
      loadTonPrice(),
    ]);
    const jettonPrices = await loadJettonPrices(jettons.map((jetton) => jetton.tokenAddress));
    const holdings = buildHoldings(balanceNano, tonPrice, jettons, jettonPrices);
    return {
      holdings,
      totalUsd: calculateTotalUsd(holdings),
      tonPrice,
      fetchedAtMs: now(),
    };
  }

  async function loadHistory(address: string): Promise<HistorySnapshot> {
    const [events, tonPrice] = await Promise.all([
      recoverNotFound(() => dependencies.tonApi.getEvents(address, HISTORY_EVENT_LIMIT), []),
      loadTonPrice(),
    ]);
    const transactions = mapEvents(events, address);
    const jettonPrices = await loadJettonPrices(collectJettonAddresses(transactions));
    return {
      transactions: priceTransactions(transactions, {
        tonUsd: tonPrice?.usd ?? null,
        jettonUsd: jettonPrices,
      }),
      fetchedAtMs: now(),
    };
  }

  return {
    getPortfolio(address, options = {}) {
      return portfolioCache.getOrLoad(address, () => loadPortfolio(address), options.forceRefresh);
    },
    getHistory(address, options = {}) {
      return historyCache.getOrLoad(address, () => loadHistory(address), options.forceRefresh);
    },
  };
}
