export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUDGET_EXCEEDED"
  | "INVALID_STATUS"
  | "DUPLICATE_TRANSACTION"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status ?? statusFor(code);
    this.details = details;
  }
}

function statusFor(code: ErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "BUDGET_EXCEEDED":
      return 422;
    case "INVALID_STATUS":
      return 422;
    case "DUPLICATE_TRANSACTION":
      return 409;
    default:
      return 500;
  }
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(code: ErrorCode, message: string, details?: unknown): ActionResult<never> {
  return { success: false, error: { code, message, details } };
}

export function toResult<T>(fn: () => Promise<T>, fallback = "Something went wrong."): Promise<ActionResult<T>> {
  return fn()
    .then((data) => ok(data))
    .catch((e) => {
      if (e instanceof AppError) return fail(e.code, e.message, e.details);
      console.error(e);
      return fail("INTERNAL_ERROR", fallback);
    });
}
