import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  formatPercent,
  formatPriceUsd,
  formatRelativeTime,
  formatTokenAmount,
  formatUsd,
  formatUtcTime,
  scaleUnits,
} from '../lib/formatting';

describe('scaleUnits', () => {
  it('scales by nine decimals and trims trailing zeros', () => {
    expect(scaleUnits(1_500_000_000n, 9)).toBe('1.5');
  });

  it('keeps the smallest unit', () => {
    expect(scaleUnits(1n, 9)).toBe('0.000000001');
  });

  it('handles zero and zero decimals', () => {
    expect(scaleUnits(0n, 9)).toBe('0');
    expect(scaleUnits(123n, 0)).toBe('123');
  });

  it('handles amounts beyond the safe integer range without losing precision', () => {
    expect(scaleUnits(123_456_789_012_345_678_901n, 6)).toBe('123456789012345.678901');
  });

  it('scales six-decimal Jettons', () => {
    expect(scaleUnits(2_500_000n, 6)).toBe('2.5');
  });

  it('rejects negative amounts and invalid decimals', () => {
    expect(() => scaleUnits(-1n, 9)).toThrow(RangeError);
    expect(() => scaleUnits(1n, -1)).toThrow(RangeError);
    expect(() => scaleUnits(1n, 1.5)).toThrow(RangeError);
  });
});

describe('formatTokenAmount', () => {
  it('groups thousands and truncates the fraction', () => {
    expect(formatTokenAmount(1_234_567_890_123n, 9)).toBe('1,234.5678');
  });

  it('drops the fraction for whole amounts', () => {
    expect(formatTokenAmount(1_000_000_000n, 9)).toBe('1');
  });

  it('marks dust amounts', () => {
    expect(formatTokenAmount(1n, 9)).toBe('<0.0001');
  });

  it('formats zero', () => {
    expect(formatTokenAmount(0n, 9)).toBe('0');
  });
});

describe('formatUsd', () => {
  it('formats dollars', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('marks values below one cent', () => {
    expect(formatUsd(0.001)).toBe('<$0.01');
  });

  it('shows a dash for unknown values', () => {
    expect(formatUsd(null)).toBe('—');
  });
});

describe('formatPriceUsd', () => {
  it('formats prices of one dollar and above', () => {
    expect(formatPriceUsd(3.2)).toBe('$3.20');
  });

  it('keeps meaningful digits for small prices', () => {
    expect(formatPriceUsd(0.5)).toBe('$0.50');
    expect(formatPriceUsd(0.01234)).toBe('$0.0123');
    expect(formatPriceUsd(0.00001234)).toBe('$0.0000123');
  });

  it('shows a dash for unknown prices', () => {
    expect(formatPriceUsd(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('adds a sign to positive values', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
  });

  it('keeps the sign of negative values', () => {
    expect(formatPercent(-0.5)).toBe('-0.50%');
  });

  it('handles zero and unknown values', () => {
    expect(formatPercent(0)).toBe('0.00%');
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  const now = 1_800_000_000;

  it('formats minutes, hours and days', () => {
    expect(formatRelativeTime(now - 300, now, 'en')).toBe('5 minutes ago');
    expect(formatRelativeTime(now - 7200, now, 'en')).toBe('2 hours ago');
    expect(formatRelativeTime(now - 172_800, now, 'en')).toBe('2 days ago');
  });

  it('formats very recent times as now', () => {
    expect(formatRelativeTime(now - 10, now, 'en')).toBe('now');
  });
});

describe('formatUtcTime', () => {
  it('formats the time of day in UTC', () => {
    expect(formatUtcTime(0)).toBe('00:00:00 UTC');
  });
});

describe('escapeHtml', () => {
  it('escapes Telegram HTML special characters', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
  });
});
