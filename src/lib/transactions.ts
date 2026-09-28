import type {
  PriceBook,
  PricedTransaction,
  Transaction,
  TransactionAmount,
} from '../types/domain';
import { toDecimalNumber } from './formatting';

export function valueOfAmount(amount: TransactionAmount | null, prices: PriceBook): number | null {
  if (amount === null) {
    return null;
  }
  const unitPrice =
    amount.asset.tokenAddress === null
      ? prices.tonUsd
      : (prices.jettonUsd.get(amount.asset.tokenAddress) ?? null);
  if (unitPrice === null) {
    return null;
  }
  return toDecimalNumber(amount.rawAmount, amount.asset.decimals) * unitPrice;
}

export function priceTransactions(
  transactions: readonly Transaction[],
  prices: PriceBook,
): PricedTransaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    usdValue:
      valueOfAmount(transaction.amount, prices) ??
      valueOfAmount(transaction.secondaryAmount, prices),
  }));
}

export function collectJettonAddresses(transactions: readonly Transaction[]): string[] {
  const addresses = new Set<string>();
  for (const transaction of transactions) {
    for (const amount of [transaction.amount, transaction.secondaryAmount]) {
      if (amount?.asset.tokenAddress) {
        addresses.add(amount.asset.tokenAddress);
      }
    }
  }
  return [...addresses];
}
