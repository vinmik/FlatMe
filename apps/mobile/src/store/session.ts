import { UserSchema, type User } from "@flatme/shared";
import { create } from "zustand";
import { secureStorage } from "@/lib/storage";

const KEY = "flatme.session.v1";

type Status = "loading" | "signedOut" | "signedIn";

interface SessionState {
  status: Status;
  token: string | null;
  user: User | null;
  /** True once the user has seen the location-permission step (granted or skipped). */
  onboarded: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
}

const persist = (s: Pick<SessionState, "token" | "user" | "onboarded">) =>
  secureStorage.set(KEY, JSON.stringify({ token: s.token, user: s.user, onboarded: s.onboarded })).catch(() => {});

export const useSession = create<SessionState>((set, get) => ({
  status: "loading",
  token: null,
  user: null,
  onboarded: false,

  async hydrate() {
    try {
      const raw = await secureStorage.get(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { token?: string; user?: unknown; onboarded?: boolean };
        const user = UserSchema.safeParse(saved.user);
        if (saved.token && user.success) {
          set({ status: "signedIn", token: saved.token, user: user.data, onboarded: !!saved.onboarded });
          return;
        }
      }
    } catch {
      // Corrupt or unreadable storage — fall through to a clean signed-out state.
    }
    set({ status: "signedOut" });
  },

  async signIn(token, user) {
    set({ status: "signedIn", token, user, onboarded: get().onboarded && user.profileComplete });
    await persist(get());
  },

  setUser(user) {
    set({ user });
    void persist(get());
  },

  completeOnboarding() {
    set({ onboarded: true });
    void persist(get());
  },

  async signOut() {
    set({ status: "signedOut", token: null, user: null, onboarded: false });
    await secureStorage.remove(KEY);
  },
}));

/** Where the user is in the journey — drives the protected route groups in the root layout. */
export function useJourney() {
  return useSession((s) => {
    if (s.status === "loading") return "loading" as const;
    if (s.status === "signedOut" || !s.user) return "auth" as const;
    if (!s.user.profileComplete || !s.onboarded) return "onboarding" as const;
    return "app" as const;
  });
}
