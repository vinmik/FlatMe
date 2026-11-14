import { AREAS, availabilityToDate, type AreaName, type ListingDetail } from "@flatme/shared";
import {
  contactOf,
  ownerSnapshotOf,
  toGeoJson,
  type ListingEntity,
  type ReportEntity,
  type UserEntity,
} from "../domain/entities";

/**
 * Deterministic demo data (stable ids → idempotent upserts). Used by scripts/seed.ts for Cosmos
 * and by the in-memory repositories so `func start` has data out of the box.
 * Dates are relative to `now` so rails like "Just listed" / "Available immediately" stay fresh.
 */

const PHOTOS = [
  "https://images.unsplash.com/photo-1663756915301-2ba688e078cf?w=1080&q=80",
  "https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?w=1080&q=80",
  "https://images.unsplash.com/photo-1766923475286-b2fb204cf95e?w=1080&q=80",
  "https://images.unsplash.com/photo-1737737149038-e6532662659e?w=1080&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1080&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1080&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1080&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1080&q=80",
] as const;

const SEED_USERS = [
  { fullName: "Rahul Sharma", email: "rahul.s@seed.flatme.app", company: "TCS", designation: "Senior Software Engineer" },
  { fullName: "Priya Reddy", email: "priya.r@seed.flatme.app", company: "Microsoft", designation: "Program Manager" },
  { fullName: "Arjun Mehta", email: "arjun.m@seed.flatme.app", company: "Accenture", designation: "Business Analyst" },
  { fullName: "Sneha Iyer", email: "sneha.i@seed.flatme.app", company: "Infosys", designation: "Technology Lead" },
  { fullName: "Karthik Rao", email: "karthik.r@seed.flatme.app", company: "Amazon", designation: "SDE II" },
  { fullName: "Ananya Gupta", email: "ananya.g@seed.flatme.app", company: "Google", designation: "UX Designer" },
  { fullName: "Vikram Nair", email: "vikram.n@seed.flatme.app", company: "Deloitte", designation: "Consultant" },
  { fullName: "Divya Menon", email: "divya.m@seed.flatme.app", company: "Wipro", designation: "QA Engineer" },
] as const;

type L = ListingDetail;
interface ListingSpec {
  area: AreaName;
  locality: string;
  rent: number;
  roomType: L["roomType"];
  furnishing: L["furnishing"];
  gender: L["genderPreference"];
  availability: "immediate" | "within-week" | "within-month" | "flexible";
  flatmates: number;
  amenities: L["amenities"];
  description: string;
}

