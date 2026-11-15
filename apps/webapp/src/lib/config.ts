const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";

export const config = {
  /** API root including `/api`. Falls back to the API on this machine in development. */
  apiUrl: raw || "http://localhost:7071/api",
  /** Public address of this site, for canonical links and the sitemap. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:5173",
  supportEmail: "support@flatme.app",
} as const;
