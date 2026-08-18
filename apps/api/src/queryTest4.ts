import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { repoUrl: { contains: 'vaikul.github.io' } },
    include: { builds: true, deployments: true }
  });
  
  if (project) {
    console.log('Project ID:', project.id);
    console.log('Builds count:', project.builds.length);
    console.log('Deployments count:', project.deployments.length);
  } else {
    console.log('Project not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
