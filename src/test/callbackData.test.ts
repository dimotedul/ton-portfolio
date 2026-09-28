import { describe, expect, it } from 'vitest';
import { decodeCallback, encodeCallback } from '../bot/callbackData';
import { parseTonAddress } from '../lib/address';
import { OWNER_FRIENDLY } from './fixtures';

describe('callback data', () => {
  const friendly = parseTonAddress(OWNER_FRIENDLY)?.friendly ?? '';

  it('round-trips every action', () => {
    expect(decodeCallback(encodeCallback('refreshPortfolio', friendly))).toEqual({
      action: 'refreshPortfolio',
      address: friendly,
    });
    expect(decodeCallback(encodeCallback('history', friendly))?.action).toBe('history');
  });

  it('fits into the 64 byte Telegram limit', () => {
    expect(Buffer.byteLength(encodeCallback('refreshHistory', friendly))).toBeLessThanOrEqual(64);
  });

  it('rejects unknown prefixes and invalid addresses', () => {
    expect(decodeCallback(`zz:${friendly}`)).toBeNull();
    expect(decodeCallback('pf:not-an-address')).toBeNull();
    expect(decodeCallback('pf')).toBeNull();
  });
});
