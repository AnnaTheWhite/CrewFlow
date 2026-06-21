import { Router, Request } from "express";
import prisma from "../database/prisma";
import { requireRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { companyScope } from "../utils/scope";
import { normalizeOwnerNoteStatus, OWNER_NOTE_STATUSES } from "../constants/ownerNoteStatuses";
import { normalizePriority, PRIORITIES } from "../constants/priorities";
import { normalizeCommunicationType } from "../constants/communicationTypes";
import { detectEntities } from "../utils/entityDetection";
import { detectIntents } from "../utils/intentDetection";

const router = Router();

// Phase 3.2 product review: Task, Reminder, and ProjectInternalNote were
// write-only — converting a note created a row nobody could ever see again
// (no list view, no project/customer tab). Disabling them here, not just
// in the UI, so the dead-end action can't be reached via direct API calls
// either. The DB models stay untouched as future foundations; re-enable a
// target here once it has a real retrieval surface (see customers.routes.ts
// GET /:id/communications for the bar a target needs to clear).
const CONVERSION_TARGETS = ["CommunicationLog"] as const;
type ConversionTarget = (typeof CONVERSION_TARGETS)[number];

// Owner Command Center — BUSINESS_OWNER and DEVELOPER only, never EMPLOYEE.
router.use(requireRole(ROLES.BUSINESS_OWNER, ROLES.DEVELOPER));

const NOTE_INCLUDE = {
  project: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  employee: { select: { id: true, firstName: true, lastName: true } },
  conversions: { select: { id: true, targetType: true, targetId: true, createdAt: true } },
} as const;

// BUSINESS_OWNER is always scoped to their own company (companyScope
// enforces this from the JWT, ignoring anything in the query string).
// DEVELOPER belongs to no company, so they must say which tenant they want
// via ?companyId= — same convention as GET/PUT /company/settings.
function resolveCompanyId(req: Request): number | null {
  const scope = companyScope(req);

  if (typeof scope.companyId === "number") {
    return scope.companyId;
  }

  const queryId = req.query.companyId ?? req.body?.companyId;
  return queryId ? Number(queryId) : null;
}

router.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const { status, projectId, customerId, date, priority, pinned } = req.query;

  const where: Record<string, unknown> = { companyId };

  if (status && OWNER_NOTE_STATUSES.includes(status as never)) {
    where.status = status;
  }

  if (projectId) {
    where.projectId = Number(projectId);
  }

  if (customerId) {
    where.customerId = Number(customerId);
  }

  if (priority && PRIORITIES.includes(priority as never)) {
    where.priority = priority;
  }

  if (pinned === "true") {
    where.pinned = true;
  }

  if (typeof date === "string" && date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    where.createdAt = { gte: start, lte: end };
  }

  // Pinned notes always sort first, then newest-first within each group.
  const notes = await prisma.ownerNote.findMany({
    where,
    include: NOTE_INCLUDE,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return res.json(notes);
});

// Feature 14 — Command Center Dashboard counts.
router.get("/dashboard", async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const [total, inbox, reviewed, archived, urgent, pinned] = await Promise.all([
    prisma.ownerNote.count({ where: { companyId } }),
    prisma.ownerNote.count({ where: { companyId, status: "Inbox" } }),
    prisma.ownerNote.count({ where: { companyId, status: "Reviewed" } }),
    prisma.ownerNote.count({ where: { companyId, status: "Archived" } }),
    prisma.ownerNote.count({ where: { companyId, priority: "Urgent" } }),
    prisma.ownerNote.count({ where: { companyId, pinned: true } }),
  ]);

  return res.json({ total, inbox, reviewed, archived, urgent, pinned });
});

