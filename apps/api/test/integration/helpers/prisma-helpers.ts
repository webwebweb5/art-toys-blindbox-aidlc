import { PrismaClient } from '@prisma/client';

/**
 * Dedicated Prisma client for test database operations.
 * Uses DATABASE_URL from environment (should point to test DB).
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/art_toys_test',
    },
  },
});

/**
 * Connect to the test database.
 * Call in beforeAll() hooks.
 */
export async function connectTestDb(): Promise<PrismaClient> {
  await prisma.$connect();
  return prisma;
}

/**
 * Disconnect from the test database.
 * Call in afterAll() hooks.
 */
export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Cleans all tables in the test database.
 * Uses TRUNCATE CASCADE for speed.
 * Call in beforeEach() or afterEach() hooks.
 */
export async function cleanDatabase(): Promise<void> {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}

/**
 * Resets specific tables (useful for targeted cleanup).
 */
export async function resetTables(...tableNames: string[]): Promise<void> {
  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${table}" CASCADE;`,
    );
  }
}

export { prisma as testPrisma };
