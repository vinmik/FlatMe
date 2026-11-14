import { authStore } from "../auth/store";
import { config } from "../config";
import { createApiClient } from "./client";
import { createEndpoints } from "./endpoints";

export { ApiError, errorMessage, isApiError } from "./client";

/** In mock mode the mock backend is code-split so it never ships in the real bundle's main chunk. */
const mockFetch: typeof fetch = async (input, init) => {
  const { mockFetch: impl } = await import("../mock/server");
  return impl(input, init);
};

export const apiClient = createApiClient({
  baseUrl: config.apiBaseUrl,
  ...(config.useMocks ? { fetch: mockFetch } : {}),
  // With auth disabled no token is sent and 401/403s surface as ordinary errors (toast / error state).
  ...(config.authDisabled
    ? {}
    : {
        getToken: authStore.getToken,
        onAuthFailure: (e) => authStore.signOut(e.status === 401 ? "expired" : "forbidden"),
      }),
});

export const api = createEndpoints(apiClient);