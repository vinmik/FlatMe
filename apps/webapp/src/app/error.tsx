"use client";

import { Button } from "@/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted">FlatMe couldn&apos;t load this page. Your data is safe. Please try again in a moment.</p>
      <Button size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
