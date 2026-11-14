import type { ErrorCode } from "@flatme/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "network",
    message: string,
    readonly fields?: Record<string, string>,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuthError() {
    return this.status === 401;
  }
}

/** Human-friendly message for any thrown value — used by toasts and inline errors. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    if (err.code === "network") return "You appear to be offline. Check your connection and try again.";
    return err.message || fallback;
  }
  return fallback;
}
