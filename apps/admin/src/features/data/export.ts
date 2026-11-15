/** Pure export helpers for Data Explorer results (the page handles the actual download). */

export function toJsonExport(items: readonly unknown[]): string {
  return `${JSON.stringify(items, null, 2)}\n`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Columns in first-seen order across all rows; non-object rows (scalar query results) go in a `value` column. */
export function csvColumns(items: readonly unknown[]): string[] {
  const cols = new Set<string>();
  for (const item of items) {
    if (isRecord(item)) for (const k of Object.keys(item)) cols.add(k);
    else cols.add("value");
  }
  return [...cols];
}

function cellText(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") {
    // Neutralise spreadsheet formula injection (=, +, -, @, tab, CR at the start of text cells).
    return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  }
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  return JSON.stringify(v);
}

export function csvEscape(text: string): string {
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV: top-level fields flattened, nested objects/arrays JSON-stringified, CRLF line endings. */
export function toCsvExport(items: readonly unknown[]): string {
  const cols = csvColumns(items);
  if (cols.length === 0) return "";
  const rows = items.map((item) =>
    cols.map((c) => csvEscape(cellText(isRecord(item) ? item[c] : c === "value" ? item : undefined))).join(","),
  );
  return `${[cols.map(csvEscape).join(","), ...rows].join("\r\n")}\r\n`;
}
