import {
  ApiError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors';

export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;
export type SleepFunction = (milliseconds: number) => Promise<void>;

export interface RequestDependencies {
  fetchFn?: FetchFunction;
  sleep?: SleepFunction;
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

export interface RequestOptions extends RequestDependencies {
  baseUrl: string;
  path: string;
  query?: Readonly<Record<string, string | number | boolean>>;
  headers?: Readonly<Record<string, string>>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_DELAY_MS = 15000;

const defaultFetch: FetchFunction = (input, init) => fetch(input, init);

const defaultSleep: SleepFunction = (milliseconds) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export function buildUrl(
  baseUrl: string,
  path: string,
  query: Readonly<Record<string, string | number | boolean>> = {},
): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, String(value));
  }
  return url.toString();
}

export function computeBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  retryAfterSeconds: number | null,
): number {
  const exponentialDelay = baseDelayMs * 2 ** attempt;
  const requestedDelay =
    retryAfterSeconds === null
      ? exponentialDelay
      : Math.max(exponentialDelay, retryAfterSeconds * 1000);
  return Math.min(requestedDelay, MAX_DELAY_MS);
}

function parseRetryAfterSeconds(headerValue: string | null): number | null {
  if (headerValue === null) {
    return null;
  }
  const seconds = Number(headerValue);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export async function requestJson<T>(options: RequestOptions): Promise<T> {
  const fetchFn = options.fetchFn ?? defaultFetch;
  const sleep = options.sleep ?? defaultSleep;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = buildUrl(options.baseUrl, options.path, options.query);

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: options.headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));
      if (attempt >= maxRetries) {
        throw new RateLimitError(retryAfterSeconds);
      }
      await sleep(computeBackoffDelayMs(attempt, baseDelayMs, retryAfterSeconds));
      continue;
    }

    if (response.status === 404) {
      throw new NotFoundError();
    }

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new InvalidResponseError(cause);
    }
  }
}
