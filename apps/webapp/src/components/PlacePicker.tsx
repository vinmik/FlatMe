"use client";

import { AREAS } from "@flatme/shared";
import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { usePlace } from "@/lib/place";
import { Button, Chip, Modal } from "@/ui";
import { toast } from "@/ui/toast";

/** "Flats near…" control: pick your office area, or use the device's location. */
export function PlacePicker() {
  const { place, setArea, locate, clear } = usePlace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function useDevice() {
    setBusy(true);
    const ok = await locate();
    setBusy(false);
    if (ok) setOpen(false);
    else toast.error("Couldn't get your location. Allow it in the browser, or pick an area instead.");
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon={<MapPin className="size-4 text-primary" aria-hidden />} onClick={() => setOpen(true)}>
        {place ? `Near ${place.label}` : "Set where you work"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Show flats near"
        footer={
          place && (
            <Button
              variant="ghost"
              onClick={() => {
                clear();
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )
        }
      >
        <p className="text-[15px] text-muted">Pick the area you work in. Flats are then sorted by distance from it. This is saved on this device only.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <Chip
              key={a.name}
              selected={place?.label === a.name}
              onClick={() => {
                setArea(a.name);
                setOpen(false);
              }}
            >
              {a.name}
            </Chip>
          ))}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="soft" loading={busy} icon={<LocateFixed className="size-4" aria-hidden />} onClick={useDevice}>
            Use my current location
          </Button>
        </div>
      </Modal>
    </>
  );
}
