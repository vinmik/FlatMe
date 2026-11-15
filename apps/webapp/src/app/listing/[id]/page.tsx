import { availabilityLabel, CITY, formatRupees, furnishingLabel } from "@flatme/shared";
import { BadgeCheck, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Gallery } from "@/components/Gallery";
import { ListingActions } from "@/components/ListingActions";
import { ListingCard } from "@/components/ListingCard";
import { AreaMap } from "@/components/Map";
import { areaHref, GENDER_LABEL, listingHref, listingTitle } from "@/lib/areas";
import { config } from "@/lib/config";
import { publicApi } from "@/lib/public-api";
import { Badge } from "@/ui/base";

type Props = { params: Promise<{ id: string }> };

// Metadata and the page ask for the same listing; this makes it one request.
const getListing = cache((id: string) => publicApi.listing(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return { title: "Listing not available", robots: { index: false } };
  const title = `${listingTitle(listing)} — ${formatRupees(listing.rent)}/month`;
  const description =
    listing.description.slice(0, 155) ||
    `${furnishingLabel(listing.furnishing)} ${listing.roomType} in ${listing.area}, ${CITY.name} for ${formatRupees(listing.rent)} a month. Posted by a verified professional at ${listing.owner.company}.`;
  return {
    title,
    description,
    alternates: { canonical: listingHref(listing.id) },
    openGraph: { title, description, type: "article", images: listing.photos.slice(0, 1) },
  };
}

export default async function ListingPage({ params }: Props) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();

  const similar = (await publicApi.search({ areas: [listing.area], sort: "newest", limit: 5 }))?.items.filter((l) => l.id !== listing.id).slice(0, 4) ?? [];
  const title = listingTitle(listing);
  const facts: Array<[string, string]> = [
    ["Flat type", listing.roomType],
    ["Furnishing", furnishingLabel(listing.furnishing)],
    ["Current flatmates", String(listing.flatmates)],
    ["Open to", GENDER_LABEL[listing.genderPreference]],
    ["Available", availabilityLabel(listing.availableFrom, listing.flexible)],
    ["Deposit", listing.deposit > 0 ? formatRupees(listing.deposit) : "None"],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: title,
    description: listing.description || undefined,
    url: `${config.siteUrl}${listingHref(listing.id)}`,
    image: listing.photos,
    address: { "@type": "PostalAddress", addressLocality: listing.area, addressRegion: "Telangana", addressCountry: "IN" },
    geo: { "@type": "GeoCoordinates", latitude: listing.location.lat, longitude: listing.location.lng },
    amenityFeature: listing.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    offers: { "@type": "Offer", price: listing.rent, priceCurrency: "INR", availability: "https://schema.org/InStock" },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/flats" className="hover:text-primary">
          All flats
        </Link>{" "}
        /{" "}
        <Link href={areaHref(listing.area)} className="hover:text-primary">
          {listing.area}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Gallery photos={listing.photos} alt={title} />

          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{furnishingLabel(listing.furnishing)}</Badge>
            <Badge tone="green">{availabilityLabel(listing.availableFrom, listing.flexible)}</Badge>
            <span className="flex items-center gap-1.5 text-sm text-muted">
              {listing.owner.verified && <BadgeCheck className="size-4 text-primary" aria-hidden />}
              Posted by {listing.owner.firstName}, {listing.owner.verified ? "verified at" : "works at"} {listing.owner.company}
            </span>
          </div>

          <section aria-labelledby="facts" className="mt-8">
            <h2 id="facts" className="text-lg font-semibold">
              About this flat
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {listing.description && (
            <section aria-labelledby="desc" className="mt-8">
              <h2 id="desc" className="text-lg font-semibold">
                From the owner
              </h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed whitespace-pre-line text-fg/90">{listing.description}</p>
            </section>
          )}

          {listing.amenities.length > 0 && (
            <section aria-labelledby="amenities" className="mt-8">
              <h2 id="amenities" className="text-lg font-semibold">
                What&apos;s included
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                {listing.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-[15px]">
                    <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="where" className="mt-8">
            <h2 id="where" className="text-lg font-semibold">
              Where it is
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              {listing.locality}, {listing.area}, {CITY.name}. The circle shows the rough area; the owner shares the exact address once you connect.
            </p>
            <div className="mt-3 h-72 overflow-hidden rounded-brand border border-line">
              <AreaMap center={listing.location} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ListingActions listing={listing} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-14">
          <h2 id="similar" className="text-2xl font-bold tracking-tight">
            More flats in {listing.area}
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
