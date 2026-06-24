import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';

function createClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL env var is required');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SPORTS = [
  'Basketball',
  'Ice Hockey',
  'Football',
  'Baseball',
  'Soccer',
  'Tennis',
] as const;

const CARD_TYPES = [
  { name: 'Base', description: 'Standard base card' },
  { name: 'Rookie', description: 'Rookie card' },
  { name: 'Autograph', description: 'Card with a player autograph' },
  { name: 'Relic', description: 'Card embedded with a piece of memorabilia' },
  { name: 'Patch', description: 'Card embedded with a jersey patch' },
  { name: 'Refractor', description: 'Card with a chromium refractor finish' },
  { name: 'Parallel', description: 'Parallel colour variant of a base card' },
  { name: 'Insert', description: 'Insert card from a special themed subset' },
  { name: 'Memorabilia', description: 'Card embedded with game-used memorabilia' },
  { name: 'Short Print', description: 'Card produced in smaller quantities than base' },
] as const;

export async function runSeed(prisma: PrismaClient): Promise<void> {
  const adminEmail = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD env vars are required');
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      username: 'admin',
      role: Role.ADMIN,
      isEmailVerified: true,
    },
    update: {},
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  for (const name of SPORTS) {
    await prisma.sport.upsert({
      where: { slug: toSlug(name) },
      create: { name, slug: toSlug(name) },
      update: {},
    });
  }
  console.log(`Seeded ${SPORTS.length} sports`);

  for (const { name, description } of CARD_TYPES) {
    await prisma.cardType.upsert({
      where: { slug: toSlug(name) },
      create: { name, slug: toSlug(name), isSystem: true, description },
      update: {},
    });
  }
  console.log(`Seeded ${CARD_TYPES.length} card types`);
}

if (require.main === module) {
  const prisma = createClient();
  runSeed(prisma)
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
