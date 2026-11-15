import type { Metadata } from "next";
import { ListingEditor } from "@/components/ListingEditor";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = { title: "Post a room", robots: { index: false } };

export default function PostPage() {
  return (
    <RequireAuth>
      <ListingEditor />
    </RequireAuth>
  );
}
