"use client";

import type { UpdatePrefs } from "@flatme/shared";
import { BadgeCheck, LogOut } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { config } from "@/lib/config";
import { signOutEverywhere, useDeleteAccount, useUpdatePrefs, useUpdateProfile } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Button, Card, Input, Modal, Toggle } from "@/ui";
import { toast } from "@/ui/toast";
import { PlacePicker } from "./PlacePicker";
import { draftFromUser, ProfileForm, validateProfile } from "./ProfileForm";

export function ProfileSettings() {
  const user = useSession((s) => s.user)!;
  const saveProfile = useUpdateProfile();
  const savePrefs = useUpdatePrefs();
  const del = useDeleteAccount();
  const [draft, setDraft] = useState(() => draftFromUser(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");

  const pref = (input: UpdatePrefs) => savePrefs.mutate(input, { onError: (e) => toast.error(errorMessage(e)) });

  function submit() {
    const v = validateProfile(draft);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    saveProfile.mutate(v.value, { onSuccess: () => toast.success("Profile saved"), onError: (e) => toast.error(errorMessage(e)) });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile &amp; settings</h1>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="mt-1 mb-5 flex items-center gap-1.5 text-sm text-muted">
          <BadgeCheck className="size-4 text-primary" aria-hidden />
          Verified with {user.email}
        </p>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <ProfileForm value={draft} onChange={setDraft} errors={errors} />
          <Button type="submit" className="mt-6" loading={saveProfile.isPending}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Where you work</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Flats are sorted by distance from this place. Saved on this device only.</p>
        <PlacePicker />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <Toggle
          label="Show my phone number on my listings"
          description="When off, members can still email you or message you through FlatMe."
          checked={user.privacy.showPhone}
          disabled={savePrefs.isPending}
          onChange={(v) => pref({ privacy: { showPhone: v } })}
        />
        <h2 className="mt-5 text-lg font-semibold">Emails from FlatMe</h2>
        <div className="divide-y divide-line">
          <Toggle label="Messages about my listings" description="When someone contacts you about a room." checked={user.notifications.messages} disabled={savePrefs.isPending} onChange={(v) => pref({ notifications: { messages: v } })} />
          <Toggle label="New flats near me" checked={user.notifications.newListings} disabled={savePrefs.isPending} onChange={(v) => pref({ notifications: { newListings: v } })} />
          <Toggle label="Price drops on saved flats" checked={user.notifications.priceDrops} disabled={savePrefs.isPending} onChange={(v) => pref({ notifications: { priceDrops: v } })} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted">
          Need help? Write to{" "}
          <a href={`mailto:${config.supportEmail}`} className="font-medium text-primary hover:underline">
            {config.supportEmail}
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<LogOut className="size-4" aria-hidden />}
            onClick={signOutEverywhere}
          >
            Sign out
          </Button>
          <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirm(true)}>
            Delete my account
          </Button>
        </div>
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep my account
            </Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== "DELETE"}
              loading={del.isPending}
              onClick={() =>
del.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) })
              }
            >
              Delete account
            </Button>
          </>
        }
      >
        <p className="mb-4 text-[15px] text-muted">This permanently deletes your profile, your listings and your saved flats. It can&apos;t be undone.</p>
        <Input label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Modal>
    </div>
  );
}
