import { describe, expect, it } from 'vitest';
import {
  isBlacklistedJetton,
  mapAccountBalance,
  mapEvents,
  mapJettonBalances,
  mapJettonPrices,
} from '../api/mappers';
import {
  COUNTERPARTY_RAW,
  NOW_SECONDS,
  OWNER_FRIENDLY,
  OWNER_RAW,
  SCAM_JETTON_RAW,
  USDT_RAW,
  makeAddressRef,
  makeJettonPreview,
  makeJettonTransferEvent,
  makeSwapEvent,
  makeTonTransferEvent,
  makeUnknownEvent,
} from './fixtures';

describe('mapAccountBalance', () => {
  it('converts nanoTON to bigint', () => {
    expect(mapAccountBalance({ address: OWNER_RAW, balance: 5_000_000_000, status: 'active' })).toBe(
      5_000_000_000n,
    );
  });
});

describe('mapJettonBalances', () => {
  it('drops empty wallets, flags blacklisted Jettons and normalizes addresses', () => {
    const mapped = mapJettonBalances([
      {
        balance: '100000000',
        jetton: makeJettonPreview({ address: USDT_RAW.toUpperCase() }),
        wallet_address: makeAddressRef(OWNER_RAW),
      },
      {
        balance: '0',
        jetton: makeJettonPreview({ address: COUNTERPARTY_RAW, symbol: 'EMPTY' }),
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
    ]);

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      tokenAddress: USDT_RAW,
      symbol: 'USDT',
      decimals: 6,
      rawBalance: 100_000_000n,
      isScam: false,
    });
    expect(mapped[1]).toMatchObject({ symbol: 'SCAM', isScam: true });
  });
});

describe('isBlacklistedJetton', () => {
  it('only treats the blacklist verification as scam', () => {
    expect(isBlacklistedJetton(makeJettonPreview({ verification: 'blacklist' }))).toBe(true);
    expect(isBlacklistedJetton(makeJettonPreview({ verification: 'graylist' }))).toBe(false);
    expect(isBlacklistedJetton(makeJettonPreview({ verification: 'none' }))).toBe(false);
  });
});

describe('mapJettonPrices', () => {
  it('normalizes token addresses and reads USD prices case-insensitively', () => {
    const prices = mapJettonPrices({
      [USDT_RAW]: { prices: { USD: 1.001 } },
      [SCAM_JETTON_RAW]: { prices: { usd: 2 } },
      [COUNTERPARTY_RAW]: { prices: { EUR: 3 } },
    });
    expect(prices.get(USDT_RAW)).toBe(1.001);
    expect(prices.get(SCAM_JETTON_RAW)).toBe(2);
    expect(prices.has(COUNTERPARTY_RAW)).toBe(false);
  });
});

describe('mapEvents', () => {
  it('maps a received TON transfer', () => {
    const [transaction] = mapEvents(
      [
        makeTonTransferEvent({
          id: 'received',
          timestamp: NOW_SECONDS,
          senderRaw: COUNTERPARTY_RAW,
          recipientRaw: OWNER_RAW,
          amountNano: 5_000_000_000,
        }),
      ],
      OWNER_FRIENDLY,
    );
    expect(transaction).toMatchObject({
      id: 'received',
      kind: 'received',
      counterparty: COUNTERPARTY_RAW,
      amount: { rawAmount: 5_000_000_000n, asset: { symbol: 'TON', decimals: 9, tokenAddress: null } },
      isScam: false,
    });
  });

  it('maps a sent Jetton transfer', () => {
    const [transaction] = mapEvents(
      [
        makeJettonTransferEvent({
          id: 'sent',
          timestamp: NOW_SECONDS,
          senderRaw: OWNER_RAW,
          recipientRaw: COUNTERPARTY_RAW,
          amount: '2500000',
        }),
      ],
      OWNER_FRIENDLY,
    );
    expect(transaction).toMatchObject({
      kind: 'sent',
      counterparty: COUNTERPARTY_RAW,
      amount: {
        rawAmount: 2_500_000n,
        asset: { symbol: 'USDT', decimals: 6, tokenAddress: USDT_RAW },
      },
    });
  });

  it('maps a swap with both sides', () => {
    const [transaction] = mapEvents(
      [
        makeSwapEvent({
          id: 'swap',
          timestamp: NOW_SECONDS,
          tonInNano: 1_000_000_000,
          jettonOut: makeJettonPreview(),
          amountOut: '3000000',
        }),
      ],
      OWNER_FRIENDLY,
    );
    expect(transaction).toMatchObject({
      kind: 'swap',
      amount: { rawAmount: 3_000_000n, asset: { symbol: 'USDT' } },
      secondaryAmount: { rawAmount: 1_000_000_000n, asset: { symbol: 'TON' } },
    });
  });

  it('maps unknown actions to other', () => {
    const [transaction] = mapEvents([makeUnknownEvent('other', NOW_SECONDS)], OWNER_FRIENDLY);
    expect(transaction).toMatchObject({ kind: 'other', amount: null, counterparty: null });
  });

  it('maps a transfer to oneself to other', () => {
    const [transaction] = mapEvents(
      [
        makeTonTransferEvent({
          id: 'self',
          timestamp: NOW_SECONDS,
          senderRaw: OWNER_RAW,
          recipientRaw: OWNER_RAW,
          amountNano: 1,
        }),
      ],
      OWNER_FRIENDLY,
    );
    expect(transaction).toMatchObject({ kind: 'other', counterparty: null });
  });

  it('flags scam events and blacklisted Jettons', () => {
    const transactions = mapEvents(
      [
        makeTonTransferEvent({
          id: 'scam-event',
          timestamp: NOW_SECONDS,
          senderRaw: COUNTERPARTY_RAW,
          recipientRaw: OWNER_RAW,
          amountNano: 1,
          isScam: true,
        }),
        makeJettonTransferEvent({
          id: 'scam-jetton',
          timestamp: NOW_SECONDS - 1,
          senderRaw: COUNTERPARTY_RAW,
          recipientRaw: OWNER_RAW,
          amount: '1',
          jetton: makeJettonPreview({ address: SCAM_JETTON_RAW, verification: 'blacklist' }),
        }),
      ],
      OWNER_FRIENDLY,
    );
    expect(transactions.map((transaction) => transaction.isScam)).toEqual([true, true]);
  });

  it('sorts transactions from newest to oldest', () => {
    const transactions = mapEvents(
      [makeUnknownEvent('older', 100), makeUnknownEvent('newer', 200)],
      OWNER_FRIENDLY,
    );
    expect(transactions.map((transaction) => transaction.id)).toEqual(['newer', 'older']);
  });
});
