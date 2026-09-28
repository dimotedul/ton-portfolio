import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../services/ttlCache';

describe('TtlCache', () => {
  it('returns cached values until they expire', () => {
    let currentTime = 0;
    const cache = new TtlCache<string>(1000, 10, () => currentTime);
    cache.set('key', 'value');
    currentTime = 999;
    expect(cache.get('key')).toBe('value');
    currentTime = 1000;
    expect(cache.get('key')).toBeUndefined();
  });

  it('evicts the oldest entry when full', () => {
    const cache = new TtlCache<number>(1000, 2, () => 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('loads once and bypasses the cache on force refresh', async () => {
    const cache = new TtlCache<number>(1000, 10, () => 0);
    const loader = vi.fn(() => Promise.resolve(42));
    await cache.getOrLoad('key', loader);
    await cache.getOrLoad('key', loader);
    expect(loader).toHaveBeenCalledTimes(1);
    await cache.getOrLoad('key', loader, true);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
