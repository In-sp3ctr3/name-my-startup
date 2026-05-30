import type { Actor, AuditEvent, ProductEvent } from "@/lib/types";

export function createAuditEvent(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  metadata: AuditEvent["metadata"] = {}
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    actorUserId: actor.userId,
    orgId: actor.orgId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  };
}

export function createProductEvent(orgId: string, eventName: string, metadata: ProductEvent["metadata"] = {}): ProductEvent {
  return {
    id: crypto.randomUUID(),
    orgId,
    eventName,
    metadata,
    createdAt: new Date().toISOString()
  };
}

