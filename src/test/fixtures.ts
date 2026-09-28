import { Address } from '@ton/core';
import type {
  TonApiAddressRef,
  TonApiEvent,
  TonApiJettonPreview,
} from '../types/api';

export const OWNER_ADDRESS = new Address(0, Buffer.alloc(32, 1));
export const OWNER_FRIENDLY = OWNER_ADDRESS.toString();
export const OWNER_RAW = OWNER_ADDRESS.toRawString();
export const USDT_RAW = new Address(0, Buffer.alloc(32, 2)).toRawString();
export const COUNTERPARTY_RAW = new Address(0, Buffer.alloc(32, 3)).toRawString();
export const SCAM_JETTON_RAW = new Address(0, Buffer.alloc(32, 4)).toRawString();
export const NOW_SECONDS = 1_800_000_000;

export function makeAddressRef(address: string): TonApiAddressRef {
  return { address, is_scam: false };
}

export function makeJettonPreview(
  overrides: Partial<TonApiJettonPreview> = {},
): TonApiJettonPreview {
  return {
    address: USDT_RAW,
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    verification: 'whitelist',
    ...overrides,
  };
}

interface TransferEventInput {
  id: string;
  timestamp: number;
  senderRaw: string;
  recipientRaw: string;
  isScam?: boolean;
}

export function makeTonTransferEvent(
  input: TransferEventInput & { amountNano: number },
): TonApiEvent {
  return {
    event_id: input.id,
    timestamp: input.timestamp,
    is_scam: input.isScam ?? false,
    in_progress: false,
    actions: [
      {
        type: 'TonTransfer',
        status: 'ok',
        TonTransfer: {
          sender: makeAddressRef(input.senderRaw),
          recipient: makeAddressRef(input.recipientRaw),
          amount: input.amountNano,
        },
      },
    ],
  };
}

export function makeJettonTransferEvent(
  input: TransferEventInput & { amount: string; jetton?: TonApiJettonPreview },
): TonApiEvent {
  return {
    event_id: input.id,
    timestamp: input.timestamp,
    is_scam: input.isScam ?? false,
    in_progress: false,
    actions: [
      {
        type: 'JettonTransfer',
        status: 'ok',
        JettonTransfer: {
          sender: makeAddressRef(input.senderRaw),
          recipient: makeAddressRef(input.recipientRaw),
          amount: input.amount,
          jetton: input.jetton ?? makeJettonPreview(),
        },
      },
    ],
  };
}

export function makeSwapEvent(input: {
  id: string;
  timestamp: number;
  tonInNano: number;
  jettonOut: TonApiJettonPreview;
  amountOut: string;
}): TonApiEvent {
  return {
    event_id: input.id,
    timestamp: input.timestamp,
    is_scam: false,
    in_progress: false,
    actions: [
      {
        type: 'JettonSwap',
        status: 'ok',
        JettonSwap: {
          dex: 'stonfi',
          amount_in: '0',
          amount_out: input.amountOut,
          ton_in: input.tonInNano,
          jetton_master_out: input.jettonOut,
          user_wallet: makeAddressRef(OWNER_RAW),
        },
      },
    ],
  };
}

export function makeUnknownEvent(id: string, timestamp: number): TonApiEvent {
  return {
    event_id: id,
    timestamp,
    is_scam: false,
    in_progress: false,
    actions: [{ type: 'NftItemTransfer', status: 'ok' }],
  };
}
