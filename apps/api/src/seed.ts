import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

const COMMIT_MESSAGES = [
  'fix: resolve payment timeout issue in checkout flow',
  'feat: add user notification preferences panel',
  'chore: upgrade dependencies to latest versions',
  'fix: correct memory leak in WebSocket handler',
  'feat: implement rate limiting for API endpoints',
  'refactor: extract auth middleware into shared module',
  'fix: handle edge case in pagination logic',
  'feat: add dark mode toggle with system preference detection',
  'perf: optimize database queries with proper indexing',
  'fix: resolve CORS issue for preflight requests',
  'feat: add deployment approval workflow for production',
  'chore: update Docker base image to Alpine 3.19',
  'fix: correct timezone handling in cron scheduler',
  'feat: implement webhook retry mechanism with backoff',
  'refactor: migrate from callbacks to async/await pattern',
  'fix: resolve race condition in concurrent deploys',
  'feat: add Slack notification for failed deployments',
  'perf: implement Redis caching for dashboard queries',
  'fix: handle graceful shutdown on SIGTERM signal',
  'feat: add commit tracing from PR to production deploy',
];

const AUTHORS = ['alice', 'bob', 'charlie', 'diana', 'erik', 'fiona', 'george', 'hana'];
const BRANCHES = ['main', 'main', 'main', 'develop', 'feature/auth', 'fix/memory-leak', 'release/v2.4'];

const PROJECTS = [
  { name: 'payments-api', repo: 'https://github.com/acme/payments-api', ciProvider: 'github_actions' },
  { name: 'auth-service', repo: 'https://github.com/acme/auth-service', ciProvider: 'github_actions' },
  { name: 'user-portal', repo: 'https://github.com/acme/user-portal', ciProvider: 'github_actions' },
  { name: 'cart-service', repo: 'https://github.com/acme/cart-service', ciProvider: 'github_actions' },
  { name: 'notification-engine', repo: 'https://github.com/acme/notification-engine', ciProvider: 'github_actions' },
  { name: 'vercel-production-app', repo: 'https://vercel.com/acme/production-app', ciProvider: 'custom' },
];

const ENVIRONMENTS = [
  { name: 'development', order: 0, isProduction: false },
  { name: 'staging', order: 1, isProduction: false },
  { name: 'canary', order: 2, isProduction: false },
  { name: 'production', order: 3, isProduction: true },
];

const STRATEGIES: Array<'rolling' | 'blue_green' | 'canary' | 'recreate'> = ['rolling', 'blue_green', 'canary', 'recreate'];

