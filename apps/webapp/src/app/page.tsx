import { AREAS, CITY, type ListingSummary } from "@flatme/shared";
import {
  ArrowRight,
  BadgeCheck,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroPhone } from "@/components/HeroPhone";
import { ListingCard } from "@/components/ListingCard";
import { areaHref } from "@/lib/areas";
import { config } from "@/lib/config";
import { publicApi } from "@/lib/public-api";
import { railHref } from "@/lib/search-params";
import { buttonClass } from "@/ui/base";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const ROWS = [
  { key: "newest", title: "Just listed", query: { sort: "newest" } },
  {
    key: "budget",
    title: "Rooms under ₹10,000",
    query: { budgetMax: 10_000, sort: "rent-asc" },
  },
  {
    key: "furnished",
    title: "Fully furnished",
    query: { furnishing: "furnished", sort: "newest" },
  },
  {
    key: "immediate",
    title: "Move in right away",
    query: { moveIn: "immediate", sort: "newest" },
  },
] as const;

const STEPS = [
  {
    icon: Mail,
    title: "Sign in with your work email",
    body: "We send a one-time code to your company address. No passwords, and no personal mailboxes.",
  },
  {
    icon: MapPin,
    title: "Find flats near your office",
    body: "Filter by area, rent, furnishing and move-in date, or look around on the map.",
  },
  {
    icon: MessageCircle,
    title: "Talk to the owner directly",
    body: "Call, WhatsApp or message a verified professional. No brokers and no fees.",
  },
];

function Row({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: ListingSummary[];
}) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          See all
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((l) => (
          <li key={l.id}>
            <ListingCard listing={l} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const [highlights, ...rows] = await Promise.all([
    publicApi.highlights(),
    ...ROWS.map((r) => publicApi.search({ ...r.query, limit: 4 })),
  ]);
  const stats = highlights?.stats;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FlatMe",
    url: config.siteUrl,
    description: `Verified flat sharing for working professionals in ${CITY.name}.`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="bg-gradient-to-b from-primary-soft to-canvas">
        <div className="mx-auto flex max-w-7xl items-center gap-10 px-4 pt-14 pb-12 sm:px-6 sm:pt-16">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-primary-hover shadow-card">
              <BadgeCheck className="size-4" aria-hidden />
              Work-email verified members only
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Find a flat in {CITY.name} with people you can trust
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Rooms and flatmates from working professionals at companies you
              know. Browse freely, then sign in with your work email to contact
              an owner or post your own room.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/flats" className={buttonClass("primary", "lg")}>
                Browse flats
              </Link>
              <Link href="/post" className={buttonClass("secondary", "lg")}>
                Post a room
              </Link>
            </div>
            {stats && stats.activeListings > 0 && (
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
                {[
                  [stats.activeListings, "rooms available now"],
                  [stats.professionals, "verified professionals"],
                  [stats.companies, "companies represented"],
                ].map(([n, label]) => (
                  <div key={label}>
                    <dd className="text-3xl font-bold tracking-tight tabular">
                      {Number(n).toLocaleString("en-IN")}
                    </dd>
                    <dt className="text-sm text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <HeroPhone listings={highlights?.featured ?? rows[0]?.items ?? []} />
        </div>
      </section>

      {ROWS.map((r, i) => (
        <Row
          key={r.key}
          title={r.title}
          href={railHref(r.key)}
          items={rows[i]?.items ?? []}
        />
      ))}

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Flats by area</h2>
        <p className="mt-1.5 text-muted">
          The neighbourhoods closest to {CITY.name}&apos;s offices and tech
          parks.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {AREAS.map((a) => (
            <li key={a.name}>
              <Link
                href={areaHref(a.name)}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium shadow-card transition-colors hover:border-primary hover:text-primary"
              >
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">How FlatMe works</h2>
        <ol className="mt-5 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="rounded-brand border border-line bg-surface p-6 shadow-card"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <s.icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1.5 text-[15px] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
