import { Component, type ErrorInfo, type ReactNode } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button, EmptyState } from "@/components/ui";

function Fallback({ title, message, onReset }: { title: string; message: string; onReset?: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        illustration="error"
        title={title}
        description={message}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
            {onReset ? (
              <Button onClick={onReset}>Try again</Button>
            ) : (
              <Link to="/" className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
                Go to dashboard
              </Link>
            )}
          </div>
        }
      />
    </div>
  );
}

/** Last-resort boundary for render errors outside the router. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return <Fallback title="Something broke" message={this.state.error.message} onReset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

/** Router `errorElement` for loader/render errors inside routes. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <Fallback title={`${error.status} ${error.statusText}`} message="The page couldn't be displayed." />;
  }
  return <Fallback title="Something went wrong" message={error instanceof Error ? error.message : "Unexpected error"} />;
}
