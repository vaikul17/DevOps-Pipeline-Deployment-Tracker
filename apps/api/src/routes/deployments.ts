import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { io } from '../index';

export const deploymentRoutes = Router();

// GET /api/v1/deployments — List deployments with filters
deploymentRoutes.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      projectId,
      environmentId,
      env,
      status,
      branch,
      author,
      limit = '20',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (environmentId) where.environmentId = environmentId;
    if (env) where.environment = { name: env as string };
    if (status) where.status = status;
    if (branch) where.build = { branch: branch as string };
    if (author) where.build = { ...where.build, author: author as string };

    // Only show deployments from user's org projects
    where.project = { orgId: req.user!.orgId };

    const [data, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        include: {
          build: true,
          environment: true,
          initiator: { select: { id: true, name: true, avatarUrl: true } },
          rollbacks: { include: { initiator: { select: { id: true, name: true } } } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.deployment.count({ where }),
    ]);

    res.json({ data, pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/deployments/:id — Get single deployment
deploymentRoutes.get('/:id', authenticate, async (req, res, next) => {
  try {
    const deployment = await prisma.deployment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        build: { include: { artifacts: true } },
        environment: true,
        initiator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        rollbacks: {
          include: {
            initiator: { select: { id: true, name: true } },
            targetDeployment: { include: { build: true } },
          },
        },
        logs: { orderBy: { timestamp: 'asc' }, take: 200 },
        project: { select: { id: true, name: true } },
      },
    });
    res.json(deployment);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/deployments — Create a deployment
const CreateDeploymentSchema = z.object({
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  buildId: z.string().uuid(),
  strategy: z.enum(['rolling', 'blue_green', 'canary', 'recreate']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

deploymentRoutes.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = CreateDeploymentSchema.parse(req.body);

    const deployment = await prisma.deployment.create({
      data: {
        ...body,
        strategy: body.strategy || 'rolling',
        initiatedBy: req.user!.id,
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        build: true,
        environment: true,
        initiator: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Broadcast via WebSocket
    io.to(`project:${deployment.projectId}`).emit('deployment:created', deployment);

    res.status(201).json(deployment);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/deployments/:id/status — Update deployment status
const UpdateStatusSchema = z.object({
  status: z.enum(['queued', 'in_progress', 'success', 'failed', 'rolled_back', 'cancelled']),
});

deploymentRoutes.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = UpdateStatusSchema.parse(req.body);

    const deployment = await prisma.deployment.update({
      where: { id: req.params.id },
      data: {
        status,
        finishedAt: ['success', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
        durationMs: ['success', 'failed', 'cancelled'].includes(status)
          ? Math.floor(Date.now() - new Date((await prisma.deployment.findUnique({ where: { id: req.params.id } }))!.startedAt).getTime())
          : undefined,
      },
      include: {
        build: true,
        environment: true,
        initiator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    io.to(`project:${deployment.projectId}`).emit('deployment:updated', deployment);

    res.json(deployment);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/deployments/project/:projectId/timeline — Timeline data
deploymentRoutes.get('/project/:projectId/timeline', authenticate, async (req, res, next) => {
  try {
    const { env, days = '30' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = {
      projectId: req.params.projectId,
      startedAt: { gte: since },
    };
    if (env) where.environment = { name: env as string };

    const deployments = await prisma.deployment.findMany({
      where,
      include: {
        build: true,
        environment: true,
        initiator: { select: { id: true, name: true, avatarUrl: true } },
        rollbacks: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    res.json({ data: deployments });
  } catch (err) {
    next(err);
  }
});
