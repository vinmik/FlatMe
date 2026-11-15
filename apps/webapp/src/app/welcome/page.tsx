import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default function WelcomePage() {
  return (
    <RequireAuth allowIncomplete>
      <Suspense>
        <Onboarding />
      </Suspense>
    </RequireAuth>
  );
}
