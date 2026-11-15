import { AREAS, CITY } from "@flatme/shared";
import Link from "next/link";
import { areaHref } from "@/lib/areas";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-20 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_2fr_1fr]">
        <div>
          <p className="text-lg font-bold">FlatMe</p>
          <p className="mt-2 max-w-xs text-sm text-muted">Verified flat sharing for working professionals in {CITY.name}. Every member signs in with a work email.</p>
        </div>
        <nav aria-label="Flats by area">
          <p className="text-sm font-semibold">Flats by area</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {AREAS.map((a) => (
              <li key={a.name}>
                <Link href={areaHref(a.name)} className="text-muted hover:text-primary">
                  Flats in {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="FlatMe">
          <p className="text-sm font-semibold">FlatMe</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/flats" className="text-muted hover:text-primary">
                Browse all flats
              </Link>
            </li>
            <li>
              <Link href="/post" className="text-muted hover:text-primary">
                Post a room
              </Link>
            </li>
            <li>
              <a href={`mailto:${config.supportEmail}`} className="text-muted hover:text-primary">
                {config.supportEmail}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
