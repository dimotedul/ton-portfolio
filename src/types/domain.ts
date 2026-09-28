export type Locale = 'en' | 'ru';

export interface ParsedAddress {
  raw: string;
  friendly: string;
}

export interface TonPrice {
  usd: number;
  change24hPercent: number | null;
}

export interface JettonBalance {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: bigint;
  isScam: boolean;
}

export interface Holding {
  id: string;
  kind: 'ton' | 'jetton';
  symbol: string;
  name: string;
  rawBalance: bigint;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
  isScam: boolean;
}

export type TransactionKind = 'received' | 'sent' | 'swap' | 'other';

export interface TransactionAsset {
  symbol: string;
  decimals: number;
  tokenAddress: string | null;
}

export interface TransactionAmount {
  asset: TransactionAsset;
  rawAmount: bigint;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  timestampSeconds: number;
  counterparty: string | null;
  amount: TransactionAmount | null;
  secondaryAmount: TransactionAmount | null;
  isScam: boolean;
}

export interface PricedTransaction extends Transaction {
  usdValue: number | null;
}

export interface PriceBook {
  tonUsd: number | null;
  jettonUsd: ReadonlyMap<string, number>;
}

export interface PortfolioSnapshot {
  holdings: Holding[];
  totalUsd: number;
  tonPrice: TonPrice | null;
  fetchedAtMs: number;
}

export interface HistorySnapshot {
  transactions: PricedTransaction[];
  fetchedAtMs: number;
}

export interface ChatPreferences {
  recentAddresses: string[];
  lastAddress: string | null;
  showScam: boolean;
}
