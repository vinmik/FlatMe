export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface UploadUrlGrant {
  uploadUrl: string;
  blobUrl: string;
}

export interface BlobUploadUrlSigner {
  /** Public base URL of the photos container, e.g. https://acct.blob.core.windows.net/listing-photos */
  readonly containerUrl: string;
  createUploadUrl(blobName: string, expiresOn: Date): Promise<UploadUrlGrant>;
}

export interface Clock {
  now(): Date;
}

export interface IssuedToken {
  token: string;
  expiresAt: string;
}

export interface TokenClaims {
  userId: string;
  email: string;
  /** Informational only — authorization always re-checks the stored user document. */
  role: "user" | "admin";
}

export interface TokenService {
  issue(claims: TokenClaims): Promise<IssuedToken>;
  /** Throws UnauthorizedError when the token is missing, malformed, expired or forged. */
  verify(token: string): Promise<TokenClaims>;
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
