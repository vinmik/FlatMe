import type { Metadata } from "next";
import { ProfileSettings } from "@/components/ProfileSettings";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = { title: "Profile & settings", robots: { index: false } };

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileSettings />
    </RequireAuth>
  );
}