const SPECS: ListingSpec[] = [
  { area: "Madhapur", locality: "Ayyappa Society, near Image Gardens", rent: 12500, roomType: "2BHK", furnishing: "furnished", gender: "male", availability: "immediate", flatmates: 1, amenities: ["WiFi", "AC", "Washing Machine", "Fridge", "Power Backup"], description: "Spacious private room in a 2BHK, 5 minutes from Hitech City metro. Flatmate works at TCS and keeps odd hours occasionally — quiet, clean, no smoking inside. Maid comes daily for cleaning." },
  { area: "Madhapur", locality: "Kavuri Hills Phase 2", rent: 16000, roomType: "3BHK", furnishing: "semi-furnished", gender: "any", availability: "within-week", flatmates: 2, amenities: ["WiFi", "Parking", "Geyser", "Power Backup", "Housekeeping"], description: "Room with attached bathroom and balcony in a gated 3BHK. Two working professionals already living here. Close to cafes on Road 36 and an easy cab to Raidurg." },
  { area: "Gachibowli", locality: "Indira Nagar, near DLF Cybercity", rent: 11000, roomType: "2BHK", furnishing: "furnished", gender: "female", availability: "immediate", flatmates: 1, amenities: ["WiFi", "AC", "Fridge", "Washing Machine", "Cook"], description: "Looking for a female flatmate for a fully furnished 2BHK walking distance from DLF. Cook available for breakfast and dinner (shared cost ~₹2,500). Very safe locality with 24x7 security." },
  { area: "Gachibowli", locality: "Telecom Nagar", rent: 9000, roomType: "3BHK", furnishing: "semi-furnished", gender: "male", availability: "flexible", flatmates: 2, amenities: ["WiFi", "Geyser", "Parking"], description: "Affordable room in a 3BHK shared with two engineers. Bed, wardrobe and study table provided. 10 minutes to ISB Road and Wipro Circle. Flexible on move-in date." },
  { area: "Kondapur", locality: "Raghavendra Colony, Botanical Garden Road", rent: 10500, roomType: "2BHK", furnishing: "furnished", gender: "any", availability: "within-month", flatmates: 1, amenities: ["WiFi", "AC", "Washing Machine", "Gym", "Power Backup"], description: "Bright corner room in a gated community with gym and clubhouse. Flatmate is a product designer, mostly WFH on Fridays. Pets welcome!" },
  { area: "Kondapur", locality: "Sri Ram Nagar Colony", rent: 8000, roomType: "2BHK", furnishing: "unfurnished", gender: "male", availability: "immediate", flatmates: 1, amenities: ["Parking", "Geyser"], description: "Budget-friendly room in an independent house 2BHK. You'll need your own furniture. Good bus connectivity to Kothaguda junction and Hitech City." },
  { area: "Hitech City", locality: "Cyber Towers lane, behind Shilparamam", rent: 18000, roomType: "2BHK", furnishing: "furnished", gender: "any", availability: "immediate", flatmates: 1, amenities: ["WiFi", "AC", "Washing Machine", "Fridge", "Housekeeping", "Metro nearby"], description: "Premium furnished room 3 minutes' walk from Hitech City metro. Split AC, queen bed, attached bath. Ideal for someone who wants zero commute." },
  { area: "Hitech City", locality: "Shilpa Hills", rent: 14000, roomType: "3BHK", furnishing: "furnished", gender: "female", availability: "within-week", flatmates: 2, amenities: ["WiFi", "AC", "Cook", "Housekeeping", "Power Backup"], description: "Room in a female-only 3BHK. Current flatmates work at Microsoft and Deloitte. Shared cook and maid. Calm, friendly household — we do Sunday brunches." },
  { area: "Banjara Hills", locality: "Road No. 12, near Taj Krishna", rent: 20000, roomType: "3BHK", furnishing: "furnished", gender: "any", availability: "within-month", flatmates: 2, amenities: ["WiFi", "AC", "Parking", "Gym", "Pool", "Power Backup"], description: "Large room with balcony in a premium apartment with pool and gym. 20 minutes to Hitech City off-peak. Great for someone who loves the Banjara Hills cafe scene." },
  { area: "Banjara Hills", locality: "Road No. 3, Sagar Society", rent: 15000, roomType: "2BHK", furnishing: "semi-furnished", gender: "female", availability: "flexible", flatmates: 1, amenities: ["WiFi", "Geyser", "Washing Machine", "Fridge"], description: "Cosy room in a quiet lane. Flatmate is a consultant who travels during the week, so you'll mostly have the place to yourself." },
  { area: "Jubilee Hills", locality: "Film Nagar, near Road No. 1", rent: 17500, roomType: "2BHK", furnishing: "furnished", gender: "any", availability: "immediate", flatmates: 1, amenities: ["WiFi", "AC", "Washing Machine", "Fridge", "Parking", "Housekeeping"], description: "Well-lit furnished room in a 2BHK near Jubilee Hills Check Post metro. Modern kitchen, fast 200 Mbps fibre, power backup for the whole flat." },
  { area: "Jubilee Hills", locality: "Road No. 45, near Peddamma Temple", rent: 13000, roomType: "3BHK", furnishing: "semi-furnished", gender: "male", availability: "within-week", flatmates: 2, amenities: ["WiFi", "Geyser", "Parking", "Power Backup"], description: "Room available in a 3BHK with two Amazon engineers. Fun but responsible bunch — weekend cricket at the nearby ground is optional." },
  { area: "Kukatpally", locality: "KPHB Colony Phase 6", rent: 7500, roomType: "2BHK", furnishing: "semi-furnished", gender: "male", availability: "immediate", flatmates: 1, amenities: ["WiFi", "Geyser", "Metro nearby"], description: "Lowest-cost option near KPHB metro. Bed and cupboard provided. Lots of mess and tiffin options nearby. 25 minutes by metro to Hitech City." },
  { area: "Kukatpally", locality: "Vivekananda Nagar", rent: 9500, roomType: "3BHK", furnishing: "furnished", gender: "female", availability: "within-month", flatmates: 2, amenities: ["WiFi", "Washing Machine", "Fridge", "Cook", "Metro nearby"], description: "Female flatmate wanted for a furnished 3BHK. Shared cook for South Indian meals. Very close to JNTU metro station and Forum Mall." },
  { area: "Miyapur", locality: "Madinaguda, near Allwyn Colony", rent: 8500, roomType: "2BHK", furnishing: "furnished", gender: "any", availability: "flexible", flatmates: 1, amenities: ["WiFi", "AC", "Fridge", "Parking"], description: "Furnished room with AC in a new gated community. Miyapur metro is 5 minutes away. Owner is relaxed, maintenance included in rent." },
  { area: "Miyapur", locality: "Deepthisri Nagar", rent: 7800, roomType: "3BHK", furnishing: "unfurnished", gender: "male", availability: "within-week", flatmates: 2, amenities: ["Parking", "Geyser", "Power Backup"], description: "Affordable unfurnished room in a big 3BHK with lots of natural light. Ideal if you have your own furniture and want to save." },
  { area: "Financial District", locality: "Nanakramguda, near Wipro campus", rent: 15500, roomType: "2BHK", furnishing: "furnished", gender: "any", availability: "immediate", flatmates: 1, amenities: ["WiFi", "AC", "Gym", "Pool", "Washing Machine", "Power Backup"], description: "Walk to work at the Financial District! Furnished room in a high-rise with pool, gym and 24x7 security. Flatmate works at Google." },
  { area: "Financial District", locality: "Khajaguda, Lanco Hills", rent: 19000, roomType: "3BHK", furnishing: "furnished", gender: "female", availability: "within-month", flatmates: 2, amenities: ["WiFi", "AC", "Pool", "Gym", "Housekeeping", "Cook"], description: "Premium room in Lanco Hills with lake view. Two flatmates (Deloitte & Microsoft). Shared cook and housekeeping included in the rent." },
  { area: "Manikonda", locality: "Puppalaguda, near Alkapur Township", rent: 10000, roomType: "2BHK", furnishing: "semi-furnished", gender: "any", availability: "immediate", flatmates: 1, amenities: ["WiFi", "Geyser", "Washing Machine", "Parking"], description: "Room in a semi-furnished 2BHK in a quiet residential area. 15 minutes to Financial District, lots of grocery and restaurant options nearby." },
  { area: "Manikonda", locality: "Panchavati Colony", rent: 11500, roomType: "3BHK", furnishing: "furnished", gender: "male", availability: "flexible", flatmates: 2, amenities: ["WiFi", "AC", "Fridge", "Washing Machine", "Power Backup"], description: "Fully furnished room in a 3BHK with two Infosys colleagues. Big living room, shared OTT subscriptions, and a terrace for evening chai." },
];

