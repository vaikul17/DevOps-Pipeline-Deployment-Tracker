import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const acmeOrg = await prisma.organization.findUnique({ where: { slug: 'acme' } });
  const defaultOrg = await prisma.organization.findUnique({ where: { slug: 'default' } });

  if (!acmeOrg || !defaultOrg) {
    console.log('Orgs not found');
    return;
  }

  // Move all users from default to acme
  const usersMoved = await prisma.user.updateMany({
    where: { orgId: defaultOrg.id },
    data: { orgId: acmeOrg.id }
  });

  // Move all projects from default to acme
  const projectsMoved = await prisma.project.updateMany({
    where: { orgId: defaultOrg.id },
    data: { orgId: acmeOrg.id }
  });

  console.log(`Moved ${usersMoved.count} users and ${projectsMoved.count} projects to Acme Corp.`);
}
main();
