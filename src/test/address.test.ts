import { describe, expect, it } from 'vitest';
import { parseTonAddress, shortenAddress, toRawAddress } from '../lib/address';
import { addRecentAddress } from '../lib/recent';
import { OWNER_ADDRESS, OWNER_FRIENDLY, OWNER_RAW } from './fixtures';

describe('parseTonAddress', () => {
  it('accepts a bounceable user-friendly address', () => {
    const parsed = parseTonAddress(OWNER_FRIENDLY);
    expect(parsed?.raw).toBe(OWNER_RAW);
    expect(parsed?.friendly.startsWith('UQ')).toBe(true);
  });

  it('accepts a non-bounceable user-friendly address', () => {
    const nonBounceable = OWNER_ADDRESS.toString({ bounceable: false });
    expect(parseTonAddress(nonBounceable)?.raw).toBe(OWNER_RAW);
  });

  it('accepts a raw address and trims whitespace', () => {
    expect(parseTonAddress(`  ${OWNER_RAW}  `)?.raw).toBe(OWNER_RAW);
  });

  it('accepts a raw masterchain address', () => {
    const masterchainAddress = `-1:${'ab'.repeat(32)}`;
    expect(parseTonAddress(masterchainAddress)?.raw).toBe(masterchainAddress);
  });

  it('rejects empty input', () => {
    expect(parseTonAddress('   ')).toBeNull();
  });

  it('rejects arbitrary text', () => {
    expect(parseTonAddress('not-an-address')).toBeNull();
  });

  it('rejects a friendly address with a broken checksum', () => {
    const lastCharacter = OWNER_FRIENDLY.slice(-1);
    const corrupted = `${OWNER_FRIENDLY.slice(0, -1)}${lastCharacter === 'A' ? 'B' : 'A'}`;
    expect(parseTonAddress(corrupted)).toBeNull();
  });

  it('rejects a raw address with the wrong length', () => {
    expect(parseTonAddress('0:abc')).toBeNull();
  });
});

describe('toRawAddress', () => {
  it('normalizes friendly addresses and falls back to lowercase for unknown input', () => {
    expect(toRawAddress(OWNER_FRIENDLY)).toBe(OWNER_RAW);
    expect(toRawAddress('ABC')).toBe('abc');
  });
});

describe('shortenAddress', () => {
  it('keeps the edges of long addresses', () => {
    expect(shortenAddress('UQABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('UQAB…WXYZ');
  });

  it('keeps short input unchanged', () => {
    expect(shortenAddress('UQAB')).toBe('UQAB');
  });
});

describe('addRecentAddress', () => {
  it('moves an existing address to the front without duplicates', () => {
    expect(addRecentAddress(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('limits the list to five entries', () => {
    expect(addRecentAddress(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });
});
