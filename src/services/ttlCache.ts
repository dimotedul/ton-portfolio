interface CacheEntry<V> {
  value: V;
  expiresAtMs: number;
}

export class TtlCache<V> {
  private readonly entries = new Map<string, CacheEntry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAtMs <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAtMs: this.now() + this.ttlMs });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
  }

  async getOrLoad(key: string, loader: () => Promise<V>, forceRefresh = false): Promise<V> {
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }
    const value = await loader();
    this.set(key, value);
    return value;
  }
}