const ROLLBACK_REASONS = [
  'Memory leak detected — OOM kills observed after 30 minutes',
  'API response latency increased by 300% after deployment',
  'Critical bug: users unable to complete checkout flow',
  'Database connection pool exhaustion under load',
  'Broken CSS rendering on mobile Safari browsers',
  'Authentication tokens not being refreshed correctly',
  'Incorrect environment variable configuration deployed',
  'Third-party payment provider integration regression',
  'Unexpected 500 errors on /api/v1/orders endpoint',
  'Performance regression: p99 latency exceeded 2000ms SLA',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSha(): string {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 14) + 8); // 8am - 10pm
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.alertEvent.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.deploymentLog.deleteMany();
  await prisma.rollback.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.build.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create organization
  const org = await prisma.organization.create({
    data: { id: uuid(), name: 'Acme Corp', slug: 'acme' },
  });
  console.log(`✅ Organization: ${org.name}`);

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12);
  const users = await Promise.all([
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'admin@acme.dev', name: 'Admin User', password: hashedPassword, role: 'admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' } }),
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'vaikul.gandi@gmail.com', name: 'Vaikul Gandi', password: hashedPassword, role: 'admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vaikul' } }),
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'aaliyah@gmail.com', name: 'Aaliyah', password: hashedPassword, role: 'admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aaliyah' } }),
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'alice@acme.dev', name: 'Alice Chen', password: hashedPassword, role: 'deployer', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' } }),
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'bob@acme.dev', name: 'Bob Martinez', password: hashedPassword, role: 'deployer', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' } }),
    prisma.user.create({ data: { id: uuid(), orgId: org.id, email: 'viewer@acme.dev', name: 'Carol Davis', password: hashedPassword, role: 'viewer', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol' } }),
  ]);
  console.log(`✅ Users: ${users.length} created (password: password123)`);

  // Create projects
  for (const proj of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        id: uuid(),
        orgId: org.id,
        name: proj.name,
        repoUrl: proj.repo,
        ciProvider: proj.ciProvider || 'github_actions',
      },
    });

    // Create environments
    const envs = await Promise.all(
      ENVIRONMENTS.map(env =>
        prisma.environment.create({
          data: { id: uuid(), projectId: project.id, ...env },
        })
      )
    );

    // Create builds (60-120 per project over 90 days)
    const buildCount = 60 + Math.floor(Math.random() * 61);
    const builds = [];
    for (let i = 1; i <= buildCount; i++) {
      const startedAt = randomDate(90);
      const durationMs = Math.floor(Math.random() * 180000) + 30000; // 30s - 3.5min
      const isFailed = Math.random() < 0.08; // 8% fail rate

      const build = await prisma.build.create({
        data: {
          id: uuid(),
          projectId: project.id,
          buildNumber: i,
          commitSha: randomSha(),
          branch: randomItem(BRANCHES),
          author: randomItem(AUTHORS),
          message: randomItem(COMMIT_MESSAGES),
          ciBuildId: `gh-${Math.floor(Math.random() * 999999)}`,
          ciBuildUrl: `${proj.repo}/actions/runs/${Math.floor(Math.random() * 999999)}`,
          status: isFailed ? 'failed' : 'success',
          startedAt,
          finishedAt: new Date(startedAt.getTime() + durationMs),
        },
      });
      builds.push(build);
    }

    // Create deployments — each successful build gets deployed to some environments
    const successfulBuilds = builds.filter(b => b.status === 'success');
    const deployments = [];

    for (const build of successfulBuilds) {
      // Determine how far this build gets promoted
      const promotionLevel = Math.random();
      let targetEnvs = [envs[0]]; // always goes to dev
      if (promotionLevel > 0.3) targetEnvs.push(envs[1]); // 70% reach staging
      if (promotionLevel > 0.6) targetEnvs.push(envs[2]); // 40% reach canary
      if (promotionLevel > 0.8) targetEnvs.push(envs[3]); // 20% reach production

      for (let i = 0; i < targetEnvs.length; i++) {
        const env = targetEnvs[i];
        const deployStart = new Date(build.startedAt!.getTime() + (i * 3600000) + Math.floor(Math.random() * 1800000));
        const deployDuration = Math.floor(Math.random() * 120000) + 15000; // 15s - 2.5min
        const isDeployFailed = env.isProduction && Math.random() < 0.05; // 5% prod failure

        const deployment = await prisma.deployment.create({
          data: {
            id: uuid(),
            projectId: project.id,
            environmentId: env.id,
            buildId: build.id,
            initiatedBy: randomItem(users).id,
            status: isDeployFailed ? 'failed' : 'success',
            strategy: randomItem(STRATEGIES),
            startedAt: deployStart,
            finishedAt: new Date(deployStart.getTime() + deployDuration),
            durationMs: deployDuration,
          },
        });
        deployments.push(deployment);

        // Add deployment logs
        const logMessages = [
          { level: 'info', message: `Starting deployment to ${env.name}...` },
          { level: 'info', message: `Pulling image ${proj.name}:build-${build.buildNumber}` },
          { level: 'info', message: 'Running pre-deployment health checks...' },
          { level: 'info', message: `Deploying using ${deployment.strategy} strategy` },
          ...(isDeployFailed
            ? [{ level: 'error', message: 'Health check failed after deployment. Rolling back...' }]
            : [{ level: 'info', message: `✅ Deployment successful. Duration: ${(deployDuration / 1000).toFixed(1)}s` }]),
        ];

        for (let j = 0; j < logMessages.length; j++) {
          await prisma.deploymentLog.create({
            data: {
              id: uuid(),
              deploymentId: deployment.id,
              level: logMessages[j].level,
              message: logMessages[j].message,
              timestamp: new Date(deployStart.getTime() + j * 5000),
            },
          });
        }
      }
    }

    // Create rollbacks (5-15% of failed/production deployments)
    const rollbackCandidates = deployments.filter(d => d.status === 'failed' || (Math.random() < 0.05));
    for (const deployment of rollbackCandidates.slice(0, Math.floor(rollbackCandidates.length * 0.6))) {
      // Find previous successful deployment in same env
      const prevDeploy = deployments.find(
        d => d.environmentId === deployment.environmentId
          && d.status === 'success'
          && d.startedAt < deployment.startedAt
          && d.id !== deployment.id
      );
      if (!prevDeploy) continue;

      const rollbackStart = new Date(deployment.startedAt.getTime() + Math.floor(Math.random() * 600000));

      await prisma.rollback.create({
        data: {
          id: uuid(),
          deploymentId: deployment.id,
          rollbackToDeploymentId: prevDeploy.id,
          initiatedBy: randomItem(users).id,
          reason: randomItem(ROLLBACK_REASONS),
          category: randomItem(['manual', 'automated', 'incident', 'performance', 'config_error'] as const),
          status: Math.random() < 0.9 ? 'success' : 'failed',
          startedAt: rollbackStart,
          finishedAt: new Date(rollbackStart.getTime() + Math.floor(Math.random() * 60000) + 10000),
        },
      });

      // Mark deployment as rolled_back
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'rolled_back' },
      });
    }

    const rollbackCount = await prisma.rollback.count({ where: { deployment: { projectId: project.id } } });
    console.log(`✅ ${proj.name}: ${buildCount} builds, ${deployments.length} deployments, ${rollbackCount} rollbacks`);
  }

  // Create alert rules
  const allProjects = await prisma.project.findMany();
  for (const project of allProjects) {
    await prisma.alertRule.create({
      data: {
        id: uuid(),
        projectId: project.id,
        name: `${project.name} — Production Deploy Failed`,
        condition: JSON.stringify({ event: 'deploy_failed', environment: 'production' }),
        channels: JSON.stringify(['slack:#deployments', 'email:oncall@acme.dev']),
        enabled: true,
      },
    });
  }
  console.log(`✅ Alert rules: ${allProjects.length} created`);

  console.log('\n🎉 Seed complete!\n');
  console.log('📧 Login credentials:');
  console.log('   admin@acme.dev / password123 (Admin)');
  console.log('   vaikul.gandi@gmail.com / password123 (Admin)');
  console.log('   aaliyah@gmail.com / password123 (Admin)');
  console.log('   alice@acme.dev / password123 (Deployer)');
  console.log('   viewer@acme.dev / password123 (Viewer)');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
