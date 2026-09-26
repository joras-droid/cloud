import "server-only";
import { db } from "@/db";
import * as s from "@/db/schema";

/**
 * Append-only history for anything money- or trust-related. When a customer
 * disputes a price or a payment months later, this is the only record that can
 * settle it.
 */
export async function writeAudit(entry: {
  actorId: string;
  entity: string;
  entityId: string;
  action: string;
  diff?: unknown;
}): Promise<void> {
  await db.insert(s.auditLog).values({
    actorId: entry.actorId,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    diff: entry.diff ?? null,
  });
}
