import Link from "next/link";
import { buttonClass } from "@/ui/base";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">This page isn&apos;t available</h1>
      <p className="mt-3 text-muted">The flat may have been rented out or taken down, or the link is wrong.</p>
      <Link href="/flats" className={buttonClass("primary", "lg", "mt-8")}>
        Browse available flats
      </Link>
    </div>
  );
}
