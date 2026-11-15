"use client";

import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const step = (d: number) => setIndex((i) => (i + d + count) % count);

  if (!count) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-brand bg-accent text-primary/40">
        <Home className="size-16" aria-hidden />
        <span className="sr-only">No photos added yet</span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-brand bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[index]} alt={`${alt} (photo ${index + 1} of ${count})`} className="size-full object-cover" fetchPriority="high" />
        {count > 1 && (
          <>
            {([[-1, "Previous photo", ChevronLeft, "left-3"], [1, "Next photo", ChevronRight, "right-3"]] as const).map(([d, label, Icon, side]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => step(d)}
                className={cn("absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-md hover:bg-white", side)}
              >
                <Icon className="size-5" aria-hidden />
              </button>
            ))}
            <span className="absolute right-3 bottom-3 rounded-full bg-gray-900/70 px-2.5 py-1 text-xs font-medium text-white tabular">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn("block h-16 w-24 overflow-hidden rounded-lg border-2", i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
