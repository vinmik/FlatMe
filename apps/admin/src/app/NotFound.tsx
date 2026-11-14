import { Link } from "react-router";
import { EmptyState } from "@/components/ui";

export function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <EmptyState
        illustration="lost"
        title="Page not found"
        description="This room seems to have been rented out. The page you're looking for doesn't exist."
        action={
          <Link to="/" className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-hover">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
