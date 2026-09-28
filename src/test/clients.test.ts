import { describe, expect, it, vi } from 'vitest';
import { createCoinGeckoClient } from '../api/coingecko';
import { InvalidResponseError } from '../api/errors';
import type { FetchFunction } from '../api/request';
import { createTonApiClient } from '../api/tonapi';

function jsonFetch(body: unknown): ReturnType<typeof vi.fn<FetchFunction>> {
  return vi
    .fn<FetchFunction>()
    .mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
}

describe('createTonApiClient', () => {
  it('sends the bearer token and requests the account endpoint', async () => {
    const fetchFn = jsonFetch({ address: 'x', balance: 5, status: 'active' });
    const client = createTonApiClient(
      { baseUrl: 'https://tonapi.test', apiKey: 'secret' },
      { fetchFn },
    );
    const account = await client.getAccount('UQabc');
    expect(account.balance).toBe(5);
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://tonapi.test/v2/accounts/UQabc');
    expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer secret' } });
  });

  it('works without an API key', async () => {
    const fetchFn = jsonFetch({ balances: [] });
    const client = createTonApiClient({ baseUrl: 'https://tonapi.test', apiKey: null }, { fetchFn });
    await expect(client.getJettonBalances('UQabc')).resolves.toEqual([]);
    expect(fetchFn.mock.calls[0]?.[1]).not.toMatchObject({
      headers: { Authorization: expect.any(String) as string },
    });
  });

  it('requests events with the given limit and unwraps them', async () => {
    const fetchFn = jsonFetch({ events: [] });
    const client = createTonApiClient({ baseUrl: 'https://tonapi.test', apiKey: null }, { fetchFn });
    await expect(client.getEvents('UQabc', 20)).resolves.toEqual([]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://tonapi.test/v2/accounts/UQabc/events?limit=20');
  });

  it('splits rate requests into chunks of one hundred tokens', async () => {
    const fetchFn = jsonFetch({ rates: {} });
    const client = createTonApiClient({ baseUrl: 'https://tonapi.test', apiKey: null }, { fetchFn });
    const tokens = Array.from({ length: 150 }, (_, index) => `0:${index.toString(16).padStart(64, '0')}`);
    await client.getJettonRates(tokens);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('skips the network for an empty token list', async () => {
    const fetchFn = jsonFetch({ rates: {} });
    const client = createTonApiClient({ baseUrl: 'https://tonapi.test', apiKey: null }, { fetchFn });
    await expect(client.getJettonRates([])).resolves.toEqual({});
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('createCoinGeckoClient', () => {
  it('parses the TON price and 24h change', async () => {
    const fetchFn = jsonFetch({ 'the-open-network': { usd: 3.2, usd_24h_change: -1.5 } });
    const client = createCoinGeckoClient({ baseUrl: 'https://gecko.test' }, { fetchFn });
    await expect(client.getTonPrice()).resolves.toEqual({ usd: 3.2, change24hPercent: -1.5 });
  });

  it('treats a missing change as null', async () => {
    const fetchFn = jsonFetch({ 'the-open-network': { usd: 3.2 } });
    const client = createCoinGeckoClient({ baseUrl: 'https://gecko.test' }, { fetchFn });
    await expect(client.getTonPrice()).resolves.toEqual({ usd: 3.2, change24hPercent: null });
  });

  it('rejects responses without a price', async () => {
    const fetchFn = jsonFetch({});
    const client = createCoinGeckoClient({ baseUrl: 'https://gecko.test' }, { fetchFn });
    await expect(client.getTonPrice()).rejects.toBeInstanceOf(InvalidResponseError);
  });
});
