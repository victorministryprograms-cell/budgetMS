import { describe, it, expect } from "vitest";
import { isRetryable, withRetry, withRetries } from "./retry";

function transportError(message: string, code?: string) {
  const err = new Error(message) as Error & { code?: string; cause?: unknown };
  if (code) err.code = code;
  return err;
}

describe("isRetryable", () => {
  it("treats transport failures as retryable", () => {
    expect(isRetryable(transportError("fetch failed", "UND_ERR_CONNECT_TIMEOUT"))).toBe(true);
    expect(isRetryable(transportError("socket hang up", "ECONNRESET"))).toBe(true);
    expect(isRetryable(transportError("Timed out"))).toBe(true);
    expect(isRetryable(transportError("Service Unavailable"))).toBe(true);
  });

  it("finds the cause nested under Prisma and undici wrappers", () => {
    const inner = transportError("fetch failed", "UND_ERR_CONNECT_TIMEOUT");
    const middle = new Error("Internal libsql error") as Error & { cause?: unknown };
    middle.cause = inner;
    const outer = new Error("PrismaClientKnownRequestError") as Error & { cause?: unknown };
    outer.cause = middle;
    expect(isRetryable(outer)).toBe(true);
  });

  it("does not retry errors a retry cannot fix", () => {
    expect(isRetryable(new Error("Unique constraint failed on the fields: (`email`)"))).toBe(false);
    expect(isRetryable(new Error("Invalid `prisma.user.create()` invocation"))).toBe(false);
    expect(isRetryable(new Error("Argument `id` is missing"))).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });

  it("does not retry a non-transient message that merely mentions a timeout field", () => {
    expect(isRetryable(new Error("Validation error: timeoutMinutes must be greater than 0"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns the first success without delaying", async () => {
    const run = async () => "ok";
    await expect(withRetry(run, { baseDelayMs: 0 })).resolves.toBe("ok");
  });

  it("recovers from a transient failure without the caller retrying", async () => {
    let calls = 0;
    const run = async () => {
      calls++;
      if (calls < 3) throw transportError("fetch failed", "UND_ERR_CONNECT_TIMEOUT");
      return calls;
    };
    await expect(withRetry(run, { baseDelayMs: 0, maxDelayMs: 0 })).resolves.toBe(3);
  });

  it("gives up after exhausting attempts", async () => {
    let calls = 0;
    const run = async () => {
      calls++;
      throw transportError("socket hang up", "ECONNRESET");
    };
    await expect(withRetry(run, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow("socket hang up");
    expect(calls).toBe(3);
  });

  it("fails fast on a non-retryable error instead of burning every attempt", async () => {
    let calls = 0;
    const run = async () => {
      calls++;
      throw new Error("Unique constraint failed");
    };
    await expect(withRetry(run, { attempts: 5, baseDelayMs: 0 })).rejects.toThrow("Unique constraint failed");
    expect(calls).toBe(1);
  });

  it("reports each retry attempt and its backoff", async () => {
    const seen: number[] = [];
    let calls = 0;
    const run = async () => {
      calls++;
      if (calls < 3) throw transportError("fetch failed");
      return "ok";
    };
    await withRetry(run, {
      baseDelayMs: 0,
      maxDelayMs: 0,
      onRetry: (_error, attempt, delayMs) => seen.push(attempt + delayMs),
    });
    expect(seen).toHaveLength(2);
  });
});

describe("withRetries", () => {
  it("wraps nested model delegate methods, which is how Prisma exposes them", async () => {
    // Regression: a wrapper that only handled the root would retry nothing,
    // because prisma.user is an object and prisma.user.upsert is a function.
    let calls = 0;
    const client = {
      user: {
        async upsert() {
          calls++;
          if (calls < 2) throw transportError("fetch failed", "UND_ERR_CONNECT_TIMEOUT");
          return { id: "u1" };
        },
      },
    };
    const wrapped = withRetries(client, { baseDelayMs: 0, maxDelayMs: 0 });
    await expect(wrapped.user.upsert()).resolves.toEqual({ id: "u1" });
    expect(calls).toBe(2);
  });

  it("returns the same delegate wrapper on repeated access", () => {
    const client = { user: { upsert: async () => "x" } };
    const wrapped = withRetries(client);
    expect(wrapped.user).toBe(wrapped.user);
  });

  it("passes `$` lifecycle members through untouched", async () => {
    // Replaying $transaction mid-flight is not safe, so it must not be wrapped.
    let calls = 0;
    const client = {
      async $transaction() {
        calls++;
        throw transportError("fetch failed", "UND_ERR_CONNECT_TIMEOUT");
      },
    };
    const wrapped = withRetries(client, { attempts: 4, baseDelayMs: 0 });
    await expect(wrapped.$transaction()).rejects.toThrow("fetch failed");
    expect(calls).toBe(1);
  });

  it("does not make the client look like a thenable", () => {
    const client = { user: { findMany: async () => [] } };
    expect((withRetries(client) as { then?: unknown }).then).toBeUndefined();
  });

  it("leaves non-plain objects unwrapped so value identity holds", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const client = {
      user: {
        async findMany() {
          return [{ id: "u1", createdAt }];
        },
      },
    };
    const rows = await withRetries(client).user.findMany();
    // A proxied Date would break identity and could surprise callers comparing
    // timestamps, so results are passed through by reference.
    expect(rows[0].createdAt).toBe(createdAt);
    expect(rows[0].createdAt instanceof Date).toBe(true);
  });

  it("preserves non-function properties", () => {
    const client = { name: "prisma", $on: () => {}, user: {} };
    expect(withRetries(client).name).toBe("prisma");
  });
});
