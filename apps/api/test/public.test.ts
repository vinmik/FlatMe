import { PublicListingSchema, SearchQuerySchema } from "@flatme/shared";
import { describe, expect, it } from "vitest";
import { NotFoundError } from "../src/domain/errors";
import { createHarness, listingInput } from "./harness";

const q = (v: Record<string, unknown> = {}) => SearchQuerySchema.parse(v);

describe("PublicService (anonymous visitors)", () => {
  it("lists active listings without contact details or exact locations", async () => {
    const h = createHarness();
    const { user } = await h.signIn("owner@infosys.com");
    const made = await h.services.listings.create(user, listingInput({ location: { lat: 17.448512, lng: 78.390876 } }));

    const page = await h.services.public.search(q());
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: made.id, location: { lat: 17.449, lng: 78.391 } });

    const detail = await h.services.public.listing(made.id);
    expect(PublicListingSchema.parse(detail)).toMatchObject({ id: made.id, rent: 12000, description: "Bright room in a quiet society" });
    expect(detail.location).toEqual({ lat: 17.449, lng: 78.391 });
    const text = JSON.stringify([page, detail]);
    for (const secret of ["owner@infosys.com", "9876543210", user.id, "contact", "stats"]) expect(text).not.toContain(secret);
  });

  it("applies the same filters as the signed-in search", async () => {
    const h = createHarness();
    const { user } = await h.signIn("owner@infosys.com");
    await h.services.listings.create(user, listingInput({ rent: 8000, deposit: 8000 }));
    await h.services.listings.create(user, listingInput({ rent: 20000, furnishing: "unfurnished" }));
    expect((await h.services.public.search(q({ budgetMax: 10000 }))).items.map((l) => l.rent)).toEqual([8000]);
    expect((await h.services.public.search(q({ furnishing: "unfurnished" }))).items.map((l) => l.rent)).toEqual([20000]);
  });

  it("hides paused and missing listings", async () => {
    const h = createHarness();
    const { user } = await h.signIn("owner@infosys.com");
    const made = await h.services.listings.create(user, listingInput());
    await h.services.listings.setStatus(user, made.id, "paused");
    expect((await h.services.public.search(q())).total).toBe(0);
    await expect(h.services.public.listing(made.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(h.services.public.listing("nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});
