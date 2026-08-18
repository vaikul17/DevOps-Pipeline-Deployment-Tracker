import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const projectRoutes = Router();

// GET /api/v1/projects — List all projects for user's org
projectRoutes.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { orgId: req.user!.orgId },
      include: {
        environments: { orderBy: { order: 'asc' } },
        _count: { select: { builds: true, deployments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id — Get project with environments
projectRoutes.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            deployments: {
              take: 1,
              orderBy: { startedAt: 'desc' },
              include: {
                build: true,
                initiator: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
        _count: { select: { builds: true, deployments: true } },
      },
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects — Create project
const CreateProjectSchema = z.object({
  name: z.string().min(2),
  repoUrl: z.string().url().optional(),
  ciProvider: z.enum(['github_actions', 'gitlab_ci', 'jenkins', 'circleci', 'argocd', 'custom']).optional(),
  environments: z.array(z.object({
    name: z.string(),
    order: z.number(),
    isProduction: z.boolean().optional(),
  })).optional(),
});

projectRoutes.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = CreateProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        orgId: req.user!.orgId,
        name: body.name,
        repoUrl: body.repoUrl || '',
        ciProvider: body.ciProvider || 'github_actions',
        environments: {
          create: body.environments || [
            { name: 'development', order: 0 },
            { name: 'staging', order: 1 },
            { name: 'production', order: 2, isProduction: true },
          ],
        },
      },
      include: { environments: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/sync — Sync historical runs from GitHub
projectRoutes.post('/:id/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { githubToken } = req.body || {};
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { environments: { orderBy: { order: 'asc' } } }
    });

    if (!project.repoUrl || !project.repoUrl.includes('github.com')) {
      return res.status(400).json({ error: 'Project does not have a valid GitHub repository URL' });
    }

    const match = project.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Could not parse GitHub repository URL' });
    }
    const owner = match[1];
    const repo = match[2].endsWith('.git') ? match[2].slice(0, -4) : match[2];

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SEQA-App'
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const githubRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=30`, { headers });
    
    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      return res.status(githubRes.status).json({ error: `GitHub API error: ${errorText}` });
    }

    const data = await githubRes.json() as any;
    const runs = data.workflow_runs || [];

    // Sort older runs first to increment build numbers naturally
    runs.sort((a: any, b: any) => new Date(a.run_started_at).getTime() - new Date(b.run_started_at).getTime());

    let importedCount = 0;
    
    const lastBuild = await prisma.build.findFirst({
      where: { projectId: project.id },
      orderBy: { buildNumber: 'desc' },
    });
    let currentBuildNumber = (lastBuild?.buildNumber || 0);

    const prodEnv = project.environments.find(e => e.name === 'production') || project.environments[0];

    for (const run of runs) {
      const existingBuild = await prisma.build.findFirst({
        where: { projectId: project.id, ciBuildId: String(run.id) },
        include: { deployments: true }
      });

      const buildStatus = run.conclusion === 'success' ? 'success' : (run.conclusion ? 'failed' : 'pending');
      const startedAt = run.run_started_at ? new Date(run.run_started_at) : new Date();
      const finishedAt = run.updated_at ? new Date(run.updated_at) : new Date();

      if (!existingBuild) {
        currentBuildNumber++;
        const build = await prisma.build.create({
          data: {
            projectId: project.id,
            buildNumber: currentBuildNumber,
            commitSha: run.head_sha || 'unknown',
            branch: run.head_branch || 'main',
            author: run.actor?.login || 'unknown',
            message: run.display_title || 'Workflow run',
            ciBuildId: String(run.id),
            ciBuildUrl: run.html_url,
            status: buildStatus,
            startedAt,
            finishedAt,
          },
        });

        // Also create a Deployment so it shows up on the timeline and heatmap!
        if (prodEnv) {
          await prisma.deployment.create({
            data: {
              projectId: project.id,
              environmentId: prodEnv.id,
              buildId: build.id,
              initiatedBy: req.user!.id,
              status: buildStatus,
              startedAt,
              finishedAt,
              durationMs: finishedAt.getTime() - startedAt.getTime(),
            }
          });
        }

        importedCount++;
      } else if (existingBuild.deployments.length === 0 && prodEnv) {
        // Backfill missing deployment for a build that was synced before the deployment fix
        await prisma.deployment.create({
          data: {
            projectId: project.id,
            environmentId: prodEnv.id,
            buildId: existingBuild.id,
            initiatedBy: req.user!.id,
            status: buildStatus,
            startedAt,
            finishedAt,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          }
        });
        importedCount++;
      }
    }

    res.json({ success: true, imported: importedCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/sync/vercel — Sync historical runs from Vercel
projectRoutes.post('/:id/sync/vercel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { vercelToken, vercelProjectId, vercelTeamId } = req.body;

    const project = await prisma.project.findUniqueOrThrow({
      where: { id, orgId: req.user!.orgId },
      include: { environments: true }
    });

    let ciConfig: any = {};
    try {
      if (project.ciConfig) ciConfig = JSON.parse(project.ciConfig);
    } catch (e) {}

    // Fallback to stored credentials if not provided in request
    const token = vercelToken || ciConfig.vercelToken;
    const teamId = vercelTeamId || ciConfig.vercelTeamId;
    const projId = vercelProjectId || project.repoUrl;

    if (!token) {
      return res.status(400).json({ error: 'Vercel access token is required' });
    }
    if (!projId) {
      return res.status(400).json({ error: 'Vercel Project ID is missing. Please provide it in the input field.' });
    }

    // Save credentials if they changed
    if (token !== ciConfig.vercelToken || teamId !== ciConfig.vercelTeamId || projId !== project.repoUrl || projId !== ciConfig.vercelProjectId) {
      ciConfig.vercelToken = token;
      ciConfig.vercelTeamId = teamId;
      ciConfig.vercelProjectId = projId;
      await prisma.project.update({
        where: { id: project.id },
        data: {
          repoUrl: projId,
          ciConfig: JSON.stringify(ciConfig)
        }
      });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };

    let url = `https://api.vercel.com/v6/deployments?projectId=${projId}&limit=30`;
    if (teamId) url += `&teamId=${teamId}`;

    const vercelRes = await fetch(url, { headers });
    
    if (!vercelRes.ok) {
      const errorText = await vercelRes.text();
      return res.status(vercelRes.status).json({ error: `Vercel API error: ${errorText}` });
    }

    const data = await vercelRes.json() as any;
    const deployments = data.deployments || [];

    // Order oldest to newest so buildNumber increments correctly
    deployments.sort((a: any, b: any) => a.created - b.created);

    const prodEnv = project.environments.find(e => e.isProduction) || project.environments.find(e => e.name === 'production') || project.environments[0];

    const lastBuild = await prisma.build.findFirst({
      where: { projectId: project.id },
      orderBy: { buildNumber: 'desc' }
    });
    let nextBuildNumber = lastBuild ? lastBuild.buildNumber + 1 : 1;

    let importedCount = 0;

    for (const d of deployments) {
      let buildStatus: 'success' | 'failed' | 'in_progress' | 'cancelled' = 'success';
      if (d.state === 'ERROR') buildStatus = 'failed';
      else if (d.state === 'CANCELED') buildStatus = 'cancelled';
      else if (d.state === 'BUILDING') buildStatus = 'in_progress';
      else if (d.state === 'READY') buildStatus = 'success';
      else buildStatus = 'in_progress';

      const startedAt = new Date(d.created);
      // Vercel doesn't always expose end time cleanly in v6 without fetching individual deployment, just use start time + 30s as mock if successful
      const finishedAt = new Date(startedAt.getTime() + 30000); 

      const commitSha = d.meta?.githubCommitSha || d.uid;
      const branch = d.meta?.githubCommitRef || 'main';
      const message = d.meta?.githubCommitMessage || `Vercel Deployment ${d.uid}`;
      const author = d.creator?.username || 'vercel';

      let existingBuild = await prisma.build.findFirst({
        where: { projectId: project.id, ciBuildId: d.uid }
      });

      if (!existingBuild) {
        existingBuild = await prisma.build.create({
          data: {
            projectId: project.id,
            buildNumber: nextBuildNumber++,
            status: buildStatus,
            branch,
            commitSha: commitSha.substring(0, 40),
            message,
            author,
            ciBuildId: d.uid,
            ciBuildUrl: d.inspectorUrl || `https://${d.url}`
          }
        });
      }

      const existingDeploy = await prisma.deployment.findFirst({
        where: { buildId: existingBuild.id, environmentId: prodEnv.id }
      });

      if (!existingDeploy) {
        await prisma.deployment.create({
          data: {
            projectId: project.id,
            environmentId: prodEnv.id,
            buildId: existingBuild.id,
            initiatedBy: req.user!.id,
            status: buildStatus,
            startedAt,
            finishedAt: ['success', 'failed'].includes(buildStatus) ? finishedAt : undefined,
            durationMs: ['success', 'failed'].includes(buildStatus) ? finishedAt.getTime() - startedAt.getTime() : undefined,
          }
        });
        importedCount++;
      }
    }

    res.json({ success: true, imported: importedCount });
  } catch (err) {
    next(err);
  }
});
