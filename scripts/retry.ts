/**
 * Retry helpers for remote libSQL/Turso calls.
 *
 * A remote database over HTTPS adds a network round-trip to every query. On a
 * slow or congested link individual requests time out, which aborts otherwise
 * correct scripts part way through. These helpers retry transient failures
 * with exponential backoff so a blip does not fail the whole run.
 */

const RETRYABLE = [
  "fetch failed",
  "und_err_connect_timeout",
  "und_err_socket",
  "und_err_headers_timeout",
  "und_err_body_timeout",
  "econnreset",
  "etimedout",
  "epipe",
  "eai_again",
  "socket hang up",
  "connection closed",
  "server closed",
  "timed out",
  "too many requests",
  "service unavailable",
];

function messages(error: unknown): string[] {
  const out: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 6) {
    const e = current as { message?: unknown; code?: unknown; cause?: unknown };
    if (typeof e.message === "string") out.push(e.message);
    if (typeof e.code === "string") out.push(e.code);
    // Prisma and undici wrap the real cause, so follow the chain.
    current = e.cause;
    depth++;
  }
  return out;
}

/**
 * True only for transport-level failures. Deliberately conservative: a
 * constraint violation or validation error will never succeed on a retry, and
 * retrying it would just delay the real error.
 */
export function isRetryable(error: unknown): boolean {
  const text = messages(error).join(" | ").toLowerCase();
  if (!text) return false;
  return RETRYABLE.some((needle) => text.includes(needle));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

export async function withRetry<T>(
  run: () => Promise<T>,
  { attempts = 6, baseDelayMs = 400, maxDelayMs = 8000, onRetry }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (e) {
      lastError = e;
      if (attempt === attempts || !isRetryable(e)) throw e;
      // Exponential backoff with jitter, so concurrent retries do not resend
      // in lockstep and re-trigger the congestion that caused the failure.
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const wait = Math.round(delay * (0.5 + Math.random()));
      onRetry?.(e, attempt, wait);
      await sleep(wait);
    }
  }
  throw lastError;
}

/**
 * Wraps Prisma model delegate methods in retry logic.
 *
 * Prisma exposes delegates as plain objects (`prisma.user.upsert`), not
 * top-level functions, so the wrapper has to descend into them; wrapping only
 * the root would silently retry nothing.
 *
 * Only safe for scripts whose writes are idempotent (the seed upserts on every
 * call), since a request can fail after Turso has already applied it. Runtime
 * application requests are deliberately not wrapped this way.
 *
 * `$`-prefixed members are passed through untouched: `$transaction`,
 * `$connect` and `$disconnect` manage Prisma's own lifecycle and replaying
 * them mid-transaction is not safe.
 */
export function withRetries<T extends object>(client: T, options: RetryOptions = {}): T {
  // Cache so repeated access returns the same wrapper rather than a new one,
  // keeping identity stable (`wrapped.user === wrapped.user`).
  const cache = new WeakMap<object, object>();

  const handler: ProxyHandler<object> = {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);

      if (typeof value === "function") {
        // `then` must never be wrapped, or the proxy would look like a thenable
        // to `await` and change how the object behaves.
        if (prop === "then") return value;
        if (typeof prop === "string" && prop.startsWith("$")) {
          return (value as (...a: unknown[]) => unknown).bind(target);
        }
        return (...args: unknown[]) =>
          withRetry(() => Promise.resolve((value as (...a: unknown[]) => unknown).apply(target, args)), options);
      }

      // Descend only into plain objects. This reaches Prisma model delegates
      // while leaving Date, Buffer and Decimal results untouched, so value
      // identity and instanceof still behave normally.
      if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        const cached = cache.get(value);
        if (cached) return cached;
        const proxy = new Proxy(value, handler);
        cache.set(value, proxy);
        return proxy;
      }

      return value;
    },
  };

  return new Proxy(client, handler) as T;
}
