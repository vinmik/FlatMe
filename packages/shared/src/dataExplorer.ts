/**
 * Pure Data Explorer helpers shared by the API (validation + in-memory store) and the admin
 * portal's mock backend, so both enforce exactly the same rules.
 */

import type { DataContainer } from "./admin";

/** Cosmos-managed properties: never written back and stripped before a replace. */
export const DATA_SYSTEM_PROPS = ["_rid", "_self", "_etag", "_attachments", "_ts"] as const;

export function stripSystemProps(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) if (!(DATA_SYSTEM_PROPS as readonly string[]).includes(k)) out[k] = v;
  return out;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a dotted (`a.b`) or Cosmos-style (`/a/b`) path. */
export function readPath(doc: unknown, path: string): unknown {
  const parts = path.startsWith("/") ? path.slice(1).split("/") : path.split(".");
  let cur: unknown = doc;
  for (const p of parts) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Removes `-- line` and block comments (used for validation only; the original text is executed). */
export function stripSqlComments(query: string): string {
  return query.replace(/\/\*[\s\S]*?(\*\/|$)/g, " ").replace(/--[^\n\r]*/g, " ");
}

/**
 * Read-only guard for ad-hoc queries. Returns a user-facing error message, or null when the
 * query is a single SELECT statement.
 */
export function validateReadOnlyQuery(query: string): string | null {
  if (!query.trim()) return "Enter a query.";
  if (query.includes(";")) return "Only a single statement is allowed — remove the ';'.";
  const body = stripSqlComments(query).trim();
  if (!/^SELECT\b/i.test(body)) return "Only read-only SELECT queries are allowed.";
  return null;
}

export type SimpleLiteral = string | number | boolean | null;

export interface SimpleSelect {
  where: { path: string; value: SimpleLiteral }[];
}

function parseLiteral(raw: string): { ok: true; value: SimpleLiteral } | { ok: false } {
  const s = raw.trim();
  const quoted = /^'((?:[^'\\]|\\.)*)'$/.exec(s) ?? /^"((?:[^"\\]|\\.)*)"$/.exec(s);
  if (quoted) return { ok: true, value: quoted[1]!.replace(/\\(.)/g, "$1") };
  if (/^-?\d+(\.\d+)?$/.test(s)) return { ok: true, value: Number(s) };
  if (/^(true|false)$/i.test(s)) return { ok: true, value: s.toLowerCase() === "true" };
  if (/^null$/i.test(s)) return { ok: true, value: null };
  return { ok: false };
}

/**
 * Parses the tiny SQL subset supported by in-memory stores:
 * `SELECT * FROM <alias> [WHERE <alias>.<path> = <literal> [AND …]]`.
 * Returns null for anything else (the caller reports it as unsupported).
 */
export function parseSimpleSelect(query: string): SimpleSelect | null {
  const m = /^\s*SELECT\s+\*\s+FROM\s+([A-Za-z_]\w*)(?:\s+WHERE\s+([\s\S]+?))?\s*$/i.exec(stripSqlComments(query));
  if (!m) return null;
  const alias = m[1]!;
  if (!m[2]) return { where: [] };
  const where: SimpleSelect["where"] = [];
  for (const clause of m[2].split(/\s+AND\s+/i)) {
    const c = /^\s*([A-Za-z_]\w*)\.([A-Za-z_][\w.]*)\s*=\s*([\s\S]+)$/.exec(clause);
    if (!c || c[1] !== alias) return null;
    const lit = parseLiteral(c[3]!);
    if (!lit.ok) return null;
    where.push({ path: c[2]!, value: lit.value });
  }
  return { where };
}

export function matchesSimpleSelect(doc: unknown, q: SimpleSelect): boolean {
  return q.where.every((w) => readPath(doc, w.path) === w.value);
}

/** Browse filter semantics: `eq` compares the string form; `contains` is case-insensitive. */
export function matchesBrowseFilter(doc: unknown, f: { field: string; op: "eq" | "contains"; value: string }): boolean {
  const v = readPath(doc, f.field);
  if (v === undefined) return false;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return f.op === "eq" ? s === f.value : s.toLowerCase().includes(f.value.toLowerCase());
}

/**
 * Containers the admin Data Explorer may touch — the allowlist. Mirrors infra/modules/cosmos.bicep
 * (names and partition key paths); container names from requests are only ever matched against this.
 * The audit log is read-only so explorer writes can't rewrite history.
 */
export const DATA_CONTAINERS: readonly DataContainer[] = Object.freeze([
  { name: "users", partitionKeyPath: "/id", writable: true },
  { name: "listings", partitionKeyPath: "/id", writable: true },
  { name: "otps", partitionKeyPath: "/email", writable: true },
  { name: "inquiries", partitionKeyPath: "/listingId", writable: true },
  { name: "reports", partitionKeyPath: "/listingId", writable: true },
  { name: "audit", partitionKeyPath: "/id", writable: false },
]);
