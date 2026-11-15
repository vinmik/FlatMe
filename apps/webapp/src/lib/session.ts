import { UserSchema, type User } from "@flatme/shared";
import { create } from "zustand";

const KEY = "flatme.web.session.v1";

interface SessionState {
  /** False until the saved session has been read in the browser (always false on the server). */
  ready: boolean;
  token: string | null;
  user: User | null;
  hydrate: () => void;
  signIn: (token: string, user: User) => void;
  setUser: (user: User) => void;
  signOut: () => void;
}

function persist(token: string | null, user: User | null) {
  try {
    if (token && user) localStorage.setItem(KEY, JSON.stringify({ token, user }));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private window): the session lasts until the tab closes.
  }
}

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  user: null,
  hydrate() {
    if (get().ready) return;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { token?: string; user?: unknown } | null;
      const user = UserSchema.safeParse(saved?.user);
      if (saved?.token && user.success) return set({ ready: true, token: saved.token, user: user.data });
    } catch {
      // Unreadable storage: start signed out.
    }
    set({ ready: true });
  },
  signIn(token, user) {
    set({ ready: true, token, user });
    persist(token, user);
  },
  setUser(user) {
    set({ user });
    persist(get().token, user);
  },
  signOut() {
    set({ token: null, user: null });
    persist(null, null);
  },
}));
