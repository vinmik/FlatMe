import { describe, expect, it } from "vitest";
import {
  availabilityToDate,
  companyFromEmail,
  CorporateEmailSchema,
  dateToAvailability,
  DEFAULT_FILTERS,
  IndianPhoneSchema,
  ListingFiltersSchema,
  matchesFilters,
  parseSimpleSelect,
  validateReadOnlyQuery,
} from "./index";

const now = new Date("2026-11-14T10:00:00Z");
const base = {
  rent: 12000,
  genderPreference: "any" as const,
  furnishing: "furnished" as const,
  area: "Madhapur" as const,
  availableFrom: "2026-11-14",
  flexible: false,
};

describe("corporate email", () => {
  it("rejects personal mailboxes and accepts work domains", () => {
    expect(CorporateEmailSchema.safeParse("me@gmail.com").success).toBe(false);
    expect(CorporateEmailSchema.parse("  Rahul.S@TCS.com ")).toBe("rahul.s@tcs.com");
  });

  it("detects company from subdomains", () => {
    expect(companyFromEmail("a@in.ibm.com")).toBe("IBM");
    expect(companyFromEmail("a@startup.io")).toBeUndefined();
  });
});

describe("phone", () => {
  it("normalises +91 prefix and spaces", () => {
    expect(IndianPhoneSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(IndianPhoneSchema.safeParse("12345").success).toBe(false);
  });
});

describe("matchesFilters", () => {
  it("treats 'any' gender listings as matching every preference", () => {
    expect(matchesFilters(base, { ...DEFAULT_FILTERS, gender: "female" }, now)).toBe(true);
    expect(matchesFilters({ ...base, genderPreference: "male" }, { ...DEFAULT_FILTERS, gender: "female" }, now)).toBe(false);
  });

  it("applies move-in cutoff but always includes flexible listings", () => {
    const later = { ...base, availableFrom: "2026-12-30" };
    expect(matchesFilters(later, { ...DEFAULT_FILTERS, moveIn: "within-week" }, now)).toBe(false);
    expect(matchesFilters({ ...later, flexible: true }, { ...DEFAULT_FILTERS, moveIn: "within-week" }, now)).toBe(true);
  });

  it("parses csv areas from query strings", () => {
    const f = ListingFiltersSchema.parse({ areas: "Madhapur,Kondapur" });
    expect(f.areas).toEqual(["Madhapur", "Kondapur"]);
    expect(matchesFilters({ ...base, area: "Miyapur" }, f, now)).toBe(false);
  });
});

describe("availability round-trip", () => {
  it.each(["immediate", "within-week", "within-month", "flexible"] as const)("%s", (opt) => {
    const { availableFrom, flexible } = availabilityToDate(opt, now);
    expect(dateToAvailability(availableFrom, flexible, now)).toBe(opt);
  });
});

describe("data explorer query guards", () => {
  it("accepts a single SELECT, even after comments", () => {
    expect(validateReadOnlyQuery("SELECT * FROM c")).toBeNull();
    expect(validateReadOnlyQuery("-- newest\n/* all */ select c.id FROM c")).toBeNull();
  });

  it.each(["DELETE FROM c", "  ", "SELECT * FROM c; SELECT 1", "/* SELECT */ UPDATE c", "SELECTx FROM c"])("rejects %j", (q) => {
    expect(validateReadOnlyQuery(q)).not.toBeNull();
  });

  it("parses the in-memory SELECT subset and rejects the rest", () => {
    expect(parseSimpleSelect("SELECT * FROM c WHERE c.status = 'active' AND c.stats.views = 3")).toEqual({
      where: [
        { path: "status", value: "active" },
        { path: "stats.views", value: 3 },
      ],
    });
    expect(parseSimpleSelect("SELECT c.id FROM c")).toBeNull();
    expect(parseSimpleSelect("SELECT * FROM c WHERE c.rent > 5")).toBeNull();
  });
});