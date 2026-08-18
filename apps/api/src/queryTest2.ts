import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projectId = 'bb1019d3-8878-4506-b0b2-9a80d169cff9';
  const builds = await prisma.build.findMany({ where: { projectId } });
  const deployments = await prisma.deployment.findMany({ where: { projectId } });
  
  console.log(`Project ${projectId}`);
  console.log('Builds count:', builds.length);
  console.log('Deployments count:', deployments.length);
  console.log('Build ciBuildIds:', builds.map(b => b.ciBuildId));
}

main().catch(console.error).finally(() => prisma.$disconnect());
