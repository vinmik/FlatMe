import { CorporateEmailSchema, LIMITS } from "@flatme/shared";
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button, Input } from "@/components/ui";
import { errorMessage, isApiError } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth/store";
import { config } from "@/lib/config";
import { useRequestOtp, useVerifyOtp } from "./hooks";
import { NotAuthorized } from "./NotAuthorized";
import { OtpInput } from "./OtpInput";

const DEMO_EMAIL = "admin@flatme.in";

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="relative flex items-center gap-2.5 text-lg font-semibold">
        <img src="/favicon.svg" alt="" className="size-9 rounded-[10px] ring-2 ring-white/30" />
        FlatMe <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-medium">Admin</span>
      </div>
      <div className="relative max-w-md">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl leading-tight font-semibold tracking-tight"
        >
          Keep Hyderabad&apos;s flat-sharing community safe and thriving.
        </motion.h1>
        <p className="mt-4 text-cyan-100">
          Moderate listings, resolve reports and support verified professionals — all from one place.
        </p>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            ["Verified", "work emails only"],
            ["10 areas", "across the city"],
            ["24h", "report SLA"],
          ].map(([a, b], i) => (
            <motion.div
              key={a}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="rounded-brand bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur"
            >
              <p className="text-lg font-semibold">{a}</p>
              <p className="text-xs text-cyan-100">{b}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="relative text-xs text-cyan-100/80">Operator access is restricted and audited.</p>
    </div>
  );
}

const step = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.22, ease: "easeOut" as const },
};

export function LoginPage() {
  const { token, user, signOutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState(config.useMocks ? DEMO_EMAIL : "");
  const [emailError, setEmailError] = useState<string>();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [phase, setPhase] = useState<"email" | "code" | "denied">("email");
  const [devCode, setDevCode] = useState<string>();
  const [resendIn, setResendIn] = useState(0);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (token && user?.role === "admin") return <Navigate to={from} replace />;
  if (phase === "denied") {
    return (
      <NotAuthorized
        email={email}
        onRetry={() => {
          setPhase("email");
          setCode("");
        }}
      />
    );
  }

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const parsed = CorporateEmailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setEmailError(undefined);
    try {
      const res = await requestOtp.mutateAsync(parsed.data);
      setEmail(parsed.data);
      setDevCode(res.devCode);
      setResendIn(res.resendInSec);
      setCode("");
      setCodeError(undefined);
      setPhase("code");
      authStore.clearReason();
    } catch (err) {
      setEmailError(
        isApiError(err) && err.code === "rate_limited" && err.retryAfterSec
          ? `Too many requests — try again in ${Math.ceil(err.retryAfterSec / 60)} min.`
          : errorMessage(err),
      );
    }
  };

  const verify = async (value = code) => {
    if (value.length !== LIMITS.otpLength || verifyOtp.isPending) return;
    setCodeError(undefined);
    try {
      const res = await verifyOtp.mutateAsync({ email, code: value });
      if (res.user.role !== "admin") {
        // Never persist a non-admin token.
        authStore.signOut("manual");
        setPhase("denied");
        return;
      }
      authStore.signIn(res.token, res.user);
      navigate(from, { replace: true });
    } catch (err) {
      setCodeError(errorMessage(err));
      setCode("");
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/favicon.svg" alt="" className="size-9 rounded-[10px]" />
            <span className="text-lg font-semibold">FlatMe Admin</span>
          </div>

          {signOutReason && signOutReason !== "manual" && phase === "email" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              className="mb-6 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {signOutReason === "expired" ? "Your session expired. Please sign in again." : "Your account no longer has admin access."}
            </motion.div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {phase === "email" ? (
              <motion.form key="email" {...step} onSubmit={sendCode} noValidate className="space-y-6">
                <div>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-brand bg-accent text-accent-fg">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Sign in to Admin</h2>
                  <p className="mt-1.5 text-sm text-muted">We&apos;ll email a 6-digit code to your work address.</p>
                </div>
                <Input
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  leading={<Mail className="size-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                />
                <Button type="submit" size="lg" className="w-full" loading={requestOtp.isPending}>
                  Send code <ArrowRight className="size-4" />
                </Button>
                {config.useMocks && (
                  <p className="flex items-start gap-2 rounded-brand bg-accent/60 px-3 py-2.5 text-xs text-accent-fg">
                    <Sparkles className="mt-px size-3.5 shrink-0" />
                    <span>
                      Demo mode with mock data. Use <strong>{DEMO_EMAIL}</strong> for admin access, or any other work email to see
                      the &ldquo;not authorized&rdquo; screen.
                    </span>
                  </p>
                )}
              </motion.form>
            ) : (
              <motion.form
                key="code"
                {...step}
                onSubmit={(e) => {
                  e.preventDefault();
                  void verify();
                }}
                className="space-y-6"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setPhase("email")}
                    className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg"
                  >
                    <ArrowLeft className="size-4" /> Change email
                  </button>
                  <h2 className="text-2xl font-semibold tracking-tight">Check your inbox</h2>
                  <p className="mt-1.5 text-sm text-muted">
                    Enter the code sent to <span className="font-medium text-fg">{email}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <OtpInput
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      if (codeError) setCodeError(undefined);
                    }}
                    onComplete={(v) => void verify(v)}
                    disabled={verifyOtp.isPending}
                    invalid={!!codeError}
                    autoFocus
                  />
                  {codeError && (
                    <p role="alert" className="text-sm font-medium text-rose-600">
                      {codeError}
                    </p>
                  )}
                </div>
                {devCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between gap-3 rounded-brand border border-dashed border-primary/40 bg-accent/50 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm text-accent-fg">
                      <KeyRound className="size-4" /> Dev code: <code className="font-semibold tracking-[0.3em]">{devCode}</code>
                    </span>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => {
                        setCode(devCode);
                        void verify(devCode);
                      }}
                    >
                      Use it
                    </Button>
                  </motion.div>
                )}
                <Button type="submit" size="lg" className="w-full" loading={verifyOtp.isPending} disabled={code.length !== LIMITS.otpLength}>
                  Verify &amp; sign in
                </Button>
                <p className="text-center text-sm text-muted">
                  Didn&apos;t get it?{" "}
                  {resendIn > 0 ? (
                    <span className="tabular">Resend in {resendIn}s</span>
                  ) : (
                    <button type="button" className="font-medium text-primary hover:underline" onClick={() => void sendCode()}>
                      Resend code
                    </button>
                  )}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
