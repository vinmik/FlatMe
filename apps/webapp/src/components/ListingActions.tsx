"use client";

import { formatRupees, InquiryInputSchema, REPORT_REASON_LABELS, REPORT_REASONS, type ListingDetail, type PublicListing, type ReportInput } from "@flatme/shared";
import { BadgeCheck, CheckCircle2, Eye, Flag, Lock, Mail, MessageCircle, MessageSquare, Pause, Pencil, Phone, Play, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { listingTitle } from "@/lib/areas";
import { errorMessage } from "@/lib/api";
import { useDeleteListing, useListing, useReportListing, useSendInquiry, useSetListingStatus } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Avatar, Button, buttonClass, Card, Modal, Skeleton, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { HeartButton } from "./ListingCard";

/** The interactive side of a listing page: price, contact (signed-in only), save, share, report and owner controls. */
export function ListingActions({ listing }: { listing: PublicListing }) {
  const path = usePathname();
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);
  const detail = useListing(listing.id);
  const [reporting, setReporting] = useState(false);

  async function share() {
    const data = { title: listingTitle(listing), url: window.location.href };
    if (navigator.share) return void navigator.share(data).catch(() => {});
    await navigator.clipboard.writeText(data.url).then(
      () => toast.success("Link copied"),
      () => toast.error("Couldn't copy the link"),
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="tabular">
            <span className="text-3xl font-bold tracking-tight">{formatRupees(listing.rent)}</span>
            <span className="text-muted"> /month</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={share} aria-label="Share this flat" className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-fg hover:bg-gray-50">
              <Share2 className="size-[18px]" aria-hidden />
            </button>
            <HeartButton listing={listing} className="border border-line shadow-none" />
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">{listing.deposit > 0 ? `${formatRupees(listing.deposit)} deposit` : "No deposit"}</p>

        <div className="mt-5 border-t border-line pt-5">
          {!ready || (user && detail.isPending) ? (
            <div role="status" aria-label="Loading contact details" className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : !user ? (
            <SignedOut firstName={listing.owner.firstName} next={path} />
          ) : !user.profileComplete ? (
            <div>
              <p className="text-[15px] text-muted">Finish your profile so {listing.owner.firstName} knows who is getting in touch.</p>
              <Link href={`/welcome?next=${encodeURIComponent(path)}`} className={buttonClass("primary", "md", "mt-4 w-full")}>
                Complete profile
              </Link>
            </div>
          ) : detail.isError || !detail.data ? (
            <p role="alert" className="text-[15px] text-muted">
              {errorMessage(detail.error, "Couldn't load contact details. Refresh the page to try again.")}
            </p>
          ) : detail.data.isOwner ? (
            <OwnerPanel listing={detail.data} />
          ) : (
            <ContactPanel listing={detail.data} />
          )}
        </div>
      </Card>

      {user && detail.data && !detail.data.isOwner && (
        <button type="button" onClick={() => setReporting(true)} className="mx-auto flex items-center gap-1.5 text-sm text-muted hover:text-rose-600">
          <Flag className="size-4" aria-hidden />
          Report this listing
        </button>
      )}
      <ReportModal id={listing.id} open={reporting} onClose={() => setReporting(false)} />
    </div>
  );
}

function SignedOut({ firstName, next }: { firstName: string; next: string }) {
  return (
    <div>
      <p className="flex items-start gap-2 text-[15px] text-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Contact details are shown only to members verified with a work email.
      </p>
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "lg", "mt-4 w-full")}>
        Sign in to contact {firstName}
      </Link>
    </div>
  );
}

