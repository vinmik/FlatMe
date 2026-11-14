import { config } from "@/lib/config";
import { useSession } from "@/store/session";
import { createHttpApi } from "./http";
import { createMockApi } from "./mock";
import type { FlatMeApi } from "./types";

const getToken = () => useSession.getState().token;

export const api: FlatMeApi = config.useMockApi
  ? createMockApi(getToken)
  : createHttpApi({
      baseUrl: config.apiUrl,
      getToken,
      onUnauthorized: () => void useSession.getState().signOut(),
    });

export { ApiError, errorMessage } from "./errors";
export type { FlatMeApi } from "./types";
