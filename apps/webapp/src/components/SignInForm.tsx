"use client";

import { LIMITS, OtpRequestSchema } from "@flatme/shared";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button, Card, Input } from "@/ui";
import { toast } from "@/ui/toast";

/** Only same-site paths are followed after sign-in. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/flats");

export function SignInForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);

  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (ready && user) router.replace(user.profileComplete ? next : `/welcome?next=${encodeURIComponent(next)}`);
  }, [ready, user, next, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function requestCode(address: string) {
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.requestOtp(address);
      setSentTo(address);
      setCode("");
      setDevCode(res.devCode);
      setResendIn(res.resendInSec);
    } catch (e) {
      if (e instanceof ApiError && e.retryAfterSec) setResendIn(e.retryAfterSec);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    const parsed = OtpRequestSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    void requestCode(parsed.data.email);
  }

  async function verify(value: string) {
    if (!sentTo || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.verifyOtp(sentTo, value);
      useSession.getState().signIn(res.token, res.user);
      toast.success(res.isNewUser ? "Email verified. Welcome to FlatMe!" : "Signed in");
    } catch (e) {
      setError(errorMessage(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <Card className="p-6 sm:p-8">
        {!sentTo ? (
          <form onSubmit={submitEmail} noValidate>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-hover">
              <BadgeCheck className="size-4" aria-hidden />
              Verified members only
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Sign in with your work email</h1>
            <p className="mt-2 text-[15px] text-muted">We&apos;ll email you a 6-digit code. There is no password, and new accounts are created automatically.</p>
            <div className="mt-6">
              <Input
                label="Work email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                hint="Personal mailboxes such as Gmail aren't accepted."
              />
            </div>
            <Button type="submit" size="lg" className="mt-5 w-full" loading={busy}>
              Email me a code
            </Button>
          </form>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === LIMITS.otpLength) void verify(code);
              else setError("Enter the 6-digit code");
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setError(undefined);
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Use a different email
            </button>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Enter your code</h1>
            <p className="mt-2 text-[15px] text-muted">
              We sent a 6-digit code to <span className="font-medium text-fg">{sentTo}</span>. It works for 10 minutes. Check spam if you don&apos;t see it.
            </p>
            <div className="mt-6">
              <Input
                label="6-digit code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={LIMITS.otpLength}
                placeholder="••••••"
                className="text-center text-2xl font-semibold tracking-[0.5em] tabular"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, LIMITS.otpLength);
                  setCode(v);
                  if (v.length === LIMITS.otpLength) void verify(v);
                }}
                error={error}
              />
            </div>
            {devCode && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Development server: your code is <span className="font-semibold tabular">{devCode}</span>
              </p>
            )}
            <Button type="submit" size="lg" className="mt-5 w-full" loading={busy}>
              Verify and continue
            </Button>
            <div className="mt-4 text-center text-sm text-muted">
              {resendIn > 0 ? (
                <span className="tabular">You can ask for a new code in {resendIn}s</span>
              ) : (
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => void requestCode(sentTo)}>
                  Send a new code
                </button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
