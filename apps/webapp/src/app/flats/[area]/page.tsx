import { AREAS, CITY, DEFAULT_FILTERS } from "@flatme/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/SearchView";
import { areaFromSlug, areaHref, areaSlug } from "@/lib/areas";
import { publicApi } from "@/lib/public-api";
import { PAGE_SIZE } from "@/lib/search-params";

type Props = { params: Promise<{ area: string }> };

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: areaSlug(a.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = areaFromSlug((await params).area);
  if (!area) return {};
  return {
    title: `Flats and rooms for rent in ${area.name}, ${CITY.name}`,
    description: `Rooms in shared flats in ${area.name}, ${CITY.name}, posted by verified working professionals. See rent, photos and move-in dates, with no brokers.`,
    alternates: { canonical: areaHref(area.name) },
  };
}

export default async function AreaPage({ params }: Props) {
  const area = areaFromSlug((await params).area);
  if (!area) notFound();
  const filters = { ...DEFAULT_FILTERS, areas: [area.name] };
  const initial = await publicApi.search({ ...filters, sort: "newest", limit: PAGE_SIZE });

  return (
    <SearchView
      state={{ filters, sort: null }}
      initial={initial}
      heading={
        <>
          <nav aria-label="Breadcrumb" className="mb-1.5 text-sm text-muted">
            <Link href="/flats" className="hover:text-primary">
              All flats
            </Link>{" "}
            / {area.name}
          </nav>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Flats and rooms in {area.name}, {CITY.name}
          </h1>
          <p className="mt-1 text-muted">Shared flats in {area.name} posted by verified working professionals.</p>
        </>
      }
    />
  );
}
