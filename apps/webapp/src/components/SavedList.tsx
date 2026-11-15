"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { errorMessage } from "@/lib/api";
import { useFavorites } from "@/lib/hooks";
import { buttonClass, EmptyState, ErrorState, Skeleton } from "@/ui";
import { ListingCard } from "./ListingCard";

export function SavedList() {
  const { data, isPending, isError, error, refetch } = useFavorites();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Saved flats</h1>
      <p className="mt-1 text-muted">Flats you saved, on this account across the web app and the mobile app.</p>
      <div className="mt-6">
        {isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-brand" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-7" aria-hidden />}
            title="Nothing saved yet"
            body="Tap the heart on any flat to keep it here for later."
            action={
              <Link href="/flats" className={buttonClass("primary")}>
                Browse flats
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} className="h-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
