import type { Metadata } from "next";
import { EditListing } from "@/components/EditListing";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <EditListing id={id} />
    </RequireAuth>
  );
}
