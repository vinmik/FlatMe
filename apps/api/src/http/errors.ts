import type { ZodError } from "zod";
import { DomainError, RateLimitedError, ValidationError } from "../domain/errors";
import type { Logger } from "../ports";
import { errorResult, type ApiResult } from "./responses";

/** Flattens Zod issues into `{ "path.to.field": "first message" }`. */
export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

function isZodError(err: unknown): err is ZodError {
  return err instanceof Error && err.name === "ZodError" && Array.isArray((err as ZodError).issues);
}

/** Maps any thrown value to an ApiErrorSchema response. Unknown errors never leak details. */
export function mapError(err: unknown, log: Logger, correlationId: string): ApiResult {
  if (isZodError(err)) {
    return errorResult(
      { error: { code: "validation_failed", message: "Please check the highlighted fields", fields: zodFields(err) } },
      400,
    );
  }
  if (err instanceof DomainError) {
    if (err.status >= 500) log.error(`[${correlationId}] ${err.name}: ${err.message}`);
    return errorResult(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err instanceof ValidationError && Object.keys(err.fields).length ? { fields: err.fields } : {}),
          ...(err instanceof RateLimitedError ? { retryAfterSec: err.retryAfterSec } : {}),
        },
      },
      err.status,
    );
  }
  const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);
  log.error(`[${correlationId}] Unhandled error: ${detail}`);
  return errorResult(
    { error: { code: "internal", message: `Something went wrong. Reference: ${correlationId}` } },
    500,
  );
}
