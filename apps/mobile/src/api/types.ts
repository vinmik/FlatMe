import type {
  Feed,
  GeoPoint,
  Inquiry,
  ListingDetail,
  ListingFilters,
  ListingInput,
  ListingPage,
  ListingSummary,
  OtpRequestResponse,
  OtpVerifyResponse,
  PublicHighlights,
  ReportInput,
  SearchQuery,
  UpdatePrefs,
  UpdateProfile,
  UploadUrlRequest,
  User,
} from "@flatme/shared";

/**
 * The app's port to the backend. Implemented by the HTTP adapter (real API) and by an
 * in-memory adapter (demo / offline UI development). Screens only ever depend on this.
 */
export interface FlatMeApi {
  highlights(): Promise<PublicHighlights>;
  requestOtp(email: string): Promise<OtpRequestResponse>;
  verifyOtp(email: string, code: string): Promise<OtpVerifyResponse>;

  me(): Promise<User>;
  updateProfile(input: UpdateProfile): Promise<User>;
  updatePrefs(input: UpdatePrefs): Promise<User>;
  deleteAccount(): Promise<void>;

  feed(params: { location: GeoPoint | null; filters: ListingFilters }): Promise<Feed>;
  search(query: SearchQuery): Promise<ListingPage>;
  listing(id: string, location: GeoPoint | null): Promise<ListingDetail>;
  createListing(input: ListingInput): Promise<ListingDetail>;
  updateListing(id: string, input: ListingInput): Promise<ListingDetail>;
  setListingStatus(id: string, status: "active" | "paused"): Promise<ListingDetail>;
  deleteListing(id: string): Promise<void>;
  myListings(): Promise<ListingDetail[]>;

  favorites(): Promise<ListingSummary[]>;
  setFavorite(id: string, favorite: boolean): Promise<void>;

  sendInquiry(id: string, message: string): Promise<Inquiry>;
  reportListing(id: string, input: ReportInput): Promise<void>;

  /** Uploads a local image and returns its public URL. */
  uploadPhoto(localUri: string, contentType: UploadUrlRequest["contentType"], purpose: "listing" | "avatar"): Promise<string>;
}
