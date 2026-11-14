import type { ErrorCode } from "@flatme/shared";

/**
 * Base class for expected, client-facing failures. Anything that is not a DomainError
 * is treated as an internal error by the HTTP layer and never leaks details.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends DomainError {
  readonly code = "bad_request" as const;
  constructor(
    message = "Bad request",
    readonly status = 400,
  ) {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation_failed" as const;
  readonly status = 400;
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "unauthorized" as const;
  readonly status = 401;
  constructor(message = "Please sign in to continue") {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden" as const;
  readonly status = 403;
  constructor(message = "You don't have permission to do that") {
    super(message);
  }
}

/** Suspended accounts: 403 with code "forbidden" (pinned contract) and an explanatory message. */
export class AccountSuspendedError extends DomainError {
  readonly code = "forbidden" as const;
  readonly status = 403;
  constructor(message = "Your account has been suspended. Contact support@flatme.app if you think this is a mistake.") {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found" as const;
  readonly status = 404;
  constructor(message = "Not found") {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = "conflict" as const;
  readonly status = 409;
}

export class RateLimitedError extends DomainError {
  readonly code = "rate_limited" as const;
  readonly status = 429;
  constructor(
    message: string,
    readonly retryAfterSec: number,
  ) {
    super(message);
  }
}

export class OtpInvalidError extends DomainError {
  readonly code = "otp_invalid" as const;
  readonly status = 400;
}

export class OtpExpiredError extends DomainError {
  readonly code = "otp_expired" as const;
  readonly status = 400;
  constructor(message = "This code has expired. Please request a new one.") {
    super(message);
  }
}

export class PersonalEmailError extends DomainError {
  readonly code = "personal_email" as const;
  readonly status = 400;
  constructor(message = "Please use your work email — personal mailboxes aren't allowed") {
    super(message);
  }
}
