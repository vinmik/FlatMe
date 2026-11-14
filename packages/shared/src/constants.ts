/**
 * Static domain reference data. Kept in the shared package so the API (validation)
 * and the app (pickers, chips, map centroids) can never drift apart.
 */

export const CITY = { name: "Hyderabad", center: { lat: 17.4435, lng: 78.3772 } } as const;

export const AREAS = [
  { name: "Madhapur", lat: 17.4485, lng: 78.3908 },
  { name: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { name: "Kondapur", lat: 17.4649, lng: 78.3628 },
  { name: "Hitech City", lat: 17.4475, lng: 78.375 },
  { name: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { name: "Jubilee Hills", lat: 17.4318, lng: 78.4071 },
  { name: "Kukatpally", lat: 17.4948, lng: 78.3996 },
  { name: "Miyapur", lat: 17.4968, lng: 78.3614 },
  { name: "Financial District", lat: 17.4126, lng: 78.3395 },
  { name: "Manikonda", lat: 17.4012, lng: 78.3871 },
] as const;

export type AreaName = (typeof AREAS)[number]["name"];
export const AREA_NAMES = AREAS.map((a) => a.name) as unknown as readonly [AreaName, ...AreaName[]];

export const COMPANIES = [
  "TCS", "Infosys", "Wipro", "Tech Mahindra", "HCL", "Accenture", "Capgemini", "Cognizant",
  "IBM", "Microsoft", "Amazon", "Google", "Meta", "Apple", "Deloitte", "EY", "KPMG", "PwC",
  "Oracle", "SAP", "Adobe", "Salesforce", "Qualcomm", "Novartis", "Other",
] as const;

/** Maps well-known corporate email domains to a company so onboarding can pre-fill it. */
export const COMPANY_DOMAINS: Record<string, (typeof COMPANIES)[number]> = {
  "tcs.com": "TCS",
  "infosys.com": "Infosys",
  "wipro.com": "Wipro",
  "techmahindra.com": "Tech Mahindra",
  "hcl.com": "HCL",
  "hcltech.com": "HCL",
  "accenture.com": "Accenture",
  "capgemini.com": "Capgemini",
  "cognizant.com": "Cognizant",
  "ibm.com": "IBM",
  "in.ibm.com": "IBM",
  "microsoft.com": "Microsoft",
  "amazon.com": "Amazon",
  "amazon.in": "Amazon",
  "google.com": "Google",
  "meta.com": "Meta",
  "fb.com": "Meta",
  "apple.com": "Apple",
  "deloitte.com": "Deloitte",
  "ey.com": "EY",
  "in.ey.com": "EY",
  "kpmg.com": "KPMG",
  "pwc.com": "PwC",
  "oracle.com": "Oracle",
  "sap.com": "SAP",
  "adobe.com": "Adobe",
  "salesforce.com": "Salesforce",
  "qualcomm.com": "Qualcomm",
  "novartis.com": "Novartis",
};

/** Personal / disposable mailbox providers. Sign-in requires a work email. */
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "yahoo.co.in", "ymail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "pm.me", "zoho.com", "zohomail.in",
  "rediffmail.com", "gmx.com", "gmx.net", "mail.com", "yandex.com", "yandex.ru",
  "tutanota.com", "fastmail.com", "hey.com", "mailinator.com", "guerrillamail.com",
  "10minutemail.com", "tempmail.com", "temp-mail.org", "sharklasers.com", "yopmail.com",
]);

export const ROOM_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK"] as const;
export const FURNISHING = ["furnished", "semi-furnished", "unfurnished"] as const;
export const GENDER_PREFS = ["any", "male", "female"] as const;
export const AVAILABILITY_OPTIONS = ["immediate", "within-week", "within-month", "flexible"] as const;
export const AMENITIES = [
  "WiFi", "AC", "Washing Machine", "Fridge", "Geyser", "Parking", "Gym", "Power Backup",
  "Housekeeping", "Cook", "Pool", "Metro nearby",
] as const;

export const BUDGET = { min: 5000, max: 30000, step: 500 } as const;
export const DEFAULT_BUDGET = { min: 5000, max: 30000 } as const;

export const LIMITS = {
  photosPerListing: 6,
  maxPhotoBytes: 8 * 1024 * 1024,
  favoritesPerUser: 200,
  listingsPerUser: 5,
  otpLength: 6,
  otpTtlSeconds: 600,
  otpResendSeconds: 30,
  otpMaxAttempts: 5,
  otpMaxRequestsPerHour: 5,
} as const;

export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
