import { describe, expect, it } from "vitest";
import { BadRequestError, ConflictError, NotFoundError } from "../src/domain/errors";
import { createHarness, listingInput } from "./harness";

describe("favorites, inquiries, reports, account deletion", () => {
  it("adds and removes favorites idempotently and skips deleted listings", async () => {
    const h = createHarness();
    const { user: owner } = await h.signIn("owner@tcs.com");
    let { user: fan } = await h.signIn("fan@tcs.com");
    const l1 = await h.services.listings.create(owner, listingInput());
    const l2 = await h.services.listings.create(owner, listingInput({ rent: 9000 }));

    await h.services.favorites.add(fan, l1.id);
    fan = await h.reload(fan);
    await h.services.favorites.add(fan, l1.id);
    fan = await h.reload(fan);
    await h.services.favorites.add(fan, l2.id);
    fan = await h.reload(fan);
    expect([...fan.favorites].sort()).toEqual([l1.id, l2.id].sort());
    expect((await h.services.listings.getDetail(l1.id, fan)).isFavorite).toBe(true);

    await h.services.listings.delete(owner, l2.id);
    expect((await h.services.favorites.list(fan)).map((s) => s.id)).toEqual([l1.id]);

    await h.services.favorites.remove(fan, l1.id);
    fan = await h.reload(fan);
    await h.services.favorites.remove(fan, l1.id);
    fan = await h.reload(fan);
    expect(fan.favorites).not.toContain(l1.id);
    await expect(h.services.favorites.add(fan, "missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("emails the owner on inquiry and blocks inquiring on own listing", async () => {
    const h = createHarness();
    const { user: owner } = await h.signIn("owner@tcs.com");
    const { user: seeker } = await h.signIn("seeker@infosys.com");
    const l = await h.services.listings.create(owner, listingInput());
    h.email.sent.length = 0;

    const inquiry = await h.services.inquiries.create(seeker, l.id, "Hi, is the room still available?");
    expect(inquiry).toMatchObject({ listingId: l.id, fromUserId: seeker.id });
    expect(h.email.sent).toHaveLength(1);
    expect(h.email.sent[0]!.to).toBe("owner@tcs.com");
    expect(h.email.sent[0]!.text).toContain("seeker@infosys.com");
    expect((await h.services.listings.getDetail(l.id, owner)).stats.inquiries).toBe(1);

    await expect(h.services.inquiries.create(owner, l.id, "Talking to myself here")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("dedupes open reports per reporter and blocks reporting own listing", async () => {
    const h = createHarness();
    const { user: owner } = await h.signIn("owner@tcs.com");
    const { user: reporter } = await h.signIn("reporter@infosys.com");
    const l = await h.services.listings.create(owner, listingInput());

    const report = await h.services.reports.create(reporter, l.id, { reason: "scam", details: "Asked for advance via UPI" });
    expect(report).toMatchObject({ listingId: l.id, status: "open", reason: "scam" });
    await expect(h.services.reports.create(reporter, l.id, { reason: "misleading", details: "" })).rejects.toBeInstanceOf(ConflictError);
    await expect(h.services.reports.create(owner, l.id, { reason: "other", details: "" })).rejects.toBeInstanceOf(BadRequestError);
  });

  it("deleting an account cascades to listings and favorites", async () => {
    const h = createHarness();
    const { user: owner } = await h.signIn("owner@tcs.com");
    let { user: fan } = await h.signIn("fan@tcs.com");
    const l = await h.services.listings.create(owner, listingInput());
    await h.services.favorites.add(fan, l.id);
    fan = await h.reload(fan);

    await h.services.users.deleteAccount(owner);
    expect(await h.services.repos.users.get(owner.id)).toBeNull();
    expect(await h.services.repos.listings.get(l.id)).toBeNull();
    expect(await h.services.favorites.list(fan)).toEqual([]);
    expect(await h.services.repos.otps.get("owner@tcs.com")).toBeNull();
  });
});
