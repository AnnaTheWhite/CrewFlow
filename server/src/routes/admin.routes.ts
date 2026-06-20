import { Router } from "express";
import prisma from "../database/prisma";
import { requireRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";

const router = Router();

router.use(requireRole(ROLES.DEVELOPER));

router.get("/companies", async (_req, res) => {
  const companies = await prisma.company.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStatus: true,
      createdAt: true,
      _count: { select: { users: true, employees: true } },
    },
  });

  return res.json(companies);
});

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true,
    },
  });

  return res.json(users);
});

// Platform-level activity log — backed by AuditLog (currently written by
// account deletion; more actions can log here over time).
router.get("/logs", async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { id: "desc" },
    take: 200,
    include: { company: { select: { name: true } } },
  });

  return res.json(
    logs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      companyId: log.companyId,
      companyName: log.company?.name ?? null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      createdAt: log.createdAt,
    }))
  );
});

export default router;
