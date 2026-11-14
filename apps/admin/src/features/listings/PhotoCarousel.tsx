import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ListingPhoto } from "./ListingBits";

export function PhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const count = photos.length;
  if (count === 0) return <ListingPhoto src={null} alt={alt} className="aspect-[4/3] w-full rounded-brand" />;

  const go = (delta: number) => setState(([i]) => [(i + delta + count) % count, delta]);
  const current = Math.min(index, count - 1);

  return (
    <div
      className="group relative overflow-hidden rounded-brand bg-surface-2"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="relative aspect-[4/3] w-full">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={current}
            custom={dir}
            className="absolute inset-0"
            initial={{ x: dir >= 0 ? "100%" : "-100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir >= 0 ? "-100%" : "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            <ListingPhoto src={photos[current]} alt={`${alt} — photo ${current + 1} of ${count}`} className="pointer-events-none size-full select-none" />
          </motion.div>
        </AnimatePresence>
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100"
            aria-label="Next photo"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setState([i, i > current ? 1 : -1])}
                className={cn("h-1.5 rounded-full bg-white transition-all", i === current ? "w-5" : "w-1.5 opacity-60 hover:opacity-100")}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === current}
              />
            ))}
          </div>
          <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white tabular">
            {current + 1}/{count}
          </span>
        </>
      )}
    </div>
  );
}
