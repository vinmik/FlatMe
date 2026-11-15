"use client";

import { COMPANIES, UpdateProfileSchema, type UpdateProfile, type User } from "@flatme/shared";
import { Camera } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { errorMessage } from "@/lib/api";
import { Avatar, Chip, Input } from "@/ui";
import { toast } from "@/ui/toast";
import { uploadImage } from "./PhotoUploader";

export interface ProfileDraft {
  fullName: string;
  company: string;
  designation: string;
  phone: string;
  avatarUrl: string | null;
}

export function draftFromUser(user: User, suggestedCompany?: string): ProfileDraft {
  return { fullName: user.fullName, company: user.company || suggestedCompany || "", designation: user.designation, phone: user.phone, avatarUrl: user.avatarUrl };
}

export function validateProfile(d: ProfileDraft): { ok: true; value: UpdateProfile } | { ok: false; errors: Record<string, string> } {
  const r = UpdateProfileSchema.safeParse(d);
  if (r.success) return { ok: true, value: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
  return { ok: false, errors };
}

export function ProfileForm({ value, onChange, errors }: { value: ProfileDraft; onChange: (d: ProfileDraft) => void; errors: Record<string, string> }) {
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof ProfileDraft, v: string | null) => onChange({ ...value, [k]: v });
  const suggestions = useMemo(() => {
    const q = value.company.trim().toLowerCase();
    if (COMPANIES.some((c) => c.toLowerCase() === q)) return [];
    return COMPANIES.filter((c) => c !== "Other" && (!q || c.toLowerCase().startsWith(q))).slice(0, 8);
  }, [value.company]);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      set("avatarUrl", await uploadImage(file, "avatar"));
    } catch (e) {
      toast.error(e instanceof Error && !(e as { status?: number }).status ? e.message : errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <label htmlFor={fileId} className="relative shrink-0 rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary" style={{ opacity: uploading ? 0.6 : 1 }}>
          <Avatar name={value.fullName || "?"} src={value.avatarUrl} size={72} />
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-primary text-white">
            <Camera className="size-3.5" aria-hidden />
          </span>
          <span className="sr-only">Add a profile photo</span>
          <input id={fileId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void pickAvatar(e.target.files?.[0])} />
        </label>
        <p className="text-sm text-muted">{uploading ? "Uploading…" : "Add a photo (optional). Profiles with a photo get more replies."}</p>
      </div>

      <Input label="Full name" name="name" autoComplete="name" placeholder="e.g. Rahul Sharma" value={value.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} />

      <div>
        <Input label="Company" name="organization" autoComplete="organization" placeholder="Where do you work?" value={value.company} onChange={(e) => set("company", e.target.value)} error={errors.company} />
        {suggestions.length > 0 && (
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {suggestions.map((c) => (
              <Chip key={c} className="h-8 px-3 text-xs" onClick={() => set("company", c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <Input label="Job title" name="title" autoComplete="organization-title" placeholder="e.g. Software Engineer" value={value.designation} onChange={(e) => set("designation", e.target.value)} error={errors.designation} />

      <Input
        label="Mobile number"
        name="tel"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="98765 43210"
        maxLength={14}
        className="pl-12"
        left={<span className="text-[15px] font-medium">+91</span>}
        value={value.phone}
        onChange={(e) => set("phone", e.target.value)}
        error={errors.phone}
        hint="Shown only to signed-in members who open your listing. You can hide it in settings."
      />
    </div>
  );
}
