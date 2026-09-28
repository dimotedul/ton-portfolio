import { toRawAddress } from '../lib/address';
import { TON_ASSET } from '../lib/assets';
import type {
  TonApiAccount,
  TonApiAction,
  TonApiEvent,
  TonApiJettonBalance,
  TonApiJettonPreview,
  TonApiJettonSwap,
  TonApiRate,
} from '../types/api';
import type {
  JettonBalance,
  Transaction,
  TransactionAmount,
  TransactionAsset,
  TransactionKind,
} from '../types/domain';

interface TransferView {
  senderRaw: string | null;
  recipientRaw: string | null;
  amount: TransactionAmount;
  involvesScamJetton: boolean;
}

interface TransactionBase {
  id: string;
  timestampSeconds: number;
}

export function parseRawAmount(value: string): bigint {
  try {
    const parsed = BigInt(value);
    return parsed > 0n ? parsed : 0n;
  } catch {
    return 0n;
  }
}

function nanoToBigInt(value: number): bigint {
  return Number.isFinite(value) && value > 0 ? BigInt(Math.trunc(value)) : 0n;
}

function normalizeDecimals(decimals: number): number {
  return Number.isInteger(decimals) && decimals >= 0 ? decimals : 0;
}

export function isBlacklistedJetton(jetton: TonApiJettonPreview): boolean {
  return jetton.verification === 'blacklist';
}

function assetFromJetton(jetton: TonApiJettonPreview): TransactionAsset {
  return {
    symbol: jetton.symbol,
    decimals: normalizeDecimals(jetton.decimals),
    tokenAddress: toRawAddress(jetton.address),
  };
}

export function mapAccountBalance(account: TonApiAccount): bigint {
  return nanoToBigInt(account.balance);
}

export function mapJettonBalances(balances: readonly TonApiJettonBalance[]): JettonBalance[] {
  return balances
    .map((entry) => ({
      tokenAddress: toRawAddress(entry.jetton.address),
      symbol: entry.jetton.symbol,
      name: entry.jetton.name,
      decimals: normalizeDecimals(entry.jetton.decimals),
      rawBalance: parseRawAmount(entry.balance),
      isScam: isBlacklistedJetton(entry.jetton),
    }))
    .filter((balance) => balance.rawBalance > 0n);
}

function readUsdPrice(rate: TonApiRate): number | null {
  const entry = Object.entries(rate.prices ?? {}).find(
    ([currency]) => currency.toUpperCase() === 'USD',
  );
  if (entry === undefined) {
    return null;
  }
  const [, price] = entry;
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function mapJettonPrices(rates: Readonly<Record<string, TonApiRate>>): Map<string, number> {
  const prices = new Map<string, number>();
  for (const [token, rate] of Object.entries(rates)) {
    const usdPrice = readUsdPrice(rate);
    if (usdPrice !== null) {
      prices.set(toRawAddress(token), usdPrice);
    }
  }
  return prices;
}

function viewTransfer(action: TonApiAction): TransferView | null {
  if (action.TonTransfer) {
    const transfer = action.TonTransfer;
    return {
      senderRaw: toRawAddress(transfer.sender.address),
      recipientRaw: toRawAddress(transfer.recipient.address),
      amount: { asset: TON_ASSET, rawAmount: nanoToBigInt(transfer.amount) },
      involvesScamJetton: false,
    };
  }
  if (action.JettonTransfer) {
    const transfer = action.JettonTransfer;
    return {
      senderRaw: transfer.sender ? toRawAddress(transfer.sender.address) : null,
      recipientRaw: transfer.recipient ? toRawAddress(transfer.recipient.address) : null,
      amount: { asset: assetFromJetton(transfer.jetton), rawAmount: parseRawAmount(transfer.amount) },
      involvesScamJetton: isBlacklistedJetton(transfer.jetton),
    };
  }
  return null;
}

function swapSide(
  tonAmountNano: number | undefined,
  jetton: TonApiJettonPreview | undefined,
  jettonAmount: string,
): TransactionAmount | null {
  if (jetton !== undefined) {
    return { asset: assetFromJetton(jetton), rawAmount: parseRawAmount(jettonAmount) };
  }
  if (tonAmountNano !== undefined) {
    return { asset: TON_ASSET, rawAmount: nanoToBigInt(tonAmountNano) };
  }
  return null;
}

function mapSwap(base: TransactionBase, swap: TonApiJettonSwap, isEventScam: boolean): Transaction {
  const involvesScamJetton = [swap.jetton_master_in, swap.jetton_master_out].some(
    (jetton) => jetton !== undefined && isBlacklistedJetton(jetton),
  );
  return {
    ...base,
    kind: 'swap',
    counterparty: null,
    amount: swapSide(swap.ton_out, swap.jetton_master_out, swap.amount_out),
    secondaryAmount: swapSide(swap.ton_in, swap.jetton_master_in, swap.amount_in),
    isScam: isEventScam || involvesScamJetton,
  };
}

function resolveDirection(
  view: TransferView,
  ownerRaw: string,
): { kind: TransactionKind; counterparty: string | null } {
  const isRecipient = view.recipientRaw === ownerRaw;
  const isSender = view.senderRaw === ownerRaw;
  if (isRecipient && !isSender) {
    return { kind: 'received', counterparty: view.senderRaw };
  }
  if (isSender && !isRecipient) {
    return { kind: 'sent', counterparty: view.recipientRaw };
  }
  return { kind: 'other', counterparty: null };
}

function mapEvent(event: TonApiEvent, ownerRaw: string): Transaction {
  const base: TransactionBase = { id: event.event_id, timestampSeconds: event.timestamp };

  for (const action of event.actions) {
    if (action.JettonSwap) {
      return mapSwap(base, action.JettonSwap, event.is_scam);
    }
  }

  for (const action of event.actions) {
    const view = viewTransfer(action);
    if (view !== null) {
      const { kind, counterparty } = resolveDirection(view, ownerRaw);
      return {
        ...base,
        kind,
        counterparty,
        amount: view.amount,
        secondaryAmount: null,
        isScam: event.is_scam || view.involvesScamJetton,
      };
    }
  }

  return {
    ...base,
    kind: 'other',
    counterparty: null,
    amount: null,
    secondaryAmount: null,
    isScam: event.is_scam,
  };
}

export function mapEvents(events: readonly TonApiEvent[], ownerAddress: string): Transaction[] {
  const ownerRaw = toRawAddress(ownerAddress);
  return events
    .map((event) => mapEvent(event, ownerRaw))
    .sort((left, right) => right.timestampSeconds - left.timestampSeconds);
}
