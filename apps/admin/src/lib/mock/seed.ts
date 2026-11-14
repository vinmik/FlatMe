import {
  AMENITIES,
  AREAS,
  COMPANY_DOMAINS,
  FURNISHING,
  GENDER_PREFS,
  REPORT_REASONS,
  ROOM_TYPES,
  toIsoDate,
  type AdminListing,
  type AdminUser,
  type AreaName,
  type AuditEntry,
  type Report,
} from "@flatme/shared";
import { roomPhoto } from "./photos";

export interface MockInquiry {
  id: string;
  listingId: string;
  createdAt: string;
}

export interface MockDb {
  users: AdminUser[];
  listings: AdminListing[];
  reports: Report[];
  inquiries: MockInquiry[];
  audit: AuditEntry[];
}

export const MOCK_ADMIN_EMAIL = "admin@flatme.in";
export const MOCK_OTP = "123456";

const DAY = 24 * 60 * 60 * 1000;

/** Deterministic PRNG so the demo data is stable between reloads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Rohan", "Karthik", "Rahul", "Vikram", "Nikhil", "Siddharth", "Harsha",
  "Pranav", "Varun", "Abhishek", "Teja", "Ananya", "Diya", "Priya", "Sneha", "Kavya", "Meera", "Ishita", "Pooja",
  "Lakshmi", "Divya", "Sravani", "Keerthi", "Neha", "Riya", "Tanvi", "Aishwarya", "Bhavana", "Harini", "Manasa", "Shruti",
];
const LAST = [
  "Reddy", "Rao", "Sharma", "Iyer", "Naidu", "Kumar", "Varma", "Gupta", "Menon", "Nair", "Chowdary", "Patel",
  "Krishnan", "Joshi", "Bhat", "Agarwal", "Desai", "Pillai", "Goud", "Mehta",
];
const DESIGNATIONS = [
  "Software Engineer", "Senior Software Engineer", "Product Manager", "Data Scientist", "Business Analyst",
  "UX Designer", "QA Engineer", "DevOps Engineer", "Associate Consultant", "Engineering Manager", "Data Engineer",
  "Cloud Architect", "Financial Analyst", "Technical Lead",
];
const LOCALITIES: Record<AreaName, string[]> = {
  Madhapur: ["Ayyappa Society", "Kavuri Hills", "Image Gardens Road", "Sri Sai Nagar"],
  Gachibowli: ["DLF Cyber City Road", "Indira Nagar", "Telecom Nagar", "Khajaguda"],
  Kondapur: ["Botanical Garden Road", "Kothaguda", "Raghavendra Colony", "Masjid Banda"],
  "Hitech City": ["Cyber Towers Lane", "Shilparamam", "Mindspace Junction", "HUDA Techno Enclave"],
  "Banjara Hills": ["Road No. 12", "Road No. 3", "Film Nagar Road", "NBT Nagar"],
  "Jubilee Hills": ["Road No. 36", "Road No. 45", "Journalist Colony", "Peddamma Temple Road"],
  Kukatpally: ["KPHB Colony", "JNTU Road", "Vivekananda Nagar", "Nizampet Road"],
  Miyapur: ["Allwyn Colony", "Madinaguda", "Hafeezpet", "Chandanagar"],
  "Financial District": ["Nanakramguda", "Wipro Circle", "Puppalaguda", "Gowlidoddy"],
  Manikonda: ["Alkapoor Township", "Pocharam", "Lanco Hills", "Neknampur"],
};
const AREA_RENT: Record<AreaName, number> = {
  Madhapur: 14000, Gachibowli: 13500, Kondapur: 12000, "Hitech City": 15000, "Banjara Hills": 19000,
  "Jubilee Hills": 21000, Kukatpally: 9000, Miyapur: 8000, "Financial District": 16000, Manikonda: 10000,
};
const DESCRIPTIONS = [
  "Spacious room in a gated community with 24x7 security. Walking distance to the tech park; flatmates are working professionals who keep the place tidy.",
  "Bright, airy flat on a high floor with a great sunset view. Looking for a clean, non-smoking flatmate who works in IT.",
  "Fully furnished room with attached bathroom and balcony. Maid comes daily; cook available on request. Quiet neighbourhood.",
  "Newly renovated flat close to the metro. Super-fast fibre WiFi, power backup, and covered parking for a two-wheeler.",
  "Friendly flat of three colleagues. We split groceries and the cook. Weekends are relaxed — board games and biryani.",
  "Semi-furnished room in a well-maintained apartment. Gym and pool in the complex. Ideal for someone working in the Financial District.",
];
const REPORT_DETAILS: Record<(typeof REPORT_REASONS)[number], string[]> = {
  scam: ["Owner asked for a token advance over UPI before any visit.", "Asked me to pay a 'booking fee' to an unrelated account."],
  misleading: ["Photos don't match the flat at all, it is much smaller.", "Listed as furnished but there is no furniture."],
  "already-taken": ["Called the owner, room was taken two weeks ago.", "Owner said it's no longer available."],
  inappropriate: ["Description contains offensive language about tenants.", "Listing discriminates based on religion."],
  duplicate: ["Same flat is posted three times with different rents.", "Duplicate of another listing by the same owner."],
  other: ["Phone number on the listing belongs to a broker.", "Rent mentioned in the chat is much higher than listed."],
};

function slugId(prefix: string, n: number, rnd: () => number): string {
  const hex = Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, "0");
  return `${prefix}_${hex}${n.toString(16).padStart(3, "0")}`;
}

export function createSeed(now: Date = new Date(), seed = 20261114): MockDb {
  const rnd = mulberry32(seed);
  const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
  const pickOne = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T;
  // Skews towards recent dates so the 14-day charts have plenty to show.
  const pastIso = (maxDays: number, skew = 1.8) => new Date(now.getTime() - Math.pow(rnd(), skew) * maxDays * DAY - int(0, 86_399) * 1000).toISOString();

  const domains = Object.entries(COMPANY_DOMAINS).filter(([d], i, all) => all.findIndex(([, c]) => c === COMPANY_DOMAINS[d]) === i);

  const users: AdminUser[] = [];
  const admins: [string, string, string][] = [
    [MOCK_ADMIN_EMAIL, "Ananya Rao", "Trust & Safety Lead"],
    ["ops.karthik@flatme.in", "Karthik Varma", "Operations Manager"],
  ];
  admins.forEach(([email, fullName, designation], i) => {
    const createdAt = new Date(now.getTime() - (200 - i * 10) * DAY).toISOString();
    users.push({
      id: slugId("usr", i, rnd),
      email,
      fullName,
      company: "FlatMe",
      designation,
      phone: `98${int(10_000_000, 99_999_999)}`,
      avatarUrl: null,
      verified: true,
      profileComplete: true,
      role: "admin",
      notifications: { newListings: true, messages: true, priceDrops: false },
      privacy: { showPhone: false },
      createdAt,
      updatedAt: createdAt,
      status: "active",
      suspendedReason: null,
      listingCount: 0,
      lastLoginAt: new Date(now.getTime() - int(1, 48) * 3600_000).toISOString(),
    });
  });

  const usedEmails = new Set(users.map((u) => u.email));
  for (let i = 0; users.length < 128; i++) {
    const first = pickOne(FIRST);
    const last = pickOne(LAST);
    const [domain, company] = pickOne(domains);
    let email = `${first}.${last}@${domain}`.toLowerCase();
    if (usedEmails.has(email)) email = email.replace("@", `${int(1, 99)}@`);
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const createdAt = pastIso(150);
    const complete = rnd() > 0.08;
    const suspended = rnd() < 0.05;
    users.push({
      id: slugId("usr", i + 10, rnd),
      email,
      fullName: `${first} ${last}`,
      company,
      designation: complete ? pickOne(DESIGNATIONS) : "",
      phone: complete ? `${pickOne(["9", "8", "7", "6"])}${int(100_000_000, 999_999_999)}` : "",
      avatarUrl: null,
      verified: true,
      profileComplete: complete,
      role: "user",
      notifications: { newListings: rnd() > 0.2, messages: true, priceDrops: rnd() > 0.6 },
      privacy: { showPhone: rnd() > 0.3 },
      createdAt,
      updatedAt: createdAt,
      status: suspended ? "suspended" : "active",
      suspendedReason: suspended ? pickOne(["Multiple scam reports from verified users", "Posting broker listings", "Abusive messages to other members"]) : null,
      listingCount: 0,
      lastLoginAt: rnd() > 0.05 ? new Date(Math.min(now.getTime(), Date.parse(createdAt) + rnd() * (now.getTime() - Date.parse(createdAt)))).toISOString() : null,
    });
  }

  const owners = users.filter((u) => u.role === "user" && u.profileComplete);
  const listings: AdminListing[] = [];
  for (let i = 0; i < 84; i++) {
    const owner = pickOne(owners);
    if (owner.listingCount >= 3) continue;
    const area = pickOne(AREAS);
    const roomType = pickOne(ROOM_TYPES);
    const rent = Math.round((AREA_RENT[area.name] * (0.7 + rnd() * 0.7) * (roomType === "1BHK" ? 1.3 : 1)) / 500) * 500;
    const createdAt = new Date(Math.max(Date.parse(owner.createdAt), Date.parse(pastIso(120)))).toISOString();
    const statusRoll = rnd();
    const status = statusRoll < 0.78 ? "active" : statusRoll < 0.92 ? "paused" : "removed";
    const photoCount = int(2, 5);
    const photoSeed = int(1, 10_000);
    const photos = Array.from({ length: photoCount }, (_, p) => roomPhoto(photoSeed, p));
    const amenities = AMENITIES.filter(() => rnd() > 0.55);
    const availableFrom = toIsoDate(new Date(now.getTime() + int(-10, 40) * DAY));
    const firstName = owner.fullName.split(" ")[0] ?? owner.fullName;
    owner.listingCount += 1;
    listings.push({
      id: slugId("lst", i, rnd),
      area: area.name,
      locality: pickOne(LOCALITIES[area.name]),
      location: { lat: +(area.lat + (rnd() - 0.5) * 0.02).toFixed(5), lng: +(area.lng + (rnd() - 0.5) * 0.02).toFixed(5) },
      rent,
      deposit: rent * int(2, 4),
      roomType,
      furnishing: pickOne(FURNISHING),
      genderPreference: pickOne(GENDER_PREFS),
      availableFrom,
      flexible: rnd() < 0.2,
      flatmates: int(0, 3),
      coverPhoto: photos[0] ?? null,
      owner: { id: owner.id, firstName, company: owner.company, designation: owner.designation, verified: true, avatarUrl: null },
      distanceKm: null,
      status,
      createdAt,
      description: pickOne(DESCRIPTIONS),
      amenities,
      photos,
      contact: { name: owner.fullName, company: owner.company, email: owner.email, phone: owner.privacy.showPhone ? owner.phone : null },
      stats: { views: int(20, 900), inquiries: 0 },
      moderationReason: status === "removed" ? pickOne(["Confirmed broker listing", "Photos were taken from another website", "Duplicate listing"]) : null,
      updatedAt: createdAt,
      openReports: 0,
      seed: rnd() < 0.15,
    });
  }

  const inquiries: MockInquiry[] = [];
  const live = listings.filter((l) => l.status !== "removed");
  for (let i = 0; i < 520; i++) {
    const l = pickOne(live);
    const createdAt = new Date(Math.max(Date.parse(l.createdAt), Date.parse(pastIso(60, 1.4)))).toISOString();
    inquiries.push({ id: `inq_${i}`, listingId: l.id, createdAt });
    l.stats.inquiries += 1;
  }

  const admin = users[0] as AdminUser;
  const reports: Report[] = [];
  const audit: AuditEntry[] = [];
  const reporters = users.filter((u) => u.role === "user" && u.status === "active");
  for (let i = 0; i < 34; i++) {
    const l = pickOne(listings);
    const reporter = pickOne(reporters);
    if (reporter.id === l.owner.id) continue;
    const reason = pickOne(REPORT_REASONS);
    const createdAt = new Date(Math.max(Date.parse(l.createdAt), Date.parse(pastIso(30, 1.5)))).toISOString();
    const roll = rnd();
    const status = l.status === "removed" ? "resolved" : roll < 0.55 ? "open" : roll < 0.8 ? "resolved" : "dismissed";
    const resolvedAt = status === "open" ? null : new Date(Math.min(now.getTime(), Date.parse(createdAt) + int(1, 48) * 3600_000)).toISOString();
    const report: Report = {
      id: slugId("rpt", i, rnd),
      listingId: l.id,
      listingArea: l.area,
      listingOwnerId: l.owner.id,
      reporterId: reporter.id,
      reporterEmail: reporter.email,
      reason,
      details: pickOne(REPORT_DETAILS[reason]),
      status,
      resolution:
        status === "resolved" ? "Verified with the owner and took action." : status === "dismissed" ? "Checked the listing — no policy violation found." : null,
      resolvedBy: status === "open" ? null : admin.id,
      createdAt,
      resolvedAt,
    };
    reports.push(report);
    if (status === "open" && l.status !== "removed") l.openReports += 1;
    if (resolvedAt && report.resolution) {
      audit.push({
        id: `aud_seed_${i}`,
        actorId: admin.id,
        actorEmail: admin.email,
        action: status === "resolved" ? "report.resolve" : "report.dismiss",
        targetType: "report",
        targetId: report.id,
        details: `${status === "resolved" ? "Resolved" : "Dismissed"} ${reason} report on ${l.area} listing: ${report.resolution}`,
        createdAt: resolvedAt,
      });
    }
  }

  for (const l of listings.filter((x) => x.status === "removed")) {
    audit.push({
      id: `aud_lst_${l.id}`,
      actorId: admin.id,
      actorEmail: admin.email,
      action: "listing.status",
      targetType: "listing",
      targetId: l.id,
      details: `Status → removed: ${l.moderationReason ?? ""}`,
      createdAt: new Date(Math.min(now.getTime(), Date.parse(l.createdAt) + 3 * DAY)).toISOString(),
    });
  }
  for (const u of users.filter((x) => x.status === "suspended")) {
    audit.push({
      id: `aud_usr_${u.id}`,
      actorId: admin.id,
      actorEmail: admin.email,
      action: "user.suspend",
      targetType: "user",
      targetId: u.id,
      details: `Suspended ${u.email}: ${u.suspendedReason ?? ""}`,
      createdAt: new Date(Math.min(now.getTime(), Date.parse(u.createdAt) + 5 * DAY)).toISOString(),
    });
  }

  const byDateDesc = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
  users.sort(byDateDesc);
  listings.sort(byDateDesc);
  reports.sort(byDateDesc);
  audit.sort(byDateDesc);
  return { users, listings, reports, inquiries, audit };
}
