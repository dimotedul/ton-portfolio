export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
    this.status = status;
  }
}

export class RateLimitError extends ApiError {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super('Rate limit exceeded', 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotFoundError extends ApiError {
  constructor() {
    super('Resource not found', 404);
  }
}

export class NetworkError extends ApiError {
  constructor(cause: unknown) {
    super('Network request failed', null, cause);
  }
}

export class InvalidResponseError extends ApiError {
  constructor(cause?: unknown) {
    super('Unexpected response format', null, cause);
  }
}
