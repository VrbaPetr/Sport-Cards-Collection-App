import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { runSeed } from './seed';

function createClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL env var is required');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function getRowCounts(prisma: PrismaClient): Promise<Record<string, number>> {
  const [adminUsers, sports, cardTypes] = await Promise.all([
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.sport.count(),
    prisma.cardType.count(),
  ]);
  return { adminUsers, sports, cardTypes };
}

async function main(): Promise<void> {
  const prisma = createClient();

  try {
    console.log('Smoke test: verifying seed idempotency...\n');

    console.log('Pass 1 — running seed...');
    await runSeed(prisma);
    const counts1 = await getRowCounts(prisma);
    console.log('Counts after pass 1:', counts1);

    console.log('\nPass 2 — running seed again...');
    await runSeed(prisma);
    const counts2 = await getRowCounts(prisma);
    console.log('Counts after pass 2:', counts2);

    let passed = true;
    for (const key of Object.keys(counts1)) {
      if (counts1[key] !== counts2[key]) {
        console.error(`\nFAIL: "${key}" changed: ${counts1[key]} → ${counts2[key]}`);
        passed = false;
      }
    }

    if (passed) {
      console.log('\nPASS: Row counts are stable across two seed runs.');
      console.log('Final counts:', counts2);
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
