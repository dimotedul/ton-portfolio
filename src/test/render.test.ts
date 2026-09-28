import { describe, expect, it } from 'vitest';
import { getStrings, resolveLocale } from '../bot/locales';
import { renderHistory, renderPortfolio } from '../bot/render';
import type { Holding, PortfolioSnapshot, PricedTransaction } from '../types/domain';
import { NOW_SECONDS, OWNER_FRIENDLY } from './fixtures';

const strings = getStrings('en');

const tonHolding: Holding = {
  id: 'ton',
  kind: 'ton',
  symbol: 'TON',
  name: 'Toncoin',
  rawBalance: 2_000_000_000n,
  decimals: 9,
  priceUsd: 3,
  valueUsd: 6,
  isScam: false,
};

const scamHolding: Holding = {
  id: 'scam',
  kind: 'jetton',
  symbol: 'SCAMCOIN',
  name: 'Scam',
  rawBalance: 1_000_000n,
  decimals: 6,
  priceUsd: 1,
  valueUsd: 1,
  isScam: true,
};

const snapshot: PortfolioSnapshot = {
  holdings: [tonHolding, scamHolding],
  totalUsd: 6,
  tonPrice: { usd: 3, change24hPercent: 1.5 },
  fetchedAtMs: 0,
};

describe('renderPortfolio', () => {
  it('shows totals and hides scam tokens by default', () => {
    const text = renderPortfolio(OWNER_FRIENDLY, snapshot, false, strings);
    expect(text).toContain('Total: $6.00');
    expect(text).toContain('+1.50%');
    expect(text).toContain('<b>TON</b>');
    expect(text).not.toContain('SCAMCOIN');
    expect(text).toContain('hidden');
  });

  it('reveals scam tokens with a warning when requested', () => {
    const text = renderPortfolio(OWNER_FRIENDLY, snapshot, true, strings);
    expect(text).toContain('⚠️ <b>SCAMCOIN</b>');
  });

  it('shows a dash instead of a total when nothing could be priced', () => {
    const unpriced: PortfolioSnapshot = {
      ...snapshot,
      holdings: [{ ...tonHolding, priceUsd: null, valueUsd: null }],
      totalUsd: 0,
      tonPrice: null,
    };
    expect(renderPortfolio(OWNER_FRIENDLY, unpriced, false, strings)).toContain('Total: —');
  });

  it('shows an empty state for empty wallets', () => {
    const empty: PortfolioSnapshot = {
      ...snapshot,
      holdings: [{ ...tonHolding, rawBalance: 0n, valueUsd: 0 }],
      totalUsd: 0,
    };
    expect(renderPortfolio(OWNER_FRIENDLY, empty, false, strings)).toContain('empty');
  });
});

describe('renderHistory', () => {
  const transaction: PricedTransaction = {
    id: 'abc',
    kind: 'received',
    timestampSeconds: NOW_SECONDS - 300,
    counterparty: null,
    amount: {
      asset: { symbol: '<b>', decimals: 6, tokenAddress: null },
      rawAmount: 1n,
    },
    secondaryAmount: null,
    isScam: false,
    usdValue: 0.001,
  };

  it('escapes token symbols and amounts', () => {
    const text = renderHistory(
      OWNER_FRIENDLY,
      { transactions: [transaction], fetchedAtMs: 0 },
      strings,
      NOW_SECONDS * 1000,
    );
    expect(text).toContain('&lt;b&gt;');
    expect(text).toContain('&lt;0.0001');
    expect(text).toContain('5 minutes ago');
    expect(text).toContain('https://tonviewer.com/transaction/abc');
  });

  it('shows an empty state without transactions', () => {
    const text = renderHistory(OWNER_FRIENDLY, { transactions: [], fetchedAtMs: 0 }, strings, 0);
    expect(text).toContain(strings.historyEmpty);
  });
});

describe('resolveLocale', () => {
  it('selects Russian for Russian language codes and English otherwise', () => {
    expect(resolveLocale('ru-RU')).toBe('ru');
    expect(resolveLocale('de')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});
