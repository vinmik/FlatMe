import { RefreshCw } from "lucide-react";
import { errorMessage } from "@/lib/api/client";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export function ErrorState({ error, onRetry, title = "Couldn't load this" }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <EmptyState
      illustration="error"
      title={title}
      description={errorMessage(error)}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="size-4" />}>
            Try again
          </Button>
        )
      }
    />
  );
}