// Feature 15 — Context Panel. Gives the owner project context (customer,
// assigned employees, total logged hours, open tasks, recent activity)
// while deciding what to do with a note linked to that project.
router.get("/context/:projectId", async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const projectId = Number(req.params.projectId);

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    include: {
      customer: { select: { id: true, name: true } },
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const [shifts, openTasks, recentActivity] = await Promise.all([
    prisma.shift.findMany({ where: { projectId }, select: { start: true, end: true } }),
    prisma.task.count({ where: { projectId, companyId, status: { not: "Done" } } }),
    prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, metadata: true, createdAt: true },
    }),
  ]);

  const totalHours = shifts.reduce((sum, shift) => {
    if (!shift.end) return sum;
    const ms = shift.end.getTime() - shift.start.getTime();
    return sum + ms / (1000 * 60 * 60);
  }, 0);

  return res.json({
    project: { id: project.id, name: project.name, status: project.status },
    customer: project.customer,
    assignedEmployees: project.assignments.map((a) => a.employee),
    totalHours: Math.round(totalHours * 100) / 100,
    openTasks,
    recentActivity,
  });
});

// Suggestions only — detects mentions of existing customers/projects/
// employees in free-text. Never creates or links anything itself; the
// owner reviews the suggestions and explicitly applies one via POST/PUT.
router.post("/detect", async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const { text } = req.body;

  if (typeof text !== "string" || !text.trim()) {
    return res.json({ customers: [], projects: [], employees: [], intents: [] });
  }

  const [customers, projects, employees] = await Promise.all([
    prisma.customer.findMany({ where: { companyId }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { companyId }, select: { id: true, name: true } }),
    prisma.employee.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return res.json({
    ...detectEntities(text, customers, projects, employees),
    intents: detectIntents(text),
  });
});

// Verifies a project/customer/employee id belongs to the same company
// before a note is allowed to link to it — cross-tenant linking would let
// a note leak which other company owns a given id.
async function assertSameCompanyOrThrow(
  companyId: number,
  { projectId, customerId, employeeId }: Record<string, unknown>
): Promise<string | null> {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: Number(projectId), companyId },
    });
    if (!project) return "Project not found";
  }

  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: Number(customerId), companyId },
    });
    if (!customer) return "Customer not found";
  }

  if (employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: Number(employeeId), companyId },
    });
    if (!employee) return "Employee not found";
  }

  return null;
}

router.post("/", async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const { title, content, projectId, customerId, employeeId, priority, pinned } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const linkError = await assertSameCompanyOrThrow(companyId, { projectId, customerId, employeeId });
  if (linkError) {
    return res.status(400).json({ error: linkError });
  }

  const note = await prisma.ownerNote.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      companyId,
      userId: req.user!.userId,
      projectId: projectId ? Number(projectId) : null,
      customerId: customerId ? Number(customerId) : null,
      employeeId: employeeId ? Number(employeeId) : null,
      priority: priority !== undefined ? normalizePriority(priority) : undefined,
      pinned: typeof pinned === "boolean" ? pinned : undefined,
    },
    include: NOTE_INCLUDE,
  });

  return res.status(201).json(note);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const existing = await prisma.ownerNote.findFirst({ where: { id, companyId } });
  if (!existing) {
    return res.status(404).json({ error: "Note not found" });
  }

  const { title, content, status, projectId, customerId, employeeId, priority, pinned } = req.body;

  const linkError = await assertSameCompanyOrThrow(companyId, { projectId, customerId, employeeId });
  if (linkError) {
    return res.status(400).json({ error: linkError });
  }

  const note = await prisma.ownerNote.update({
    where: { id },
    data: {
      title: title !== undefined ? String(title).trim() : undefined,
      content: content !== undefined ? String(content).trim() : undefined,
      status: status !== undefined ? normalizeOwnerNoteStatus(status) : undefined,
      projectId: projectId !== undefined ? (projectId ? Number(projectId) : null) : undefined,
      customerId: customerId !== undefined ? (customerId ? Number(customerId) : null) : undefined,
      employeeId: employeeId !== undefined ? (employeeId ? Number(employeeId) : null) : undefined,
      priority: priority !== undefined ? normalizePriority(priority) : undefined,
      pinned: typeof pinned === "boolean" ? pinned : undefined,
    },
    include: NOTE_INCLUDE,
  });

  return res.json(note);
});

