import { AREAS, SearchQuerySchema } from "@flatme/shared";
import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../src/domain/errors";
import { createHarness, listingInput } from "./harness";

const area = (name: string) => AREAS.find((a) => a.name === name)!;
const q = (v: Record<string, unknown> = {}) => SearchQuerySchema.parse(v);

describe("ListingService", () => {
  it("requires a complete profile to create a listing", async () => {
    const h = createHarness();
    const { user } = await h.signIn("new@infosys.com", { complete: false });
    await expect(h.services.listings.create(user, listingInput())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("enforces the per-user listing limit and photo URL policy", async () => {
    const h = createHarness();
    const { user } = await h.signIn("owner@infosys.com");
    await expect(
      h.services.listings.create(user, listingInput({ photos: ["https://evil.example.com/x.jpg"] })),
    ).rejects.toBeInstanceOf(ValidationError);
    const own = `http://127.0.0.1:10000/devstoreaccount1/listing-photos/listing/${user.id}/a.jpg`;
    const detail = await h.services.listings.create(user, listingInput({ photos: [own] }));
    expect(detail).toMatchObject({ isOwner: true, status: "active", photos: [own], moderationReason: null });
    for (let i = 1; i < 5; i++) await h.services.listings.create(user, listingInput());
    await expect(h.services.listings.create(user, listingInput())).rejects.toBeInstanceOf(ConflictError);
  });

  it("only lets the owner update or delete", async () => {
    const h = createHarness();
    const { user: owner } = await h.signIn("owner@infosys.com");
    const { user: other } = await h.signIn("other@wipro.com");
    const l = await h.services.listings.create(owner, listingInput());
    await expect(h.services.listings.update(other, l.id, listingInput({ rent: 9000 }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(h.services.listings.delete(other, l.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(h.services.listings.setStatus(other, l.id, "paused")).rejects.toBeInstanceOf(ForbiddenError);
    expect((await h.services.listings.update(owner, l.id, listingInput({ rent: 9000 }))).rent).toBe(9000);
    await h.services.listings.delete(owner, l.id);
    await expect(h.services.listings.getDetail(l.id, owner)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("filters search results and sorts by distance", async () => {
    const h = createHarness();
    const { user: a } = await h.signIn("a@tcs.com");
    const { user: b } = await h.signIn("b@tcs.com");
    const mad = area("Madhapur");
    const gac = area("Gachibowli");
    const kon = area("Kondapur");
    const l1 = await h.services.listings.create(a, listingInput({ area: "Madhapur", location: mad, rent: 8000, genderPreference: "female" }));
    const l2 = await h.services.listings.create(a, listingInput({ area: "Gachibowli", location: gac, rent: 15000, furnishing: "unfurnished" }));
    const l3 = await h.services.listings.create(b, listingInput({ area: "Kondapur", location: kon, rent: 11000, availability: "flexible" }));
    const paused = await h.services.listings.create(b, listingInput({ area: "Madhapur", location: mad, rent: 9000 }));
    await h.services.listings.setStatus(b, paused.id, "paused");

    const all = await h.services.listings.search(q());
    expect(all.total).toBe(3);

    expect((await h.services.listings.search(q({ budgetMax: 12000 }))).items.map((i) => i.id).sort()).toEqual([l1.id, l3.id].sort());
    expect((await h.services.listings.search(q({ gender: "male" }))).items.map((i) => i.id).sort()).toEqual([l2.id, l3.id].sort());
    expect((await h.services.listings.search(q({ furnishing: "unfurnished" }))).items.map((i) => i.id)).toEqual([l2.id]);
    expect((await h.services.listings.search(q({ areas: "Kondapur" }))).items.map((i) => i.id)).toEqual([l3.id]);

    const near = await h.services.listings.search(q({ lat: gac.lat, lng: gac.lng, sort: "distance" }));
    expect(near.items.map((i) => i.id)).toEqual([l2.id, l3.id, l1.id]);
    expect(near.items[0]!.distanceKm).toBeCloseTo(0, 1);

    const page1 = await h.services.listings.search(q({ sort: "rent-asc", limit: 2 }));
    expect(page1.items.map((i) => i.rent)).toEqual([8000, 11000]);
    const page2 = await h.services.listings.search(q({ sort: "rent-asc", limit: 2, cursor: page1.nextCursor! }));
    expect(page2.items.map((i) => i.rent)).toEqual([15000]);
    expect(page2.nextCursor).toBeNull();
  });

  it("composes feed rails in order and skips empty ones", async () => {
    const h = createHarness();
    const { user } = await h.signIn("a@tcs.com");
    const mad = area("Madhapur");
    await h.services.listings.create(user, listingInput({ location: mad, rent: 18000, furnishing: "semi-furnished", availability: "within-month" }));
    await h.services.listings.create(user, listingInput({ location: mad, rent: 9500, furnishing: "furnished", availability: "immediate" }));

    const withLoc = await h.services.listings.feed(q({ lat: mad.lat, lng: mad.lng }));
    expect(withLoc.rails.map((r) => r.key)).toEqual(["closest", "budget", "furnished", "immediate", "newest"]);
    expect(withLoc.rails[0]!.title).toBe("Closest to you");
    expect(withLoc.rails.find((r) => r.key === "budget")!.items.map((i) => i.rent)).toEqual([9500]);

    const noLoc = await h.services.listings.feed(q({ furnishing: "semi-furnished" }));
    expect(noLoc.rails.map((r) => r.key)).toEqual(["newest"]);
  });
});
