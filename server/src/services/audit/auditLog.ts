import prisma from "../../database/prisma";

type AuditLogInput = {
  action: string;
  userId?: number | null;
  companyId?: number | null;
  metadata?: Record<string, unknown>;
};

// A logging failure should never break the operation it's recording —
// callers fire-and-forget this (or await + ignore failures) rather than
// letting an audit-trail outage take down account deletion, etc.
export async function logAudit({
  action,
  userId,
  companyId,
  metadata,
}: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId ?? null,
        companyId: companyId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log entry", action, error);
  }
}
