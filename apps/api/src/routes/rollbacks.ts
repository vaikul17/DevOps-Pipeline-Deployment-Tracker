import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { logger } from '../utils/logger';

export const rollbackRoutes = Router();

// GET /api/v1/rollbacks — List rollbacks with filters
rollbackRoutes.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { projectId, category, status, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (projectId) where.deployment = { projectId: projectId as string };
    if (category) where.category = category;
    if (status) where.status = status;
    where.deployment = { ...where.deployment, project: { orgId: req.user!.orgId } };

    const [data, total] = await Promise.all([
      prisma.rollback.findMany({
        where,
        include: {
          deployment: {
            include: {
              build: true,
              environment: true,
              project: { select: { id: true, name: true } },
            },
          },
          targetDeployment: { include: { build: true } },
          initiator: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.rollback.count({ where }),
    ]);

    res.json({ data, pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/rollbacks — Create a rollback
const CreateRollbackSchema = z.object({
  deploymentId: z.string().uuid(),
  rollbackToDeploymentId: z.string().uuid(),
  reason: z.string().min(10, 'Please provide a detailed reason (min 10 chars)'),
  category: z.enum(['automated', 'manual', 'incident', 'config_error', 'performance']),
});

rollbackRoutes.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = CreateRollbackSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify deployment exists and can be rolled back
    const deployment = await prisma.deployment.findUniqueOrThrow({
      where: { id: body.deploymentId },
      include: { environment: true, project: true, build: true },
    });

    if (!['success', 'failed'].includes(deployment.status)) {
      return res.status(409).json({
        error: 'Conflict',
        message: `Cannot roll back a deployment with status "${deployment.status}"`,
      });
    }

    // Create rollback in a transaction
    const rollback = await prisma.$transaction(async (tx) => {
      // Mark current deployment as rolled back
      await tx.deployment.update({
        where: { id: body.deploymentId },
        data: { status: 'rolled_back' },
      });

      // Create rollback record
      return tx.rollback.create({
        data: {
          deploymentId: body.deploymentId,
          rollbackToDeploymentId: body.rollbackToDeploymentId,
          initiatedBy: userId,
          reason: body.reason,
          category: body.category,
          status: 'in_progress',
          startedAt: new Date(),
        },
        include: {
          deployment: { include: { environment: true, build: true, project: { select: { id: true, name: true } } } },
          targetDeployment: { include: { build: true } },
          initiator: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    });

    logger.info({
      event: 'rollback_initiated',
      rollbackId: rollback.id,
      deploymentId: body.deploymentId,
      environment: deployment.environment.name,
      project: deployment.project.name,
      initiatedBy: userId,
      reason: body.reason,
      category: body.category,
    });

    // Broadcast rollback event
    io.to(`project:${deployment.projectId}`).emit('rollback:created', rollback);

    res.status(201).json(rollback);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/rollbacks/:id/status — Update rollback status
rollbackRoutes.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['in_progress', 'success', 'failed']) }).parse(req.body);

    const rollback = await prisma.rollback.update({
      where: { id: req.params.id },
      data: {
        status,
        finishedAt: ['success', 'failed'].includes(status) ? new Date() : undefined,
      },
      include: {
        deployment: { include: { project: { select: { id: true, name: true } } } },
        initiator: { select: { id: true, name: true } },
      },
    });

    io.to(`project:${rollback.deployment.projectId}`).emit('rollback:updated', rollback);

    res.json(rollback);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/rollbacks/:id — Trigger rollback to a specific old deployment
rollbackRoutes.post('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const userId = req.user!.id;

    // The deployment we want to rollback TO
    const targetDeployment = await prisma.deployment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { environment: true, project: true, build: true },
    });

    // Find the CURRENT active deployment in this environment
    const currentDeployment = await prisma.deployment.findFirst({
      where: { environmentId: targetDeployment.environmentId, status: 'success' },
      orderBy: { startedAt: 'desc' },
    });

    if (!currentDeployment) {
      return res.status(400).json({ error: 'No active deployment found in this environment to rollback from.' });
    }

    if (currentDeployment.id === targetDeployment.id) {
      return res.status(400).json({ error: 'This is already the active deployment.' });
    }

    // Create rollback in a transaction
    const rollback = await prisma.$transaction(async (tx) => {
      await tx.deployment.update({
        where: { id: currentDeployment.id },
        data: { status: 'rolled_back' },
      });

      return tx.rollback.create({
        data: {
          deploymentId: currentDeployment.id,
          rollbackToDeploymentId: targetDeployment.id,
          initiatedBy: userId,
          reason: reason,
          category: 'manual',
          status: 'success', // For now assume it's instant
          startedAt: new Date(),
          finishedAt: new Date(),
        },
        include: {
          deployment: { include: { environment: true, build: true, project: { select: { id: true, name: true } } } },
          targetDeployment: { include: { build: true } },
          initiator: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    });

    // Optional: Call Vercel API here if project.ciProvider === 'vercel'
    // ...

    io.to(`project:${targetDeployment.projectId}`).emit('rollback:created', rollback);
    res.status(201).json(rollback);
  } catch (err) {
    next(err);
  }
});
