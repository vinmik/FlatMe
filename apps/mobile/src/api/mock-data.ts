import { AREAS, COMPANIES, type ListingDetail } from "@flatme/shared";

/** Photos used in the Figma mocks — real-looking content for the demo backend. */
export const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1663756915301-2ba688e078cf?w=1080&q=80&fm=jpg&fit=max",
  "https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?w=1080&q=80&fm=jpg&fit=max",
  "https://images.unsplash.com/photo-1762704452342-54991a995f09?w=1080&q=80&fm=jpg&fit=max",
  "https://images.unsplash.com/photo-1766923475286-b2fb204cf95e?w=1080&q=80&fm=jpg&fit=max",
  "https://images.unsplash.com/photo-1737737149038-e6532662659e?w=1080&q=80&fm=jpg&fit=max",
] as const;

const FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Karthik", "Ananya", "Vikram", "Divya", "Arjun", "Meera", "Rohan", "Kavya"];
const DESIGNATIONS = ["Software Engineer", "Product Manager", "Data Scientist", "UX Designer", "Consultant", "SDE II", "Business Analyst"];
const ROOM_TYPES = ["1BHK", "2BHK", "3BHK"] as const;
const FURNISHING = ["furnished", "semi-furnished", "unfurnished"] as const;
const GENDERS = ["any", "any", "male", "female"] as const;
const AMENITY_SETS = [
  ["WiFi", "Washing Machine", "Fridge", "AC"],
  ["Parking", "Gym", "Power Backup"],
  ["WiFi", "AC", "Geyser", "Metro nearby"],
  ["WiFi", "Housekeeping", "Cook", "Power Backup", "Parking"],
  ["Pool", "Gym", "WiFi", "AC", "Parking"],
] as const;
const DESCRIPTIONS = [
  "2BHK flat with 1 room available. Close to Cyber Towers and major IT companies. Well-maintained society with 24/7 security.",
  "Spacious apartment with great natural light and a balcony. Good public transport connectivity and a supermarket downstairs.",
  "Cozy flat near the metro station. Peaceful locality with all essential amenities nearby. Looking for a tidy, friendly flatmate.",
  "Gated community with gym and pool. Flatmates are working professionals who keep regular hours — WFH friendly.",
];

/** Deterministic pseudo-random so the demo looks identical on every launch. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function buildDemoListings(now = Date.now()): ListingDetail[] {
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
  const out: ListingDetail[] = [];

  for (let i = 0; i < 28; i++) {
    const area = AREAS[i % AREAS.length]!;
    const company = COMPANIES[Math.floor(rand() * (COMPANIES.length - 1))]!;
    const firstName = pick(FIRST_NAMES);
    const rent = Math.round((6500 + rand() * 18000) / 500) * 500;
    const createdAt = new Date(now - Math.floor(rand() * 20) * 86_400_000 - i * 3_600_000).toISOString();
    const availDays = pick([0, 0, 3, 10, 25]);
    const photos = [0, 1, 2].map((k) => DEMO_PHOTOS[(i + k) % DEMO_PHOTOS.length]!);
    const id = `demo-${(i + 1).toString().padStart(3, "0")}`;
    const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";

    out.push({
      id,
      area: area.name,
      locality: `${pick(["Near", "Opp.", "Behind"])} ${pick(["Cyber Towers", "Inorbit Mall", "Metro Station", "DLF Cyber City", "Botanical Garden", "IKEA"])}`,
      location: { lat: area.lat + (rand() - 0.5) * 0.018, lng: area.lng + (rand() - 0.5) * 0.018 },
      rent,
      deposit: rent * pick([1, 2, 2, 3]),
      roomType: pick(ROOM_TYPES),
      furnishing: pick(FURNISHING),
      genderPreference: pick(GENDERS),
      availableFrom: new Date(now + availDays * 86_400_000).toISOString().slice(0, 10),
      flexible: rand() < 0.15,
      flatmates: 1 + Math.floor(rand() * 3),
      coverPhoto: photos[0]!,
      photos,
      description: pick(DESCRIPTIONS),
      amenities: [...pick(AMENITY_SETS)],
      owner: {
        id: `owner-${i}`,
        firstName,
        company,
        designation: pick(DESIGNATIONS),
        verified: true,
        avatarUrl: null,
      },
      contact: {
        name: `${firstName} ${String.fromCharCode(65 + Math.floor(rand() * 26))}.`,
        company,
        email: `${firstName.toLowerCase()}@${domain}`,
        phone: `+91 98${Math.floor(10000000 + rand() * 89999999)}`,
      },
      distanceKm: null,
      status: "active",
      isOwner: false,
      isFavorite: false,
      stats: { views: Math.floor(rand() * 400), inquiries: Math.floor(rand() * 12) },
      moderationReason: null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  return out;
}
