import type { HttpRequest } from "@azure/functions";
import type { z } from "zod";
import { BadRequestError, ValidationError } from "../domain/errors";
import { zodFields } from "./errors";

export const MAX_BODY_BYTES = 64 * 1024;

export function validate<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError("Please check the highlighted fields", zodFields(result.error));
  return result.data;
}

/** Reads a JSON body with a size guard. An empty body is treated as `{}`. */
export async function readJson(req: HttpRequest): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new BadRequestError("Request body is too large", 413);
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) throw new BadRequestError("Request body is too large", 413);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}

export async function parseBody<S extends z.ZodType>(req: HttpRequest, schema: S): Promise<z.output<S>> {
  return validate(schema, await readJson(req));
}

/** Parses query-string params; repeated keys keep the last value (lists are comma-separated). */
export function parseQuery<S extends z.ZodType>(req: HttpRequest, schema: S): z.output<S> {
  const raw: Record<string, string> = {};
  for (const [k, v] of req.query.entries()) if (v !== "") raw[k] = v;
  return validate(schema, raw);
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function routeParam(req: HttpRequest, name: string): string {
  const value = req.params[name];
  if (!value || !ID_RE.test(value)) throw new BadRequestError(`Invalid ${name}`);
  return value;
}

/** Cosmos ids may contain most characters (e.g. emails) but never `/`, `\`, `?` or `#`. */
const DOC_ID_RE = /^[^/\\?#\u0000-\u001f]{1,255}$/;

export function documentIdParam(req: HttpRequest, name = "id"): string {
  const value = req.params[name];
  if (!value || !DOC_ID_RE.test(value)) throw new BadRequestError(`Invalid ${name}`);
  return value;
}
