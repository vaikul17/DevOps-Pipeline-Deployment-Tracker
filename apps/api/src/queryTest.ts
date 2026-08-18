import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const builds = await prisma.build.findMany();
  const deployments = await prisma.deployment.findMany();
  
  console.log('Builds count:', builds.length);
  console.log('Deployments count:', deployments.length);
  console.log('Deployments:', JSON.stringify(deployments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
