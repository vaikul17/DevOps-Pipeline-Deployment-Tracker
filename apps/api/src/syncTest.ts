import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projectId = '437ed582-7b61-4ec7-8625-64036313906e'; // the 'new' project
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { environments: { orderBy: { order: 'asc' } } }
  });

  const match = project.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    console.log('Regex failed on', project.repoUrl);
    return;
  }
  const owner = match[1];
  const repo = match[2].replace('.git', '');
  console.log('Owner:', owner, 'Repo:', repo);

  const githubRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=30`, {
    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SEQA-App' }
  });
  
  if (!githubRes.ok) {
    const errorText = await githubRes.text();
    console.log(`GitHub API error: ${githubRes.status} ${errorText}`);
    return;
  }

  const data = await githubRes.json() as any;
  const runs = data.workflow_runs || [];
  console.log(`Found ${runs.length} runs`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
