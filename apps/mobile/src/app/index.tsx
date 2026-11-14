import { Redirect, type Href } from "expo-router";
import { useJourney } from "@/store/session";

const ENTRY: Record<string, Href> = {
  auth: "/welcome",
  onboarding: "/onboarding",
  app: "/explore",
};

/** Unguarded entry point: "/" (cold start, deep-link fallback, post-guard-change) routes to the right journey stage. */
export default function Index() {
  const journey = useJourney();
  if (journey === "loading") return null;
  return <Redirect href={ENTRY[journey]!} />;
}
