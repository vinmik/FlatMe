import { ValidationError } from "../domain/errors";

/**
 * Only URLs that point into our photos container are accepted for user-supplied images,
 * so listings can't hot-link arbitrary (tracking / malicious) content.
 */
export class PhotoUrlPolicy {
  private readonly prefix: string;

  constructor(containerUrl: string) {
    this.prefix = `${containerUrl.replace(/\/+$/, "")}/`;
  }

  isAllowed(url: string): boolean {
    if (!url.startsWith(this.prefix)) return false;
    const rest = url.slice(this.prefix.length);
    return rest.length > 0 && !rest.includes("..") && !/[?#\\]/.test(rest);
  }

  /** `grandfathered` URLs (already stored on the entity, e.g. seed photos) remain valid on edit. */
  assertAllowed(urls: readonly string[], field: string, grandfathered: readonly string[] = []): void {
    const fields: Record<string, string> = {};
    urls.forEach((u, i) => {
      if (!this.isAllowed(u) && !grandfathered.includes(u)) fields[`${field}.${i}`] = "Upload photos through the app";
    });
    if (Object.keys(fields).length > 0) throw new ValidationError("Some photos weren't uploaded through FlatMe", fields);
  }
}
