import { randomUUID } from "node:crypto";
import type { AuditEntry } from "@flatme/shared";
import type { UserEntity } from "../domain/entities";
import type { AuditRepository, Clock } from "../ports";

/** Audit entries expire after a year (Cosmos per-item TTL). */
export const AUDIT_TTL_SEC = 365 * 24 * 60 * 60;

export class AuditService {
  constructor(
    private readonly audit: AuditRepository,
    private readonly clock: Clock,
  ) {}

  async record(
    actor: UserEntity,
    action: AuditEntry["action"],
    targetType: AuditEntry["targetType"],
    targetId: string,
    details: string,
  ): Promise<void> {
    await this.audit.append({
      id: randomUUID(),
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      targetType,
      targetId,
      details,
      createdAt: this.clock.now().toISOString(),
      ttl: AUDIT_TTL_SEC,
    });
  }
}
