import { COMPANY_DOMAINS, FREE_EMAIL_DOMAINS } from "./constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string {
  return normalizeEmail(email).split("@")[1] ?? "";
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

/** A corporate email is a syntactically valid email that is not on a personal/disposable provider. */
export function isCorporateEmail(email: string): boolean {
  if (!isValidEmail(email)) return false;
  const domain = emailDomain(email);
  return !FREE_EMAIL_DOMAINS.has(domain);
}

/** Best-effort company detection from the email domain (e.g. "a@in.ibm.com" → "IBM"). */
export function companyFromEmail(email: string): string | undefined {
  const parts = emailDomain(email).split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    const hit = COMPANY_DOMAINS[candidate];
    if (hit) return hit;
  }
  return undefined;
}
