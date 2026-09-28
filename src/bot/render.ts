import { parseTonAddress, shortenAddress } from '../lib/address';
import {
  escapeHtml,
  formatPercent,
  formatPriceUsd,
  formatRelativeTime,
  formatTokenAmount,
  formatUsd,
  formatUtcTime,
} from '../lib/formatting';
import { tonviewerAddressUrl, tonviewerTransactionUrl } from '../lib/links';
import { filterVisibleHoldings } from '../lib/portfolio';
import type {
  HistorySnapshot,
  Holding,
  PortfolioSnapshot,
  PricedTransaction,
  TransactionAmount,
  TransactionKind,
} from '../types/domain';
import type { Strings } from './locales';

const MAX_LISTED_HOLDINGS = 20;
const MAX_SYMBOL_LENGTH = 12;
const HISTORY_CHARACTER_BUDGET = 3600;

const KIND_ICONS: Record<TransactionKind, string> = {
  received: '📥',
  sent: '📤',
  swap: '🔄',
  other: '▫️',
};

function safeSymbol(symbol: string): string {
  const shortened =
    symbol.length > MAX_SYMBOL_LENGTH ? `${symbol.slice(0, MAX_SYMBOL_LENGTH)}…` : symbol;
  return escapeHtml(shortened);
}

function usdText(value: number | null): string {
  return escapeHtml(formatUsd(value));
}

function addressLink(address: string): string {
  return `<a href="${tonviewerAddressUrl(address)}">${escapeHtml(shortenAddress(address))}</a>`;
}

function counterpartyLink(rawAddress: string): string {
  return addressLink(parseTonAddress(rawAddress)?.friendly ?? rawAddress);
}

function renderHolding(holding: Holding): string {
  const warning = holding.isScam ? '⚠️ ' : '';
  const amount = escapeHtml(formatTokenAmount(holding.rawBalance, holding.decimals));
  return `${warning}<b>${safeSymbol(holding.symbol)}</b> · ${amount} · ${formatPriceUsd(holding.priceUsd)} · <b>${usdText(holding.valueUsd)}</b>`;
}

export function renderPortfolio(
  friendlyAddress: string,
  snapshot: PortfolioSnapshot,
  showScam: boolean,
  strings: Strings,
): string {
  const visibleHoldings = filterVisibleHoldings(snapshot.holdings, showScam);
  const hiddenCount = snapshot.holdings.length - visibleHoldings.length;
  const listedHoldings = visibleHoldings.slice(0, MAX_LISTED_HOLDINGS);
  const hasAnyValue = snapshot.holdings.some((holding) => holding.valueUsd !== null);
  const totalText = hasAnyValue ? usdText(snapshot.totalUsd) : '—';

  const lines = [
    `<b>${strings.portfolioTitle}</b> ${addressLink(friendlyAddress)}`,
    '',
    `<b>${strings.total}: ${totalText}</b>`,
  ];
  if (snapshot.tonPrice !== null) {
    lines.push(`${strings.tonChange24h}: ${formatPercent(snapshot.tonPrice.change24hPercent)}`);
  }
  lines.push('');
  if (visibleHoldings.every((holding) => holding.rawBalance === 0n)) {
    lines.push(strings.emptyWallet);
  } else {
    lines.push(...listedHoldings.map(renderHolding));
  }
  if (visibleHoldings.length > listedHoldings.length) {
    lines.push(strings.moreHoldings(visibleHoldings.length - listedHoldings.length));
  }
  if (hiddenCount > 0) {
    lines.push('', strings.hiddenScam(hiddenCount));
  }
  lines.push('', `${strings.updated}: ${formatUtcTime(snapshot.fetchedAtMs)}`);
  return lines.join('\n');
}

function formatAmount(amount: TransactionAmount): string {
  const value = formatTokenAmount(amount.rawAmount, amount.asset.decimals);
  return `${escapeHtml(value)} ${safeSymbol(amount.asset.symbol)}`;
}

function describeAmounts(transaction: PricedTransaction): string {
  if (transaction.amount === null) {
    return '';
  }
  const main = formatAmount(transaction.amount);
  const usd = transaction.usdValue === null ? '' : ` (~${usdText(transaction.usdValue)})`;
  if (transaction.kind === 'swap' && transaction.secondaryAmount !== null) {
    return `${formatAmount(transaction.secondaryAmount)} → ${main}${usd}`;
  }
  return `${main}${usd}`;
}

function renderTransaction(
  transaction: PricedTransaction,
  nowSeconds: number,
  strings: Strings,
): string {
  const icon = transaction.isScam ? '⚠️' : KIND_ICONS[transaction.kind];
  const parts = [`${icon} <b>${strings.kinds[transaction.kind]}</b>`];
  const amountText = describeAmounts(transaction);
  if (amountText.length > 0) {
    parts.push(amountText);
  }
  if (transaction.counterparty !== null) {
    const preposition = transaction.kind === 'received' ? strings.from : strings.to;
    parts.push(`${preposition} ${counterpartyLink(transaction.counterparty)}`);
  }
  parts.push(
    escapeHtml(formatRelativeTime(transaction.timestampSeconds, nowSeconds, strings.intlLocale)),
  );
  parts.push(`<a href="${tonviewerTransactionUrl(transaction.id)}">${strings.view}</a>`);
  return parts.join(' · ');
}

function takeWithinBudget(lines: readonly string[], budget: number): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    used += line.length + 1;
    if (used > budget) {
      break;
    }
    kept.push(line);
  }
  return kept;
}

export function renderHistory(
  friendlyAddress: string,
  snapshot: HistorySnapshot,
  strings: Strings,
  nowMs: number,
): string {
  const header = `<b>${strings.historyTitle}</b> ${addressLink(friendlyAddress)}`;
  if (snapshot.transactions.length === 0) {
    return `${header}\n\n${strings.historyEmpty}`;
  }
  const nowSeconds = Math.floor(nowMs / 1000);
  const lines = takeWithinBudget(
    snapshot.transactions.map((transaction) => renderTransaction(transaction, nowSeconds, strings)),
    HISTORY_CHARACTER_BUDGET,
  );
  return [
    header,
    '',
    ...lines,
    '',
    `${strings.updated}: ${formatUtcTime(snapshot.fetchedAtMs)}`,
  ].join('\n');
}
