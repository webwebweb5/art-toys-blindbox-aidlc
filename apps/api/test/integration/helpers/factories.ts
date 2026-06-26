import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Factory functions for creating test entities.
 * All factories accept partial overrides for flexibility.
 */

// ========================
// USER FACTORY
// ========================

interface CreateUserOptions {
  email?: string;
  name?: string;
  role?: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  passwordHash?: string;
  emailVerified?: boolean;
}

export async function createUser(
  prisma: PrismaClient,
  options: CreateUserOptions = {},
) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      email: options.email || `user-${id.slice(0, 8)}@test.com`,
      name: options.name || `Test User ${id.slice(0, 8)}`,
      role: options.role || 'CUSTOMER',
      tier: options.tier || 'BRONZE',
      // bcrypt hash of "Password123!"
      passwordHash:
        options.passwordHash ||
        '$2b$10$K4X1FJv3lE.R8Vu5D4LJ3u8RkU9hHcJ8ZJ6a9M5Fp.o9QFqKGhJC',
      emailVerified: options.emailVerified ?? true,
      referralCode: `REF-${id.slice(0, 8).toUpperCase()}`,
    },
  });
}

// ========================
// SERIES FACTORY
// ========================

interface CreateSeriesOptions {
  name?: string;
  artist?: string;
  pricePerBox?: number;
  figureCount?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  pityThreshold?: number;
  pityMultiplier?: number;
}

export async function createSeries(
  prisma: PrismaClient,
  options: CreateSeriesOptions = {},
) {
  const id = randomUUID();
  return prisma.series.create({
    data: {
      id,
      name: options.name || `Test Series ${id.slice(0, 8)}`,
      artist: options.artist || 'Test Artist',
      pricePerBox: options.pricePerBox || 9.99,
      figureCount: options.figureCount || 12,
      coverImage: `https://cdn.example.com/series/${id}/cover.jpg`,
      status: options.status || 'PUBLISHED',
      pityThreshold: options.pityThreshold || 50,
      pityMultiplier: options.pityMultiplier || 2.0,
      publishedAt: options.status === 'DRAFT' ? null : new Date(),
    },
  });
}

// ========================
// FIGURE FACTORY
// ========================

interface CreateFigureOptions {
  seriesId: string;
  name?: string;
  rarity?: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';
  probability?: number;
  sortOrder?: number;
}

export async function createFigure(
  prisma: PrismaClient,
  options: CreateFigureOptions,
) {
  const id = randomUUID();
  return prisma.figure.create({
    data: {
      id,
      seriesId: options.seriesId,
      name: options.name || `Figure ${id.slice(0, 8)}`,
      image: `https://cdn.example.com/figures/${id}.jpg`,
      rarity: options.rarity || 'COMMON',
      probability: options.probability || 8.33,
      sortOrder: options.sortOrder || 1,
    },
  });
}

/**
 * Creates a complete series with figures (default: 12 figures).
 */
export async function createSeriesWithFigures(
  prisma: PrismaClient,
  seriesOptions: CreateSeriesOptions = {},
  figureCount = 12,
) {
  const series = await createSeries(prisma, {
    ...seriesOptions,
    figureCount,
  });

  const figures = [];
  const baseProbability = 100 / figureCount;

  for (let i = 0; i < figureCount; i++) {
    const isSecret = i === figureCount - 1;
    const figure = await createFigure(prisma, {
      seriesId: series.id,
      name: `Figure #${i + 1}`,
      rarity: isSecret ? 'SECRET' : i >= figureCount - 3 ? 'RARE' : 'COMMON',
      probability: isSecret ? 1.0 : baseProbability,
      sortOrder: i + 1,
    });
    figures.push(figure);
  }

  return { series, figures };
}

// ========================
// ORDER FACTORY
// ========================

interface CreateOrderOptions {
  userId: string;
  seriesId: string;
  type?: 'SINGLE' | 'MULTI_PULL';
  quantity?: number;
  totalAmount?: number;
  status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  stripePaymentIntentId?: string;
}

export async function createOrder(
  prisma: PrismaClient,
  options: CreateOrderOptions,
) {
  const id = randomUUID();
  return prisma.order.create({
    data: {
      id,
      userId: options.userId,
      seriesId: options.seriesId,
      type: options.type || 'SINGLE',
      quantity: options.quantity || 1,
      totalAmount: options.totalAmount || 9.99,
      status: options.status || 'PAID',
      stripePaymentIntentId:
        options.stripePaymentIntentId || `pi_test_${id.slice(0, 12)}`,
    },
  });
}

// ========================
// BRANCH FACTORY
// ========================

interface CreateBranchOptions {
  name?: string;
  address?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function createBranch(
  prisma: PrismaClient,
  options: CreateBranchOptions = {},
) {
  const id = randomUUID();
  return prisma.branch.create({
    data: {
      id,
      name: options.name || `Test Branch ${id.slice(0, 8)}`,
      address: options.address || '123 Test Street, Bangkok 10110',
      status: options.status || 'ACTIVE',
      operatingHours: {
        monday: { open: '10:00', close: '21:00' },
        tuesday: { open: '10:00', close: '21:00' },
        wednesday: { open: '10:00', close: '21:00' },
        thursday: { open: '10:00', close: '21:00' },
        friday: { open: '10:00', close: '22:00' },
        saturday: { open: '10:00', close: '22:00' },
        sunday: { open: '11:00', close: '20:00' },
      },
    },
  });
}

// ========================
// VOUCHER FACTORY
// ========================

interface CreateVoucherOptions {
  userId: string;
  pullRecordId: string;
  branchId: string;
  figureId: string;
  status?: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt?: Date;
}

export async function createVoucher(
  prisma: PrismaClient,
  options: CreateVoucherOptions,
) {
  const id = randomUUID();
  return prisma.voucher.create({
    data: {
      id,
      userId: options.userId,
      pullRecordId: options.pullRecordId,
      branchId: options.branchId,
      figureId: options.figureId,
      qrToken: `QR-${id}`,
      status: options.status || 'ACTIVE',
      expiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}
