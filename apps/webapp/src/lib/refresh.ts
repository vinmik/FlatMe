"use server";

import { updateTag } from "next/cache";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Called after someone posts, edits, pauses or deletes a listing, so the public pages show the change
 * at once instead of after the usual one-minute cache. It only drops cached copies; it changes no data.
 */
export async function refreshListings(id?: string): Promise<void> {
  updateTag("listings");
  if (id && ID_RE.test(id)) updateTag(`listing:${id}`);
}
