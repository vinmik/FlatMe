"use client";

import { AREAS, companyFromEmail } from "@flatme/shared";
import { LocateFixed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useUpdateProfile } from "@/lib/hooks";
import { usePlace } from "@/lib/place";
import { useSession } from "@/lib/session";
import { Button, Card, Chip } from "@/ui";
import { toast } from "@/ui/toast";
import { draftFromUser, ProfileForm, validateProfile } from "./ProfileForm";

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((n) => (
        <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-primary" : "bg-gray-200")} />
      ))}
      <span className="text-sm font-medium text-muted tabular">{step} of 2</span>
    </div>
  );
}

/** Two short steps after first sign-in: who you are, then where you work. */
export function Onboarding() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/flats";
  const user = useSession((s) => s.user)!;
  const save = useUpdateProfile();
  const { place, setArea, locate } = usePlace();
  const [step, setStep] = useState<1 | 2>(user.profileComplete ? 2 : 1);
  const [draft, setDraft] = useState(() => draftFromUser(user, companyFromEmail(user.email)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);

  function submitProfile() {
    const v = validateProfile(draft);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    save.mutate(v.value, { onSuccess: () => setStep(2), onError: (e) => toast.error(errorMessage(e)) });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <Steps step={step} />
        {step === 1 ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitProfile();
            }}
          >
            <h1 className="mt-6 text-2xl font-bold tracking-tight">Tell us about you</h1>
            <p className="mt-2 mb-6 text-[15px] text-muted">Owners and flatmates see your name, company and job title. It is what makes FlatMe trusted.</p>
            <ProfileForm value={draft} onChange={setDraft} errors={errors} />
            <Button type="submit" size="lg" className="mt-7 w-full" loading={save.isPending}>
              Continue
            </Button>
          </form>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">Where do you work?</h1>
            <p className="mt-2 text-[15px] text-muted">Pick your office area and we&apos;ll show the closest flats first. You can change it any time.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <Chip key={a.name} selected={place?.label === a.name} onClick={() => setArea(a.name)}>
                  {a.name}
                </Chip>
              ))}
            </div>
            <Button
              variant="soft"
              className="mt-4"
              loading={locating}
              icon={<LocateFixed className="size-4" aria-hidden />}
              onClick={async () => {
                setLocating(true);
                const ok = await locate();
                setLocating(false);
                if (!ok) toast.error("Couldn't get your location. Pick an area instead.");
              }}
            >
              {place?.label === "My location" ? "Using your current location" : "Use my current location"}
            </Button>
            <div className="mt-7 grid gap-2">
              <Button size="lg" disabled={!place} onClick={() => router.replace(next)}>
                {place ? `Show flats near ${place.label}` : "Pick an area to continue"}
              </Button>
              <Button variant="ghost" onClick={() => router.replace(next)}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