// Feature 2 (Phase 3.1) — permanent delete. Tenant-safe (only deletes a
// note that belongs to the resolved company) and RBAC-safe (the router-wide
// requireRole above already blocks EMPLOYEE from this entire router).
// Conversion history rows are deleted too — they only make sense in
// relation to the note that produced them, and the converted
// Task/Reminder/CommunicationLog/ProjectInternalNote records themselves are
// left untouched since they're independent records by that point.
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const existing = await prisma.ownerNote.findFirst({ where: { id, companyId } });
  if (!existing) {
    return res.status(404).json({ error: "Note not found" });
  }

  await prisma.$transaction([
    prisma.ownerNoteConversion.deleteMany({ where: { ownerNoteId: id, companyId } }),
    prisma.ownerNote.delete({ where: { id } }),
  ]);

  return res.status(204).send();
});

// Feature 12/13 — conversion history + duplicate protection. Lists every
// Task/Reminder/CommunicationLog/ProjectInternalNote this note has already
// produced, so the UI can show "Converted" and the owner can avoid
// accidental duplicate creation.
router.get("/:id/conversions", async (req, res) => {
  const id = Number(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const note = await prisma.ownerNote.findFirst({ where: { id, companyId } });
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  const conversions = await prisma.ownerNoteConversion.findMany({
    where: { ownerNoteId: id, companyId },
    orderBy: { createdAt: "desc" },
  });

  return res.json(conversions);
});

// Phase 3.2 — only CommunicationLog is an actionable conversion target
// today (see CONVERSION_TARGETS above). Task/Reminder/ProjectInternalNote
// stay defined as DB models for later, but aren't reachable from here.
type ConversionAction = {
  type: "CommunicationLog";
  communicationType?: string;
  content: string;
  customerId?: number | null;
  projectId?: number | null;
};

// Feature 4/5/6/7/8/9 — Multi-Action Conversion + Owner Approval Workflow.
// The owner picks one or more target actions, edits the prefilled fields,
// and confirms once — everything is created together in a single
// transaction. Nothing here is automatic: this endpoint only runs when the
// owner explicitly calls it after reviewing the Decision Preview.
router.post("/:id/convert", async (req, res) => {
  const id = Number(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const note = await prisma.ownerNote.findFirst({ where: { id, companyId } });
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  const actions: ConversionAction[] = Array.isArray(req.body?.actions) ? req.body.actions : [];

  if (actions.length === 0) {
    return res.status(400).json({ error: "At least one action is required" });
  }

  for (const action of actions) {
    if (!CONVERSION_TARGETS.includes(action.type as ConversionTarget)) {
      return res.status(400).json({ error: `Unknown action type: ${action.type}` });
    }

    const linkError = await assertSameCompanyOrThrow(companyId, {
      projectId: (action as { projectId?: number }).projectId,
      customerId: (action as { customerId?: number }).customerId,
      employeeId: (action as { employeeId?: number }).employeeId,
    });
    if (linkError) {
      return res.status(400).json({ error: linkError });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const results: { type: ConversionTarget; id: number }[] = [];

    for (const action of actions) {
      if (action.type === "CommunicationLog") {
        const log = await tx.communicationLog.create({
          data: {
            type: normalizeCommunicationType(action.communicationType),
            content: action.content,
            companyId,
            customerId: action.customerId ? Number(action.customerId) : null,
            projectId: action.projectId ? Number(action.projectId) : null,
          },
        });
        results.push({ type: "CommunicationLog", id: log.id });
      }
    }

    await tx.ownerNoteConversion.createMany({
      data: results.map((r) => ({
        ownerNoteId: id,
        targetType: r.type,
        targetId: r.id,
        companyId,
      })),
    });

    return results;
  });

  return res.status(201).json({ conversions: created });
});

export default router;
