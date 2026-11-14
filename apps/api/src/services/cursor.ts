import { BadRequestError } from "../domain/errors";

/**
 * Pagination cursors are opaque, offset-based tokens (base64url JSON `{ "o": <offset> }`).
 * Offsets keep the Cosmos and in-memory adapters trivially consistent and are fine at MVP
 * scale; clients must treat the value as opaque so we can switch to continuation tokens later.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const o = (parsed as { o?: unknown }).o;
    if (typeof o === "number" && Number.isInteger(o) && o >= 0 && o <= 100_000) return o;
  } catch {
    /* fall through */
  }
  throw new BadRequestError("Invalid cursor");
}

export function nextCursor(offset: number, pageSize: number, total: number): string | null {
  return offset + pageSize < total ? encodeCursor(offset + pageSize) : null;
}
