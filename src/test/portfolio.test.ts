import { describe, expect, it } from 'vitest';
import {
  buildHoldings,
  calculateTotalUsd,
  computeValueUsd,
  filterVisibleHoldings,
  sortHoldingsByValue,
} from '../lib/portfolio';
import type { Holding, JettonBalance } from '../types/domain';
import { SCAM_JETTON_RAW, USDT_RAW } from './fixtures';

const tonPrice = { usd: 3, change24hPercent: 1.5 };

const usdtBalance: JettonBalance = {
  tokenAddress: USDT_RAW,
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  rawBalance: 100_000_000n,
  isScam: false,
};

const scamBalance: JettonBalance = {
  tokenAddress: SCAM_JETTON_RAW,
  symbol: 'SCAM',
  name: 'Free money',
  decimals: 6,
  rawBalance: 5_000_000n,
  isScam: true,
};

const prices = new Map([
  [USDT_RAW, 1],
  [SCAM_JETTON_RAW, 10],
]);

describe('computeValueUsd', () => {
  it('multiplies the scaled amount by the price', () => {
    expect(computeValueUsd(2_500_000n, 6, 4)).toBe(10);
  });

  it('returns null without a price', () => {
    expect(computeValueUsd(1n, 6, null)).toBeNull();
  });
});

describe('buildHoldings and calculateTotalUsd', () => {
  const holdings = buildHoldings(2_000_000_000n, tonPrice, [usdtBalance, scamBalance], prices);

  it('sorts holdings by USD value descending', () => {
    expect(holdings.map((holding) => holding.symbol)).toEqual(['USDT', 'SCAM', 'TON']);
  });

  it('excludes scam tokens from the total', () => {
    expect(calculateTotalUsd(holdings)).toBe(106);
  });

  it('ignores holdings without a price', () => {
    const unpriced = buildHoldings(2_000_000_000n, null, [usdtBalance], new Map());
    expect(calculateTotalUsd(unpriced)).toBe(0);
  });
});

describe('sortHoldingsByValue', () => {
  const base: Holding = {
    id: 'x',
    kind: 'jetton',
    symbol: 'B',
    name: 'B',
    rawBalance: 1n,
    decimals: 0,
    priceUsd: null,
    valueUsd: null,
    isScam: false,
  };

  it('places unpriced holdings last and orders ties by symbol', () => {
    const sorted = sortHoldingsByValue([
      { ...base, symbol: 'B' },
      { ...base, symbol: 'A' },
      { ...base, symbol: 'C', valueUsd: 5 },
    ]);
    expect(sorted.map((holding) => holding.symbol)).toEqual(['C', 'A', 'B']);
  });
});

describe('filterVisibleHoldings', () => {
  const holdings = buildHoldings(0n, tonPrice, [usdtBalance, scamBalance], prices);

  it('hides scam tokens by default', () => {
    expect(filterVisibleHoldings(holdings, false).map((holding) => holding.symbol)).toEqual([
      'USDT',
      'TON',
    ]);
  });

  it('shows scam tokens when requested', () => {
    expect(filterVisibleHoldings(holdings, true)).toHaveLength(3);
  });
});
