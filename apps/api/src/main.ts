// Entry point: each module registers its HTTP triggers via app.http(...) on import.
import { getServices } from "./composition";
import "./functions/system";
import "./functions/auth";
import "./functions/me";
import "./functions/listings";
import "./functions/media";
import "./functions/admin";

// Build the service graph at worker start so configuration errors and security warnings
// (e.g. ADMIN_AUTH_DISABLED) surface in the startup logs rather than on the first request.
try {
  getServices();
} catch (err) {
  console.error(`FlatMe API failed to initialise: ${err instanceof Error ? err.message : String(err)}`);
}
