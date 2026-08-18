import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { io } from '../index';
import { logger } from '../utils/logger';

export const webhookRoutes = Router();

// Verify GitHub webhook signature
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// POST /api/v1/webhooks/github — Receive GitHub Actions webhook
webhookRoutes.post('/github', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && signature) {
      const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!verifyGitHubSignature(payload, signature, secret)) {
        logger.warn('Invalid GitHub webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.headers['x-github-event'] as string;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    logger.info({ event, action: body.action }, 'GitHub webhook received');

    if (event === 'workflow_run' && body.action === 'completed') {
      const workflowRun = body.workflow_run;

      // Find matching project by repo URL
      const repoUrl = body.repository?.html_url;
      const project = await prisma.project.findFirst({
        where: { repoUrl: { contains: repoUrl || '' }, ciProvider: 'github_actions' },
        include: { environments: { orderBy: { order: 'asc' } } },
      });

      if (project) {
        // Create or update build
        const existingBuild = await prisma.build.findFirst({
          where: { projectId: project.id, ciBuildId: String(workflowRun.id) },
        });

        if (!existingBuild) {
          const lastBuild = await prisma.build.findFirst({
            where: { projectId: project.id },
            orderBy: { buildNumber: 'desc' },
          });

          await prisma.build.create({
            data: {
              projectId: project.id,
              buildNumber: (lastBuild?.buildNumber || 0) + 1,
              commitSha: workflowRun.head_sha,
              branch: workflowRun.head_branch,
              author: workflowRun.actor?.login || 'unknown',
              message: workflowRun.display_title || 'Workflow run',
              ciBuildId: String(workflowRun.id),
              ciBuildUrl: workflowRun.html_url,
              status: workflowRun.conclusion === 'success' ? 'success' : 'failed',
              startedAt: new Date(workflowRun.run_started_at),
              finishedAt: new Date(workflowRun.updated_at),
            },
          });

          logger.info({ projectId: project.id, buildId: workflowRun.id }, 'Build created from GitHub webhook');
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/webhooks/generic — Generic webhook for custom CI/CD
webhookRoutes.post('/generic', async (req, res, next) => {
  try {
    const { projectId, buildNumber, commitSha, branch, author, message, status } = req.body;

    logger.info({ projectId, buildNumber, status }, 'Generic webhook received');

    if (!projectId || !buildNumber) {
      return res.status(400).json({ error: 'projectId and buildNumber are required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { environments: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create build
    const build = await prisma.build.upsert({
      where: { projectId_buildNumber: { projectId, buildNumber: parseInt(buildNumber) } },
      create: {
        projectId,
        buildNumber: parseInt(buildNumber),
        commitSha: commitSha || 'unknown',
        branch: branch || 'main',
        author: author || 'webhook',
        message: message || `Build #${buildNumber}`,
        status: status || 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
      },
      update: {
        status: status || 'success',
        finishedAt: new Date(),
      },
    });

    io.to(`project:${projectId}`).emit('build:updated', build);

    res.json({ received: true, buildId: build.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/webhooks/vercel — Receive Vercel webhook
webhookRoutes.post('/vercel', async (req, res, next) => {
  try {
    const signature = req.headers['x-vercel-signature'];
    // In production, you would verify this signature against a secret.
    
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.info({ type: body.type }, 'Vercel webhook received');

    if (body.type === 'deployment' || body.type === 'deployment-status' || body.type === 'deployment-ready' || body.type === 'deployment-error') {
      const payload = body.payload;
      const vercelProjectId = payload.project?.id;
      const deployment = payload.deployment;

      if (!vercelProjectId || !deployment) {
        return res.status(400).json({ error: 'Invalid Vercel payload' });
      }

      // Find matching project by repoUrl (which acts as Vercel Project ID)
      const project = await prisma.project.findFirst({
        where: { repoUrl: vercelProjectId, ciProvider: 'vercel' },
        include: { environments: { orderBy: { order: 'asc' } } },
      });

      if (project) {
        let buildStatus: 'success' | 'failed' | 'in_progress' | 'cancelled' = 'in_progress';
        if (deployment.state === 'READY') buildStatus = 'success';
        else if (deployment.state === 'ERROR') buildStatus = 'failed';
        else if (deployment.state === 'CANCELED') buildStatus = 'cancelled';
        else if (deployment.state === 'BUILDING') buildStatus = 'in_progress';

        const commitSha = deployment.meta?.githubCommitSha || deployment.id;
        const branch = deployment.meta?.githubCommitRef || 'main';
        const message = deployment.meta?.githubCommitMessage || `Vercel Deployment ${deployment.id}`;
        
        let existingBuild = await prisma.build.findFirst({
          where: { projectId: project.id, ciBuildId: deployment.id },
        });

        if (!existingBuild) {
          const lastBuild = await prisma.build.findFirst({
            where: { projectId: project.id },
            orderBy: { buildNumber: 'desc' },
          });

          existingBuild = await prisma.build.create({
            data: {
              projectId: project.id,
              buildNumber: (lastBuild?.buildNumber || 0) + 1,
              commitSha: commitSha.substring(0, 40),
              branch,
              author: 'vercel',
              message,
              ciBuildId: deployment.id,
              ciBuildUrl: deployment.inspectorUrl || `https://${deployment.url}`,
              status: buildStatus,
              startedAt: new Date(),
            },
          });
        } else {
          // Update status
          existingBuild = await prisma.build.update({
            where: { id: existingBuild.id },
            data: { 
              status: buildStatus,
              finishedAt: ['success', 'failed'].includes(buildStatus) ? new Date() : undefined
            }
          });
        }

        // Also create/update a deployment in the production environment
        const prodEnv = project.environments.find(e => e.isProduction) || project.environments[0];
        if (prodEnv) {
          const existingDeploy = await prisma.deployment.findFirst({
            where: { buildId: existingBuild.id, environmentId: prodEnv.id }
          });

          if (!existingDeploy) {
            await prisma.deployment.create({
              data: {
                projectId: project.id,
                environmentId: prodEnv.id,
                buildId: existingBuild.id,
                initiatedBy: 'webhook',
                status: buildStatus,
                startedAt: new Date(),
                finishedAt: ['success', 'failed'].includes(buildStatus) ? new Date() : undefined,
                durationMs: 0
              }
            });
          } else {
            const finishedAt = ['success', 'failed'].includes(buildStatus) ? new Date() : undefined;
            const durationMs = finishedAt && existingDeploy.startedAt ? finishedAt.getTime() - existingDeploy.startedAt.getTime() : 0;
            
            await prisma.deployment.update({
              where: { id: existingDeploy.id },
              data: {
                status: buildStatus,
                finishedAt,
                durationMs
              }
            });
          }
        }

        logger.info({ projectId: project.id, buildId: deployment.id, status: buildStatus }, 'Vercel build/deployment updated from webhook');
        io.to(project.orgId).emit('deployment_updated', { projectId: project.id });
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
