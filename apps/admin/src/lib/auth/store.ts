import { UserSchema, type User } from "@flatme/shared";
import { useSyncExternalStore } from "react";

const TOKEN_KEY = "flatme.admin.token";
const USER_KEY = "flatme.admin.user";

export type SignOutReason = "manual" | "expired" | "forbidden";

export interface AuthState {
  token: string | null;
  user: User | null;
  /** Why the last session ended; lets the login screen explain an automatic sign-out. */
  signOutReason: SignOutReason | null;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function load(): AuthState {
  const s = storage();
  const token = s?.getItem(TOKEN_KEY) ?? null;
  let user: User | null = null;
  try {
    const raw = s?.getItem(USER_KEY);
    const parsed = raw ? UserSchema.safeParse(JSON.parse(raw)) : null;
    user = parsed?.success ? parsed.data : null;
  } catch {
    user = null;
  }
  // Only trust a stored session that belongs to an admin.
  if (!token || !user || user.role !== "admin") return { token: null, user: null, signOutReason: null };
  return { token, user, signOutReason: null };
}

let state: AuthState = load();
const listeners = new Set<() => void>();

function emit(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

export const authStore = {
  getState: () => state,
  getToken: () => state.token,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  signIn(token: string, user: User) {
    const s = storage();
    s?.setItem(TOKEN_KEY, token);
    s?.setItem(USER_KEY, JSON.stringify(user));
    emit({ token, user, signOutReason: null });
  },
  updateUser(user: User) {
    if (!state.token) return;
    storage()?.setItem(USER_KEY, JSON.stringify(user));
    emit({ ...state, user });
  },
  signOut(reason: SignOutReason = "manual") {
    const s = storage();
    s?.removeItem(TOKEN_KEY);
    s?.removeItem(USER_KEY);
    if (!state.token && state.signOutReason === reason) return;
    emit({ token: null, user: null, signOutReason: reason });
  },
  clearReason() {
    if (state.signOutReason) emit({ ...state, signOutReason: null });
  },
};

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);
}
