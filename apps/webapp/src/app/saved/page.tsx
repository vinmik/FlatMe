import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";
import { SavedList } from "@/components/SavedList";

export const metadata: Metadata = { title: "Saved flats", robots: { index: false } };

export default function SavedPage() {
  return (
    <RequireAuth>
      <SavedList />
    </RequireAuth>
  );
}
