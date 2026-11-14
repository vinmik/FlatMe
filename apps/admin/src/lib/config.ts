export const MOCK_BASE_URL = "https://mock.flatme.local/api";

export interface AppConfig {
  apiBaseUrl: string;
  useMocks: boolean;
  /**
   * Temporary "no auth" mode (VITE_ADMIN_AUTH_DISABLED=true): no login screen, no bearer token and
   * no automatic sign-out. Pairs with the API's ADMIN_AUTH_DISABLED=true. The auth code stays intact.
   */
  authDisabled: boolean;
}

export interface EnvLike {
  VITE_API_BASE_URL?: string;
  VITE_USE_MOCKS?: string;
  VITE_ADMIN_AUTH_DISABLED?: string;
}

const isTrue = (v: string | undefined) => v?.trim().toLowerCase() === "true";

export function resolveConfig(env: EnvLike): AppConfig {
  const base = env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
  // Mocks are on when explicitly requested, or when there is no API to talk to.
  const useMocks = isTrue(env.VITE_USE_MOCKS) || base === "";
  return { apiBaseUrl: useMocks ? MOCK_BASE_URL : base, useMocks, authDisabled: isTrue(env.VITE_ADMIN_AUTH_DISABLED) };
}

export const config: AppConfig = resolveConfig(import.meta.env);