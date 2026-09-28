import type { Holding, JettonBalance, TonPrice } from '../types/domain';
import { TON_DECIMALS } from './assets';
import { toDecimalNumber } from './formatting';

export function computeValueUsd(
  rawBalance: bigint,
  decimals: number,
  priceUsd: number | null,
): number | null {
  if (priceUsd === null) {
    return null;
  }
  return toDecimalNumber(rawBalance, decimals) * priceUsd;
}

export function buildTonHolding(balanceNano: bigint, tonPrice: TonPrice | null): Holding {
  const priceUsd = tonPrice?.usd ?? null;
  return {
    id: 'ton',
    kind: 'ton',
    symbol: 'TON',
    name: 'Toncoin',
    rawBalance: balanceNano,
    decimals: TON_DECIMALS,
    priceUsd,
    valueUsd: computeValueUsd(balanceNano, TON_DECIMALS, priceUsd),
    isScam: false,
  };
}

export function buildJettonHolding(balance: JettonBalance, priceUsd: number | null): Holding {
  return {
    id: balance.tokenAddress,
    kind: 'jetton',
    symbol: balance.symbol,
    name: balance.name,
    rawBalance: balance.rawBalance,
    decimals: balance.decimals,
    priceUsd,
    valueUsd: computeValueUsd(balance.rawBalance, balance.decimals, priceUsd),
    isScam: balance.isScam,
  };
}

export function sortHoldingsByValue(holdings: readonly Holding[]): Holding[] {
  return [...holdings].sort((left, right) => {
    const leftValue = left.valueUsd ?? -1;
    const rightValue = right.valueUsd ?? -1;
    if (leftValue !== rightValue) {
      return rightValue - leftValue;
    }
    return left.symbol.localeCompare(right.symbol);
  });
}

export function buildHoldings(
  balanceNano: bigint,
  tonPrice: TonPrice | null,
  jettons: readonly JettonBalance[],
  jettonPrices: ReadonlyMap<string, number>,
): Holding[] {
  const holdings = [
    buildTonHolding(balanceNano, tonPrice),
    ...jettons.map((jetton) =>
      buildJettonHolding(jetton, jettonPrices.get(jetton.tokenAddress) ?? null),
    ),
  ];
  return sortHoldingsByValue(holdings);
}

export function filterVisibleHoldings(holdings: readonly Holding[], showScam: boolean): Holding[] {
  return showScam ? [...holdings] : holdings.filter((holding) => !holding.isScam);
}

export function calculateTotalUsd(holdings: readonly Holding[]): number {
  return holdings.reduce(
    (sum, holding) => (holding.isScam || holding.valueUsd === null ? sum : sum + holding.valueUsd),
    0,
  );
}
