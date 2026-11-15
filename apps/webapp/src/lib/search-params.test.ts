import { DEFAULT_FILTERS } from "@flatme/shared";
import { describe, expect, it } from "vitest";
import { parseSearch, railHref, searchHref, toSearchParams } from "./search-params";

describe("search params", () => {
  it("falls back to defaults for an empty or invalid address", () => {
    expect(parseSearch(new URLSearchParams(""))).toEqual({ filters: DEFAULT_FILTERS, sort: null });
    expect(parseSearch(new URLSearchParams("gender=robot&sort=cheapest")).filters).toEqual(DEFAULT_FILTERS);
    expect(parseSearch(new URLSearchParams("sort=cheapest")).sort).toBeNull();
  });

  it("round-trips filters and sort", () => {
    const state = {
      filters: { ...DEFAULT_FILTERS, budgetMax: 12000, gender: "female" as const, areas: ["Madhapur" as const, "Kondapur" as const] },
      sort: "rent-asc" as const,
    };
    expect(parseSearch(toSearchParams(state))).toEqual(state);
  });

  it("leaves defaults out of links", () => {
    expect(searchHref({})).toBe("/flats");
    expect(railHref("budget")).toBe("/flats?budgetMax=10000&sort=rent-asc");
    expect(railHref("furnished")).toBe("/flats?furnishing=furnished");
  });
});
