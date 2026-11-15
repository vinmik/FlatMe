import type { Metadata } from "next";
import { MyListings } from "@/components/MyListings";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = { title: "My listings", robots: { index: false } };

export default function MyListingsPage() {
  return (
    <RequireAuth>
      <MyListings />
    </RequireAuth>
  );
}
