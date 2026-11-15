/**
 * HTTP route table — the API registers exactly these routes and the app's client calls them.
 * All routes are prefixed with `/api` by the Functions host.
 */
export const ROUTES = {
  health: "health",
  publicHighlights: "public/highlights",
  publicListings: "public/listings",
  publicListing: (id: string) => `public/listings/${id}`,
  otpRequest: "auth/otp/request",
  otpVerify: "auth/otp/verify",
  me: "me",
  mePrefs: "me/preferences",
  myListings: "me/listings",
  favorites: "me/favorites",
  favorite: (listingId: string) => `me/favorites/${listingId}`,
  feed: "feed",
  listings: "listings",
  listing: (id: string) => `listings/${id}`,
  listingStatus: (id: string) => `listings/${id}/status`,
  listingInquiries: (id: string) => `listings/${id}/inquiries`,
  uploadUrl: "media/upload-url",
} as const;