/** Small deterministic PRNG so jitter/phones are stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeedData {
  users: UserEntity[];
  listings: ListingEntity[];
  reports: ReportEntity[];
}

export function buildSeed(now: Date = new Date()): SeedData {
  const rand = mulberry32(20261114);
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();

  const users: UserEntity[] = SEED_USERS.map((u, i) => ({
    id: `seed-user-${i + 1}`,
    type: "user",
    email: u.email,
    fullName: u.fullName,
    company: u.company,
    designation: u.designation,
    phone: `9${String(800000000 + Math.floor(rand() * 199999999)).padStart(9, "0")}`,
    avatarUrl: null,
    verified: true,
    profileComplete: true,
    role: "user",
    status: "active",
    suspendedReason: null,
    lastLoginAt: at(i % 3),
    notifications: { newListings: true, messages: false, priceDrops: false },
    privacy: { showPhone: i % 3 !== 2 },
    favorites: [],
    createdAt: at(20 - i),
    updatedAt: at(20 - i),
    seed: true,
  }));

  const listings: ListingEntity[] = SPECS.map((s, i) => {
    const owner = users[i % users.length]!;
    const centroid = AREAS.find((a) => a.name === s.area)!;
    const location = {
      lat: Number((centroid.lat + (rand() - 0.5) * 0.012).toFixed(6)),
      lng: Number((centroid.lng + (rand() - 0.5) * 0.012).toFixed(6)),
    };
    const photoCount = 1 + (i % 3);
    const photos = Array.from({ length: photoCount }, (_, k) => PHOTOS[(i * 3 + k) % PHOTOS.length]!);
    const created = at(i * 0.7);
    const { availableFrom, flexible } = availabilityToDate(s.availability, now);
    return {
      id: `seed-listing-${String(i + 1).padStart(2, "0")}`,
      type: "listing",
      ownerId: owner.id,
      owner: ownerSnapshotOf(owner),
      contact: contactOf(owner),
      area: s.area,
      locality: s.locality,
      location,
      geo: toGeoJson(location),
      rent: s.rent,
      deposit: s.rent * 2,
      roomType: s.roomType,
      furnishing: s.furnishing,
      genderPreference: s.gender,
      availableFrom,
      flexible,
      flatmates: s.flatmates,
      amenities: [...s.amenities],
      description: s.description,
      photos,
      status: "active",
      moderationReason: null,
      stats: { views: 10 + Math.floor(rand() * 140), inquiries: Math.floor(rand() * 8) },
      createdAt: created,
      updatedAt: created,
      seed: true,
    };
  });

  const report = (n: number, listing: ListingEntity, reporter: UserEntity, reason: ReportEntity["reason"], details: string): ReportEntity => ({
    id: `seed-report-${n}`,
    listingId: listing.id,
    listingArea: listing.area,
    listingOwnerId: listing.ownerId,
    reporterId: reporter.id,
    reporterEmail: reporter.email,
    reason,
    details,
    status: "open",
    resolution: null,
    resolvedBy: null,
    createdAt: at(n),
    resolvedAt: null,
  });
  const reports: ReportEntity[] = [
    report(1, listings[5]!, users[2]!, "already-taken", "Called the owner, they said the room was rented out last week."),
    report(2, listings[12]!, users[6]!, "misleading", "Photos don't look like a KPHB flat at this rent — please verify."),
  ];

  return { users, listings, reports };
}
