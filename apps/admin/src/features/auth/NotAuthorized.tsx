import { LogIn, ShieldX } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui";

export function NotAuthorized({ email, onRetry }: { email?: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-full items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-pop"
      >
        <motion.div
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950"
        >
          <ShieldX className="size-8" />
        </motion.div>
        <h1 className="mt-5 text-xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-sm text-muted">
          {email ? (
            <>
              <span className="font-medium text-fg">{email}</span> doesn&apos;t have operator access.
            </>
          ) : (
            "This account doesn't have operator access."
          )}{" "}
          The admin portal is limited to the FlatMe team. Ask an existing admin to promote your account.
        </p>
        <Button className="mt-6" variant="secondary" onClick={onRetry} icon={<LogIn className="size-4" />}>
          Sign in with a different account
        </Button>
      </motion.div>
    </main>
  );
}
