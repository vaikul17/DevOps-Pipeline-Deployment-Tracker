import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const analyticsRoutes = Router();

// GET /api/v1/analytics/dora — DORA Metrics
analyticsRoutes.get('/dora', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { projectId, days = '30' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));
    const previousPeriodStart = new Date(since);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(days as string));

    const baseWhere: any = { project: { orgId: req.user!.orgId } };
    if (projectId) baseWhere.projectId = projectId as string;

    // Current period deployments
    const currentDeployments = await prisma.deployment.findMany({
      where: { ...baseWhere, startedAt: { gte: since } },
      include: { environment: true, rollbacks: true },
      orderBy: { startedAt: 'asc' },
    });

    // Previous period for trend calculation
    const previousDeployments = await prisma.deployment.findMany({
      where: { ...baseWhere, startedAt: { gte: previousPeriodStart, lt: since } },
      include: { environment: true, rollbacks: true },
    });

    const daysCount = parseInt(days as string);

    // 1. Deployment Frequency (deploys per day to production)
    const currentProdDeploys = currentDeployments.filter(d => d.environment?.isProduction && d.status === 'success').length;
    const previousProdDeploys = previousDeployments.filter(d => d.environment?.isProduction && d.status === 'success').length;
    const deployFreq = currentProdDeploys / daysCount;
    const prevDeployFreq = previousProdDeploys / daysCount;

    // 2. Lead Time for Changes (avg time from build to deploy)
    const successDeploys = currentDeployments.filter(d => d.status === 'success' && d.durationMs);
    const avgLeadTime = successDeploys.length > 0
      ? successDeploys.reduce((sum, d) => sum + (d.durationMs || 0), 0) / successDeploys.length / 60000
      : 0;
    const prevSuccessDeploys = previousDeployments.filter(d => d.status === 'success' && d.durationMs);
    const prevAvgLeadTime = prevSuccessDeploys.length > 0
      ? prevSuccessDeploys.reduce((sum, d) => sum + (d.durationMs || 0), 0) / prevSuccessDeploys.length / 60000
      : 0;

    // 3. Change Failure Rate (% of deployments that failed or were rolled back)
    const totalDeploys = currentDeployments.filter(d => d.environment?.isProduction).length;
    const failedDeploys = currentDeployments.filter(d => d.environment?.isProduction && ['failed', 'rolled_back'].includes(d.status)).length;
    const failureRate = totalDeploys > 0 ? (failedDeploys / totalDeploys) * 100 : 0;
    const prevTotalDeploys = previousDeployments.filter(d => d.environment?.isProduction).length;
    const prevFailedDeploys = previousDeployments.filter(d => d.environment?.isProduction && ['failed', 'rolled_back'].includes(d.status)).length;
    const prevFailureRate = prevTotalDeploys > 0 ? (prevFailedDeploys / prevTotalDeploys) * 100 : 0;

    // 4. Mean Time to Recovery (avg time of rollbacks)
    const rollbacks = await prisma.rollback.findMany({
      where: {
        deployment: { ...baseWhere },
        startedAt: { gte: since },
        status: 'success',
        finishedAt: { not: null },
      },
    });
    const avgMTTR = rollbacks.length > 0
      ? rollbacks.reduce((sum, r) => sum + (new Date(r.finishedAt!).getTime() - new Date(r.startedAt).getTime()), 0) / rollbacks.length / 60000
      : 0;

    const getRating = (metric: string, value: number) => {
      if (metric === 'deploymentFrequency') {
        if (value >= 1) return 'elite';
        if (value >= 0.14) return 'high'; // weekly
        if (value >= 0.033) return 'medium'; // monthly
        return 'low';
      }
      if (metric === 'leadTime') {
        if (value < 60) return 'elite';  // < 1hr
        if (value < 1440) return 'high'; // < 1 day
        if (value < 10080) return 'medium'; // < 1 week
        return 'low';
      }
      if (metric === 'mttr') {
        if (value < 60) return 'elite';
        if (value < 1440) return 'high';
        if (value < 10080) return 'medium';
        return 'low';
      }
      if (metric === 'changeFailureRate') {
        if (value < 5) return 'elite';
        if (value < 10) return 'high';
        if (value < 15) return 'medium';
        return 'low';
      }
      return 'medium';
    };

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      deploymentFrequency: {
        value: Math.round(deployFreq * 100) / 100,
        unit: 'per_day',
        trend: calcTrend(deployFreq, prevDeployFreq),
        rating: getRating('deploymentFrequency', deployFreq),
      },
      leadTimeForChanges: {
        value: Math.round(avgLeadTime),
        trend: calcTrend(prevAvgLeadTime, avgLeadTime), // inverted: lower is better
        rating: getRating('leadTime', avgLeadTime),
      },
      meanTimeToRecovery: {
        value: Math.round(avgMTTR),
        trend: calcTrend(0, avgMTTR), // lower is better
        rating: getRating('mttr', avgMTTR),
      },
      changeFailureRate: {
        value: Math.round(failureRate * 10) / 10,
        trend: calcTrend(prevFailureRate, failureRate), // inverted: lower is better
        rating: getRating('changeFailureRate', failureRate),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/heatmap — Deployment heatmap calendar data
analyticsRoutes.get('/heatmap', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { projectId, days = '365' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: any = {
      project: { orgId: req.user!.orgId },
      startedAt: { gte: since },
    };
    if (projectId) where.projectId = projectId as string;

    const deployments = await prisma.deployment.findMany({
      where,
      select: { startedAt: true, status: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by date
    const heatmap: Record<string, { count: number; successCount: number; failedCount: number }> = {};
    for (const d of deployments) {
      const dateStr = d.startedAt.toISOString().split('T')[0];
      if (!heatmap[dateStr]) heatmap[dateStr] = { count: 0, successCount: 0, failedCount: 0 };
      heatmap[dateStr].count++;
      if (d.status === 'success') heatmap[dateStr].successCount++;
      if (['failed', 'rolled_back'].includes(d.status)) heatmap[dateStr].failedCount++;
    }

    const data = Object.entries(heatmap).map(([date, counts]) => ({ date, ...counts }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/health — Environment health matrix
analyticsRoutes.get('/health', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { orgId: req.user!.orgId },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            deployments: {
              take: 1,
              orderBy: { startedAt: 'desc' },
              include: { build: true },
            },
          },
        },
      },
    });

    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 7);

    const healthData = projects.map(project => ({
      projectId: project.id,
      projectName: project.name,
      environments: project.environments.map(env => {
        const lastDeploy = env.deployments[0];
        let status: 'healthy' | 'deploying' | 'failed' | 'stale' | 'unknown' = 'unknown';

        if (!lastDeploy) {
          status = 'unknown';
        } else if (lastDeploy.status === 'in_progress') {
          status = 'deploying';
        } else if (['failed', 'rolled_back'].includes(lastDeploy.status)) {
          status = 'failed';
        } else if (lastDeploy.status === 'success') {
          status = new Date(lastDeploy.startedAt) < staleThreshold ? 'stale' : 'healthy';
        }

        return {
          envId: env.id,
          envName: env.name,
          status,
          lastDeployment: lastDeploy || undefined,
          lastDeployedAt: lastDeploy?.startedAt?.toISOString(),
        };
      }),
    }));

    res.json({ data: healthData });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/activity — Recent activity feed
analyticsRoutes.get('/activity', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { limit = '30' } = req.query;

    const [deployments, rollbacks] = await Promise.all([
      prisma.deployment.findMany({
        where: { project: { orgId: req.user!.orgId } },
        include: {
          build: true,
          environment: true,
          project: { select: { name: true } },
          initiator: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: parseInt(limit as string),
      }),
      prisma.rollback.findMany({
        where: { deployment: { project: { orgId: req.user!.orgId } } },
        include: {
          deployment: {
            include: {
              build: true,
              environment: true,
              project: { select: { name: true } },
            },
          },
          initiator: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
      }),
    ]);

    const activities = [
      ...deployments.map(d => ({
        id: d.id,
        type: 'deployment' as const,
        title: `Build #${d.build.buildNumber} deployed to ${d.environment.name}`,
        description: d.build.message,
        status: d.status,
        project: d.project.name,
        environment: d.environment.name,
        actor: d.initiator.name,
        timestamp: d.startedAt.toISOString(),
      })),
      ...rollbacks.map(r => ({
        id: r.id,
        type: 'rollback' as const,
        title: `Rollback on ${r.deployment.environment.name}`,
        description: r.reason,
        status: r.status,
        project: r.deployment.project.name,
        environment: r.deployment.environment.name,
        actor: r.initiator.name,
        timestamp: r.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, parseInt(limit as string));

    res.json({ data: activities });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/stats — Summary statistics
analyticsRoutes.get('/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orgWhere = { project: { orgId: req.user!.orgId } };

    const [
      totalProjects,
      totalDeployments,
      successfulDeploys,
      failedDeploys,
      totalRollbacks,
      recentDeploys,
    ] = await Promise.all([
      prisma.project.count({ where: { orgId: req.user!.orgId } }),
      prisma.deployment.count({ where: orgWhere }),
      prisma.deployment.count({ where: { ...orgWhere, status: 'success' } }),
      prisma.deployment.count({ where: { ...orgWhere, status: 'failed' } }),
      prisma.rollback.count({ where: { deployment: orgWhere } }),
      prisma.deployment.count({
        where: { ...orgWhere, startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      totalProjects,
      totalDeployments,
      successfulDeploys,
      failedDeploys,
      totalRollbacks,
      recentDeploys,
      successRate: totalDeployments > 0 ? Math.round((successfulDeploys / totalDeployments) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});
