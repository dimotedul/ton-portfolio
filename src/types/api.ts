export type TonApiJettonVerification = 'whitelist' | 'graylist' | 'blacklist' | 'none';

export interface TonApiAddressRef {
  address: string;
  name?: string;
  is_scam: boolean;
}

export interface TonApiJettonPreview {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
  verification: TonApiJettonVerification;
}

export interface TonApiAccount {
  address: string;
  balance: number;
  status: string;
}

export interface TonApiJettonBalance {
  balance: string;
  jetton: TonApiJettonPreview;
  wallet_address: TonApiAddressRef;
}

export interface TonApiJettonBalancesResponse {
  balances: TonApiJettonBalance[];
}

export interface TonApiTonTransfer {
  sender: TonApiAddressRef;
  recipient: TonApiAddressRef;
  amount: number;
  comment?: string;
}

export interface TonApiJettonTransfer {
  sender?: TonApiAddressRef;
  recipient?: TonApiAddressRef;
  amount: string;
  jetton: TonApiJettonPreview;
}

export interface TonApiJettonSwap {
  dex: string;
  amount_in: string;
  amount_out: string;
  ton_in?: number;
  ton_out?: number;
  jetton_master_in?: TonApiJettonPreview;
  jetton_master_out?: TonApiJettonPreview;
  user_wallet: TonApiAddressRef;
}

export interface TonApiAction {
  type: string;
  status: string;
  TonTransfer?: TonApiTonTransfer;
  JettonTransfer?: TonApiJettonTransfer;
  JettonSwap?: TonApiJettonSwap;
}

export interface TonApiEvent {
  event_id: string;
  timestamp: number;
  actions: TonApiAction[];
  is_scam: boolean;
  in_progress: boolean;
}

export interface TonApiEventsResponse {
  events: TonApiEvent[];
}

export interface TonApiRate {
  prices?: Record<string, number>;
}

export interface TonApiRatesResponse {
  rates: Record<string, TonApiRate>;
}

export interface CoinGeckoSimplePriceResponse {
  'the-open-network'?: {
    usd?: number;
    usd_24h_change?: number;
  };
}
