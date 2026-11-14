const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

export const config = {
  /** Base URL of the Functions API including the `/api` prefix, without trailing slash. */
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
  /** With no API configured the app runs against an in-memory backend, so UI work never blocks on infra. */
  useMockApi: rawApiUrl.length === 0,
  shareBaseUrl: "https://flatme.app/listing",
  supportEmail: "support@flatme.app",
  /** Android Google Maps key (also injected into the manifest by app.config.ts). Without it Android uses the stylised map. */
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "",
} as const;
