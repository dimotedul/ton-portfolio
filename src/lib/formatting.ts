const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const RELATIVE_TIME_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function scaleUnits(rawAmount: bigint, decimals: number): string {
  if (rawAmount < 0n) {
    throw new RangeError('Amount must not be negative');
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError('Decimals must be a non-negative integer');
  }
  if (decimals === 0) {
    return rawAmount.toString();
  }
  const padded = rawAmount.toString().padStart(decimals + 1, '0');
  const integerPart = padded.slice(0, -decimals);
  const fractionPart = padded.slice(-decimals).replace(/0+$/, '');
  return fractionPart.length > 0 ? `${integerPart}.${fractionPart}` : integerPart;
}

export function toDecimalNumber(rawAmount: bigint, decimals: number): number {
  return Number(scaleUnits(rawAmount, decimals));
}

export function formatTokenAmount(
  rawAmount: bigint,
  decimals: number,
  maxFractionDigits = 4,
): string {
  const [integerPart = '0', fractionPart = ''] = scaleUnits(rawAmount, decimals).split('.');
  const truncatedFraction = fractionPart.slice(0, maxFractionDigits).replace(/0+$/, '');
  if (integerPart === '0' && truncatedFraction.length === 0 && rawAmount > 0n) {
    return `<0.${'0'.repeat(maxFractionDigits - 1)}1`;
  }
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return truncatedFraction.length > 0 ? `${groupedInteger}.${truncatedFraction}` : groupedInteger;
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  if (value > 0 && value < 0.01) {
    return '<$0.01';
  }
  return usdFormatter.format(value);
}

export function formatPriceUsd(price: number | null): string {
  if (price === null || !Number.isFinite(price)) {
    return '—';
  }
  if (price === 0 || price >= 1) {
    return usdFormatter.format(price);
  }
  const fractionDigits = Math.min(12, 2 - Math.floor(Math.log10(price)));
  const fixed = price.toFixed(fractionDigits).replace(/(\.\d{2}\d*?)0+$/, '$1');
  return `$${fixed}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRelativeTime(
  timestampSeconds: number,
  nowSeconds: number,
  locale: string,
): string {
  const deltaSeconds = timestampSeconds - nowSeconds;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, unitSeconds] of RELATIVE_TIME_UNITS) {
    if (Math.abs(deltaSeconds) >= unitSeconds) {
      return formatter.format(Math.trunc(deltaSeconds / unitSeconds), unit);
    }
  }
  return formatter.format(0, 'second');
}

export function formatUtcTime(timestampMs: number): string {
  return `${new Date(timestampMs).toISOString().slice(11, 19)} UTC`;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
