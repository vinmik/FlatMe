import {
  availabilityToDate,
  companyFromEmail,
  CorporateEmailSchema,
  haversineKm,
  type ListingDetail,
  ListingInputSchema,
  type ListingSummary,
  matchesFilters,
  normalizeEmail,
  SearchQuerySchema,
  type User,
} from "@flatme/shared";
import { ApiError } from "./errors";
import { buildDemoListings } from "./mock-data";
import type { FlatMeApi } from "./types";

/** Any 6-digit code works except this one, so error states can be demoed too. */
const MOCK_WRONG_OTP = "000000";
const latency = (ms = 350) => new Promise((r) => setTimeout(r, ms + Math.random() * 250));

/**
 * In-memory backend with the same semantics as the real API (filters, distances, ownership,
 * favourites). Lets designers and reviewers run the full journey with zero infrastructure.
 */
export function createMockApi(getToken: () => string | null): FlatMeApi {
  const listings = new Map(buildDemoListings().map((l) => [l.id, l]));
  const users = new Map<string, User>();
  const favorites = new Map<string, Set<string>>();

  const currentUser = (): User => {
    const email = getToken()?.replace(/^mock:/, "");
    const user = email ? users.get(email) : undefined;
    if (!user) throw new ApiError(401, "unauthorized", "Please sign in again");
    return user;
  };
  const favs = (userId: string) => favorites.get(userId) ?? favorites.set(userId, new Set()).get(userId)!;

  const toDetail = (l: ListingDetail, viewer: User | null, at: { lat: number; lng: number } | null): ListingDetail => ({
    ...l,
    distanceKm: at ? Math.round(haversineKm(at, l.location) * 10) / 10 : null,
    isOwner: viewer?.id === l.owner.id,
    isFavorite: viewer ? favs(viewer.id).has(l.id) : false,
  });
  const toSummary = (l: ListingDetail, at: { lat: number; lng: number } | null): ListingSummary => ({
    id: l.id,
    area: l.area,
    locality: l.locality,
    location: l.location,
    rent: l.rent,
    roomType: l.roomType,
    furnishing: l.furnishing,
    genderPreference: l.genderPreference,
    availableFrom: l.availableFrom,
    flexible: l.flexible,
    flatmates: l.flatmates,
    coverPhoto: l.coverPhoto,
    owner: { firstName: l.owner.firstName, company: l.owner.company, verified: l.owner.verified },
    distanceKm: at ? Math.round(haversineKm(at, l.location) * 10) / 10 : null,
    status: l.status,
    createdAt: l.createdAt,
  });
  const active = () => [...listings.values()].filter((l) => l.status === "active");
  const owned = (id: string) => {
    const l = listings.get(id);
    if (!l) throw new ApiError(404, "not_found", "Listing not found");
    if (l.owner.id !== currentUser().id) throw new ApiError(403, "forbidden", "You can only change your own listings");
    return l;
  };
  const fromInput = (raw: unknown, base: ListingDetail | null): ListingDetail => {
    const parsed = ListingInputSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(400, "validation_failed", parsed.error.issues[0]?.message ?? "Invalid listing");
    const input = parsed.data;
    const me = currentUser();
    const now = new Date().toISOString();
    const { availableFrom, flexible } = availabilityToDate(input.availability);
    return {
      id: base?.id ?? `mine-${Date.now().toString(36)}`,
      ...input,
      availableFrom,
      flexible,
      coverPhoto: input.photos[0] ?? null,
      owner: { id: me.id, firstName: me.fullName.split(" ")[0] ?? me.fullName, company: me.company, designation: me.designation, verified: true, avatarUrl: me.avatarUrl },
      contact: { name: me.fullName, company: me.company, email: me.email, phone: me.privacy.showPhone ? me.phone : null },
      distanceKm: null,
      status: base?.status ?? "active",
      isOwner: true,
      isFavorite: false,
      stats: base?.stats ?? { views: 0, inquiries: 0 },
      moderationReason: base?.moderationReason ?? null,
      createdAt: base?.createdAt ?? now,
      updatedAt: now,
    };
  };

  return {
    async highlights() {
      await latency(500);
      const all = active();
      return {
        stats: { activeListings: 2400 + all.length, professionals: 850 + users.size, companies: 120 },
        featured: all.slice(0, 6).map((l) => toSummary(l, null)),
      };
    },

    async requestOtp(email) {
      await latency();
      const parsed = CorporateEmailSchema.safeParse(email);
      if (!parsed.success) throw new ApiError(400, "personal_email", parsed.error.issues[0]?.message ?? "Use your work email");
      return { expiresInSec: 600, resendInSec: 30, devCode: "123456" };
    },

    async verifyOtp(rawEmail, code) {
      await latency(600);
      if (code === MOCK_WRONG_OTP) throw new ApiError(400, "otp_invalid", "That code isn't right. 4 attempts left.");
      const email = normalizeEmail(rawEmail);
      const now = new Date().toISOString();
      const existing = users.get(email);
      const user: User = existing ?? {
        id: `user-${users.size + 1}`,
        email,
        fullName: "",
        company: companyFromEmail(email) ?? "",
        designation: "",
        phone: "",
        avatarUrl: null,
        verified: true,
        profileComplete: false,
        role: "user",
        notifications: { newListings: true, messages: true, priceDrops: false },
        privacy: { showPhone: true },
        createdAt: now,
        updatedAt: now,
      };
      users.set(email, user);
      return {
        token: `mock:${email}`,
        expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        isNewUser: !existing,
        user,
        suggestedCompany: companyFromEmail(email),
      };
    },

    async me() {
      await latency(150);
      return currentUser();
    },
    async updateProfile(input) {
      await latency();
      const me = currentUser();
      const next: User = {
        ...me,
        ...input,
        phone: input.phone.replace(/\D/g, "").slice(-10),
        avatarUrl: input.avatarUrl === undefined ? me.avatarUrl : input.avatarUrl,
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      };
      users.set(me.email, next);
      return next;
    },
    async updatePrefs(input) {
      await latency(200);
      const me = currentUser();
      const next: User = {
        ...me,
        notifications: { ...me.notifications, ...input.notifications },
        privacy: { ...me.privacy, ...input.privacy },
      };
      users.set(me.email, next);
      return next;
    },
    async deleteAccount() {
      await latency();
      const me = currentUser();
      for (const l of [...listings.values()]) if (l.owner.id === me.id) listings.delete(l.id);
      users.delete(me.email);
    },

    async feed({ location, filters }) {
      await latency(700);
      const pool = active().filter((l) => matchesFilters(l, filters));
      const sum = (l: ListingDetail) => toSummary(l, location);
      const today = new Date().toISOString().slice(0, 10);
      const byDistance = location
        ? [...pool].sort((a, b) => haversineKm(location, a.location) - haversineKm(location, b.location))
        : pool;
      const rails = [
        { key: "closest" as const, title: location ? "Closest to you" : "Popular in Hitech City", items: byDistance.slice(0, 8).map(sum) },
        { key: "budget" as const, title: "Affordable picks under ₹10k", items: pool.filter((l) => l.rent <= 10000).slice(0, 8).map(sum) },
        { key: "furnished" as const, title: "Fully furnished", items: pool.filter((l) => l.furnishing === "furnished").slice(0, 8).map(sum) },
        { key: "immediate" as const, title: "Move in right away", items: pool.filter((l) => l.flexible || l.availableFrom <= today).slice(0, 8).map(sum) },
        {
          key: "newest" as const,
          title: "Just listed",
          items: [...pool].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(sum),
        },
      ];
      return { rails: rails.filter((r) => r.items.length > 0) };
    },

    async search(raw) {
      await latency(450);
      const q = SearchQuerySchema.parse(raw);
      const at = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
      let pool = active().filter((l) => matchesFilters(l, q));
      pool = pool.sort((a, b) => {
        switch (q.sort) {
          case "rent-asc":
            return a.rent - b.rent;
          case "rent-desc":
            return b.rent - a.rent;
          case "distance":
            return at ? haversineKm(at, a.location) - haversineKm(at, b.location) : 0;
          default:
            return b.createdAt.localeCompare(a.createdAt);
        }
      });
      const start = q.cursor ? Number(q.cursor) : 0;
      const page = pool.slice(start, start + q.limit);
      const next = start + q.limit < pool.length ? String(start + q.limit) : null;
      return { items: page.map((l) => toSummary(l, at)), total: pool.length, nextCursor: next };
    },

    async listing(id, location) {
      await latency(300);
      const l = listings.get(id);
      let viewer: User | null = null;
      try {
        viewer = currentUser();
      } catch {
        viewer = null;
      }
      if (!l || (l.status !== "active" && l.owner.id !== viewer?.id)) throw new ApiError(404, "not_found", "This listing is no longer available");
      l.stats.views += l.owner.id === viewer?.id ? 0 : 1;
      return toDetail(l, viewer, location);
    },
    async createListing(input) {
      await latency(900);
      const l = fromInput(input, null);
      listings.set(l.id, l);
      return l;
    },
    async updateListing(id, input) {
      await latency(700);
      const l = fromInput(input, owned(id));
      listings.set(id, l);
      return l;
    },
    async setListingStatus(id, status) {
      await latency(300);
      const l = owned(id);
      if (l.status === "removed") throw new ApiError(409, "conflict", "This listing was removed by moderators");
      const next = { ...l, status, updatedAt: new Date().toISOString() };
      listings.set(id, next);
      return { ...next, isOwner: true };
    },
    async deleteListing(id) {
      await latency(400);
      owned(id);
      listings.delete(id);
    },
    async myListings() {
      await latency(400);
      const me = currentUser();
      return [...listings.values()].filter((l) => l.owner.id === me.id).map((l) => ({ ...l, isOwner: true }));
    },

    async favorites() {
      await latency(350);
      const ids = favs(currentUser().id);
      return [...ids].map((id) => listings.get(id)).filter((l): l is ListingDetail => !!l && l.status === "active").map((l) => toSummary(l, null));
    },
    async setFavorite(id, favorite) {
      await latency(200);
      const set = favs(currentUser().id);
      if (favorite) set.add(id);
      else set.delete(id);
    },

    async sendInquiry(id, message) {
      await latency(800);
      const me = currentUser();
      const l = listings.get(id);
      if (!l) throw new ApiError(404, "not_found", "Listing not found");
      l.stats.inquiries += 1;
      return { id: `inq-${Date.now()}`, listingId: id, fromUserId: me.id, message, createdAt: new Date().toISOString() };
    },
    async reportListing(id) {
      await latency(500);
      if (!listings.has(id)) throw new ApiError(404, "not_found", "Listing not found");
    },

    async uploadPhoto(localUri) {
      await latency(900);
      // Demo mode keeps the local file URI; the real adapter returns a Blob Storage URL.
      return localUri;
    },
  };
}