function ContactPanel({ listing }: { listing: ListingDetail }) {
  const send = useSendInquiry(listing.id);
  const [message, setMessage] = useState(`Hi ${listing.owner.firstName}, I'm interested in your ${listing.roomType} in ${listing.area}. Is it still available?`);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const { phone, email, name } = listing.contact;
  const text = encodeURIComponent(message);

  function submit() {
    const parsed = InquiryInputSchema.safeParse({ message });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    send.mutate(parsed.data.message, { onSuccess: () => setSent(true), onError: (e) => setError(errorMessage(e)) });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={listing.owner.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{name}</span>
            {listing.owner.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified work email" />}
          </p>
          <p className="truncate text-sm text-muted">
            {[listing.owner.designation, listing.owner.company].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {phone ? (
          <>
            <a href={`tel:+91${phone}`} className={buttonClass("soft", "md", "flex-col !h-16 !gap-1 text-xs")}>
              <Phone className="size-5" aria-hidden />
              Call
            </a>
            <a href={`https://wa.me/91${phone}?text=${text}`} target="_blank" rel="noopener noreferrer" className={buttonClass("soft", "md", "flex-col !h-16 !gap-1 !bg-green-50 text-xs !text-green-700")}>
              <MessageCircle className="size-5" aria-hidden />
              WhatsApp
            </a>
          </>
        ) : null}
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Your ${listing.roomType} in ${listing.area} on FlatMe`)}&body=${text}`} className={buttonClass("soft", "md", "flex-col !h-16 !gap-1 !bg-violet-50 text-xs !text-violet-700")}>
          <Mail className="size-5" aria-hidden />
          Email
        </a>
      </div>
      {phone ? <p className="mt-2 text-sm text-muted tabular">+91 {phone}</p> : <p className="mt-2 text-sm text-muted">{name.split(" ")[0]} prefers not to share a phone number.</p>}

      <div className="mt-5 border-t border-line pt-5">
        {sent ? (
          <p role="status" className="flex items-start gap-2 text-[15px] text-emerald-700">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            Message sent. {name.split(" ")[0]} has your name, company and email, and can reply to you directly.
          </p>
        ) : (
          <>
            <Textarea label="Or send a message through FlatMe" value={message} onChange={(e) => setMessage(e.target.value)} error={error} maxLength={1000} rows={4} />
            <Button className="mt-3 w-full" loading={send.isPending} icon={<MessageSquare className="size-4" aria-hidden />} onClick={submit}>
              Send message
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function OwnerPanel({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const setStatus = useSetListingStatus();
  const del = useDeleteListing();
  const [confirm, setConfirm] = useState(false);
  const paused = listing.status === "paused";

  return (
    <div>
      <p className="text-sm font-semibold">This is your listing</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[
          [Eye, listing.stats.views, "views"],
          [MessageSquare, listing.stats.inquiries, "messages"],
        ].map(([Icon, n, label]) => {
          const I = Icon as typeof Eye;
          return (
            <div key={label as string} className="rounded-xl bg-canvas px-4 py-3">
              <dd className="flex items-center gap-2 text-xl font-bold tabular">
                <I className="size-4 text-muted" aria-hidden />
                {n as number}
              </dd>
              <dt className="text-sm text-muted">{label as string}</dt>
            </div>
          );
        })}
      </dl>
      <div className="mt-4 grid gap-2">
        <Link href={`/listing/${listing.id}/edit`} className={buttonClass("primary", "md")}>
          <Pencil className="size-4" aria-hidden />
          Edit listing
        </Link>
        <Button
          variant="secondary"
          loading={setStatus.isPending}
          icon={paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          onClick={() =>
            setStatus.mutate(
              { id: listing.id, status: paused ? "active" : "paused" },
              {
                onSuccess: () => {
                  toast.success(paused ? "Listing is live again" : "Listing paused. It is hidden from everyone else.");
                  if (!paused) router.push("/my-listings");
                },
                onError: (e) => toast.error(errorMessage(e)),
              },
            )
          }
        >
          {paused ? "Make live again" : "Pause listing"}
        </Button>
        <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirm(true)}>
          Delete listing
        </Button>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this listing?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep listing
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() =>
                del.mutate(listing.id, {
                  onSuccess: () => {
                    toast.success("Listing deleted");
                    router.push("/my-listings");
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              Delete listing
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-muted">This removes the listing and its messages for good. If the room is only taken for now, pause it instead.</p>
      </Modal>
    </div>
  );
}

function ReportModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const report = useReportListing(id);
  const [reason, setReason] = useState<ReportInput["reason"]>("scam");
  const [details, setDetails] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report this listing"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={report.isPending}
            onClick={() =>
              report.mutate(
                { reason, details },
                {
                  onSuccess: () => {
                    toast.success("Report sent. Our team will review it.");
                    onClose();
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          >
            Send report
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="text-[15px] text-muted">What&apos;s wrong with it? The owner won&apos;t see who reported.</legend>
        <div className="mt-3 space-y-1">
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] hover:bg-gray-50">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-primary" />
              {REPORT_REASON_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4">
        <Textarea label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} />
      </div>
    </Modal>
  );
}
