import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '../api/errors';
import {
  buildUrl,
  computeBackoffDelayMs,
  requestJson,
  type FetchFunction,
  type SleepFunction,
} from '../api/request';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function createSleepMock(): ReturnType<typeof vi.fn<SleepFunction>> {
  return vi.fn<SleepFunction>().mockResolvedValue(undefined);
}

const baseOptions = { baseUrl: 'https://api.test', path: '/resource', baseDelayMs: 500 };

describe('buildUrl', () => {
  it('joins the base url, path and query', () => {
    expect(buildUrl('https://api.test/', '/v2/rates', { tokens: 'a,b', limit: 20 })).toBe(
      'https://api.test/v2/rates?tokens=a%2Cb&limit=20',
    );
  });
});

describe('computeBackoffDelayMs', () => {
  it('doubles the delay on every attempt', () => {
    expect(computeBackoffDelayMs(0, 500, null)).toBe(500);
    expect(computeBackoffDelayMs(2, 500, null)).toBe(2000);
  });

  it('honors Retry-After and caps the delay', () => {
    expect(computeBackoffDelayMs(0, 500, 3)).toBe(3000);
    expect(computeBackoffDelayMs(10, 500, 120)).toBe(15000);
  });
});

describe('requestJson', () => {
  it('returns the parsed body and forwards headers', async () => {
    const fetchFn = vi.fn<FetchFunction>().mockResolvedValue(jsonResponse({ ok: true }));
    const result = await requestJson<{ ok: boolean }>({
      ...baseOptions,
      query: { limit: 1 },
      headers: { Authorization: 'Bearer key' },
      fetchFn,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://api.test/resource?limit=1');
    expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer key' } });
  });

  it('maps 404 to NotFoundError', async () => {
    const fetchFn = vi.fn<FetchFunction>().mockResolvedValue(new Response(null, { status: 404 }));
    await expect(requestJson({ ...baseOptions, fetchFn })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps other failures to ApiError with the status code', async () => {
    const fetchFn = vi.fn<FetchFunction>().mockResolvedValue(new Response(null, { status: 500 }));
    const failure = requestJson({ ...baseOptions, fetchFn });
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 500 });
  });

  it('retries after 429 and honors Retry-After', async () => {
    const fetchFn = vi
      .fn<FetchFunction>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const sleep = createSleepMock();
    const result = await requestJson<{ ok: boolean }>({ ...baseOptions, fetchFn, sleep });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('gives up with RateLimitError after exhausting retries', async () => {
    const fetchFn = vi
      .fn<FetchFunction>()
      .mockImplementation(() => Promise.resolve(new Response(null, { status: 429 })));
    const sleep = createSleepMock();
    const failure = requestJson({ ...baseOptions, fetchFn, sleep, maxRetries: 2 });
    await expect(failure).rejects.toBeInstanceOf(RateLimitError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([500, 1000]);
  });

  it('wraps network failures in NetworkError', async () => {
    const fetchFn = vi.fn<FetchFunction>().mockRejectedValue(new TypeError('offline'));
    await expect(requestJson({ ...baseOptions, fetchFn })).rejects.toBeInstanceOf(NetworkError);
  });

  it('reports malformed JSON as InvalidResponseError', async () => {
    const fetchFn = vi
      .fn<FetchFunction>()
      .mockResolvedValue(new Response('not json', { status: 200 }));
    await expect(requestJson({ ...baseOptions, fetchFn })).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });
});
