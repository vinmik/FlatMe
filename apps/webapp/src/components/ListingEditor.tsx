"use client";

import {
  AMENITIES,
  AREAS,
  AVAILABILITY_OPTIONS,
  dateToAvailability,
  FURNISHING,
  furnishingLabel,
  GENDER_PREFS,
  ListingInputSchema,
  ROOM_TYPES,
  type AreaName,
  type GeoPoint,
  type ListingDetail,
  type ListingInput,
} from "@flatme/shared";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { AVAILABILITY_LABEL, listingHref } from "@/lib/areas";
import { useSaveListing } from "@/lib/hooks";
import { Button, Card, Chip, Input, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { PinMap } from "./Map";
import { PhotoUploader } from "./PhotoUploader";

interface Draft {
  area: AreaName | null;
  locality: string;
  location: GeoPoint | null;
  rent: string;
  deposit: string;
  roomType: ListingInput["roomType"];
  furnishing: ListingInput["furnishing"];
  flatmates: number;
  availability: ListingInput["availability"];
  genderPreference: ListingInput["genderPreference"];
  amenities: NonNullable<ListingInput["amenities"]>;
  description: string;
  photos: string[];
}

function toDraft(l?: ListingDetail): Draft {
  if (!l) {
    return { area: null, locality: "", location: null, rent: "", deposit: "", roomType: "2BHK", furnishing: "semi-furnished", flatmates: 1, availability: "immediate", genderPreference: "any", amenities: [], description: "", photos: [] };
  }
  return {
    area: l.area,
    locality: l.locality,
    location: l.location,
    rent: String(l.rent),
    deposit: String(l.deposit),
    roomType: l.roomType,
    furnishing: l.furnishing,
    flatmates: l.flatmates,
    availability: dateToAvailability(l.availableFrom, l.flexible),
    genderPreference: l.genderPreference,
    amenities: l.amenities,
    description: l.description,
    photos: l.photos,
  };
}

const digits = (s: string) => s.replace(/\D/g, "").slice(0, 7);
/** A listing can't be published or saved without a photo. */
const MIN_PHOTOS = 1;
const GENDER_CHOICE = { any: "Anyone", male: "Men only", female: "Women only" } as const;

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-muted">{hint}</p>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function Choice({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Post a room, or edit one: a single page with four short sections, checked against the same rules the API uses. */
export function ListingEditor({ existing }: { existing?: ListingDetail }) {
  const router = useRouter();
  const save = useSaveListing(existing?.id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rent = Number(draft.rent || 0);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };

  function pickArea(name: AreaName) {
    const a = AREAS.find((x) => x.name === name)!;
    // A new area moves the pin to that area's centre; the owner then nudges it.
    setDraft((d) => ({ ...d, area: name, location: { lat: a.lat, lng: a.lng } }));
    setErrors(({ area: _a, location: _l, ...rest }) => rest);
  }

  function submit() {
    const found: Record<string, string> = {};
    if (!draft.area) found.area = "Choose the area";
    if (!draft.location) found.location = "Set the location on the map";
    if (!draft.rent) found.rent = "Enter the monthly rent";
    if (draft.photos.length < MIN_PHOTOS) found.photos = "Add at least one photo of the room";
    const parsed = ListingInputSchema.safeParse({
      ...draft,
      area: draft.area ?? undefined,
      location: draft.location ?? { lat: 0, lng: 0 },
      rent,
      deposit: Number(draft.deposit || 0),
    });
    if (!parsed.success) for (const i of parsed.error.issues) found[String(i.path[0])] ??= i.message;
    if (Object.keys(found).length) {
      setErrors(found);
      toast.error("Some details need fixing. They are marked in red.");
      document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!parsed.success) return;
    save.mutate(parsed.data, {
      onSuccess: (l) => {
        toast.success(existing ? "Changes saved" : "Your room is live!");
        router.push(listingHref(l.id));
        router.refresh();
      },
      onError: (e) => {
        if (e instanceof ApiError && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k.split(".")[0], v])));
        toast.error(errorMessage(e));
      },
    });
  }

  const areaCentre = AREAS.find((a) => a.name === draft.area) ?? AREAS[0];

  return (
    <form
      noValidate
      className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{existing ? "Edit your listing" : "Post a room"}</h1>
        <p className="mt-1 text-muted">{existing ? "Changes show up straight away." : "It takes about two minutes, and it's free."}</p>
      </div>

      <Section title="Where is it?" hint="Only the rough area is shown publicly. You share the exact address yourself.">
        <Choice label="Area" error={errors.area}>
          {AREAS.map((a) => (
            <Chip key={a.name} selected={draft.area === a.name} onClick={() => pickArea(a.name)}>
              {a.name}
            </Chip>
          ))}
        </Choice>
        <Input label="Locality or landmark" placeholder="e.g. Near Inorbit Mall, Ayyappa Society" maxLength={120} value={draft.locality} onChange={(e) => set("locality", e.target.value)} error={errors.locality} />
        <div>
          <p className="mb-2 text-sm font-medium">Location on the map</p>
          <div className="h-72 overflow-hidden rounded-xl border border-line">
            <PinMap value={draft.location} fallback={{ lat: areaCentre.lat, lng: areaCentre.lng }} onChange={(p) => set("location", p)} />
          </div>
          <p className={errors.location ? "mt-1.5 text-sm text-rose-600" : "mt-1.5 text-sm text-muted"} role={errors.location ? "alert" : undefined}>
            {errors.location ?? "Click the map or drag the dot to where the flat is."}
          </p>
        </div>
      </Section>

      <Section title="Rent and room" hint="Clear pricing gets you serious enquiries.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Monthly rent" inputMode="numeric" placeholder="15000" className="pl-8" left={<span className="font-medium">₹</span>} value={draft.rent} onChange={(e) => set("rent", digits(e.target.value))} error={errors.rent} />
          <div>
            <Input label="Deposit" inputMode="numeric" placeholder="30000" className="pl-8" left={<span className="font-medium">₹</span>} value={draft.deposit} onChange={(e) => set("deposit", digits(e.target.value))} error={errors.deposit} />
            <div className="mt-2 flex flex-wrap gap-2">
              {rent >= 1000 &&
                [1, 2, 3].map((m) => (
                  <Chip key={m} className="h-8 px-3 text-xs" selected={Number(draft.deposit) === rent * m} onClick={() => set("deposit", String(rent * m))}>
                    {m}× rent
                  </Chip>
                ))}
              <Chip className="h-8 px-3 text-xs" selected={draft.deposit === "0"} onClick={() => set("deposit", "0")}>
                No deposit
              </Chip>
            </div>
          </div>
        </div>
        <Choice label="Flat type" error={errors.roomType}>
          {ROOM_TYPES.map((r) => (
            <Chip key={r} selected={draft.roomType === r} onClick={() => set("roomType", r)}>
              {r}
            </Chip>
          ))}
        </Choice>
        <Choice label="Furnishing" error={errors.furnishing}>
          {FURNISHING.map((f) => (
            <Chip key={f} selected={draft.furnishing === f} onClick={() => set("furnishing", f)}>
              {furnishingLabel(f)}
            </Chip>
          ))}
        </Choice>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium" id="flatmates-label">
              People living there now
            </p>
            <p className="text-sm text-muted">Not counting the person moving in.</p>
          </div>
          <div className="flex items-center gap-3" role="group" aria-labelledby="flatmates-label">
            <button type="button" aria-label="One fewer" disabled={draft.flatmates === 0} onClick={() => set("flatmates", draft.flatmates - 1)} className="flex size-9 items-center justify-center rounded-full border border-line disabled:opacity-40">
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-5 text-center text-lg font-semibold tabular" aria-live="polite">
              {draft.flatmates}
            </span>
            <button type="button" aria-label="One more" disabled={draft.flatmates === 6} onClick={() => set("flatmates", draft.flatmates + 1)} className="flex size-9 items-center justify-center rounded-full border border-line disabled:opacity-40">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Details" hint="Who it suits, when it is free and what comes with it.">
        <Choice label="Available from" error={errors.availability}>
          {AVAILABILITY_OPTIONS.map((o) => (
            <Chip key={o} selected={draft.availability === o} onClick={() => set("availability", o)}>
              {AVAILABILITY_LABEL[o]}
            </Chip>
          ))}
        </Choice>
        <Choice label="Open to" error={errors.genderPreference}>
          {GENDER_PREFS.map((g) => (
            <Chip key={g} selected={draft.genderPreference === g} onClick={() => set("genderPreference", g)}>
              {GENDER_CHOICE[g]}
            </Chip>
          ))}
        </Choice>
        <Choice label="What's included" error={errors.amenities}>
          {AMENITIES.map((a) => (
            <Chip key={a} selected={draft.amenities.includes(a)} onClick={() => set("amenities", draft.amenities.includes(a) ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a])}>
              {a}
            </Chip>
          ))}
        </Choice>
        <Textarea
          label="Description (optional)"
          placeholder="Who lives there, what the flat is like, the commute, house rules…"
          maxLength={1000}
          rows={5}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          hint={`${draft.description.length} / 1000`}
        />
      </Section>

      <Section title="Photos (required)" hint="Add at least one. Bright, tidy photos of the room, kitchen and bathroom work best.">
        <PhotoUploader value={draft.photos} onChange={(p) => set("photos", p)} error={errors.photos} />
      </Section>

      <div className="sticky bottom-14 z-10 flex justify-end gap-3 rounded-brand border border-line bg-surface/95 p-3 shadow-pop backdrop-blur md:bottom-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {existing ? "Save changes" : "Publish listing"}
        </Button>
      </div>
    </form>
  );
}
