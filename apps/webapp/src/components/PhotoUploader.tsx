"use client";

import { LIMITS } from "@flatme/shared";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { toast } from "@/ui/toast";

/** Uploads one image and returns its public address. Shared by listing photos and profile pictures. */
export async function uploadImage(file: File, purpose: "listing" | "avatar"): Promise<string> {
  return api.uploadPhoto(await compressImage(file), purpose);
}

export function PhotoUploader({ value, onChange, error }: { value: string[]; onChange: (photos: string[]) => void; error?: string }) {
  const id = useId();
  const [uploading, setUploading] = useState(0);
  const room = LIMITS.photosPerListing - value.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast.error(`Only ${LIMITS.photosPerListing} photos per listing. The extra ones were skipped.`);
    setUploading(picked.length);
    const uploaded: string[] = [];
    for (const file of picked) {
      try {
        uploaded.push(await uploadImage(file, "listing"));
      } catch (e) {
        toast.error(e instanceof Error && !(e as { status?: number }).status ? e.message : errorMessage(e));
      }
      setUploading((n) => n - 1);
    }
    setUploading(0);
    if (uploaded.length) onChange([...value, ...uploaded]);
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((src, i) => (
          <li key={src} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gray-900/75 px-2 py-0.5 text-xs font-medium text-white">Cover</span>}
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(value.filter((p) => p !== src))}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/95 shadow hover:bg-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`u${i}`} role="status" aria-label="Uploading photo" className="flex aspect-square items-center justify-center rounded-xl border border-line bg-gray-50">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          </li>
        ))}
        {room - uploading > 0 && (
          <li>
            <label
              htmlFor={id}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary has-[:focus-visible]:border-primary"
            >
              <ImagePlus className="size-6" aria-hidden />
              Add photos
              <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void add(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>
      <p className={error ? "mt-2 text-sm text-rose-600" : "mt-2 text-sm text-muted"} role={error ? "alert" : undefined}>
        {error ?? `At least 1 photo, up to ${LIMITS.photosPerListing}. The first one is the cover.`}
      </p>
    </div>
  );
}
