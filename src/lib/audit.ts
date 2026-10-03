import { createAdminClient } from "@/lib/supabase/server";

export interface AuditEvent {
  schoolId: string;
  /** Identifiant de l'utilisateur agissant (optionnel : best-effort) */
  userId?: string | null;
  /** Ex: create, update, delete, login, lock_period, import */
  action: string;
  /** Ex: student, teacher, parent, class, period, enrollment */
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Écrit une entrée dans `audit_logs` via le client service-role (la seule
 * écriture autorisée par la politique RLS `audit_logs_write_policy`).
 *
 * Best-effort : une failure d'audit ne doit jamais faire échouer l'action
 * métier appelante — l'erreur est simplement journalisée côté serveur.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      school_id: event.schoolId,
      user_id: event.userId ?? null,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      old_data: event.oldData ? JSON.parse(JSON.stringify(event.oldData)) : null,
      new_data: event.newData ? JSON.parse(JSON.stringify(event.newData)) : null,
      reason: event.reason ?? null,
    });

    if (error) {
      console.error("[audit] écriture impossible:", error.message);
    }
  } catch (err) {
    console.error(
      "[audit] exception:",
      err instanceof Error ? err.message : err
    );
  }
}
