import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import {
  connectTestDb,
  disconnectTestDb,
  cleanDatabase,
  testPrisma,
} from './helpers/prisma-helpers';
import {
  createUser,
  createSeriesWithFigures,
  createOrder,
  createBranch,
  createVoucher,
} from './helpers/factories';

/**
 * Integration test: Pickup Flow
 *
 * Tests the voucher pickup path:
 * 1. User purchases → PullRecord created
 * 2. User selects branch → Voucher issued
 * 3. Staff scans voucher → Validates it
 * 4. Staff redeems voucher → Status = REDEEMED, stock updated
 */
describe('Pickup Flow (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await connectTestDb();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should complete pickup flow: purchase → select branch → validate voucher → redeem', async () => {
    // Arrange: Create user, series with figures, branch, and a pull record
    const customer = await createUser(testPrisma, { role: 'CUSTOMER' });
    const staff = await createUser(testPrisma, { role: 'STAFF', email: 'staff@test.com' });
    const { series, figures } = await createSeriesWithFigures(testPrisma);
    const branch = await createBranch(testPrisma);

    // Create stock for the figure at the branch
    await testPrisma.stockRecord.create({
      data: {
        branchId: branch.id,
        figureId: figures[0].id,
        available: 10,
        reserved: 0,
        pickedUp: 0,
      },
    });

    // Create order and pull record
    const order = await createOrder(testPrisma, {
      userId: customer.id,
      seriesId: series.id,
      status: 'PAID',
    });

    const pullRecord = await testPrisma.pullRecord.create({
      data: {
        orderId: order.id,
        userId: customer.id,
        seriesId: series.id,
        figureId: figures[0].id,
        rarity: 'COMMON',
        pityCountAtPull: 5,
      },
    });

    // Act 1: Customer selects branch for pickup
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: 'Password123!' })
      .expect(200);

    const customerToken = customerLogin.body.data.accessToken;

    const voucherRes = await request(app.getHttpServer())
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        pullRecordId: pullRecord.id,
        branchId: branch.id,
      })
      .expect(201);

    expect(voucherRes.body.data).toHaveProperty('qrToken');
    expect(voucherRes.body.data.status).toBe('ACTIVE');

    const qrToken = voucherRes.body.data.qrToken;

    // Act 2: Staff validates voucher
    const staffLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Password123!' })
      .expect(200);

    const staffToken = staffLogin.body.data.accessToken;

    const validateRes = await request(app.getHttpServer())
      .get(`/api/vouchers/validate/${qrToken}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(validateRes.body.data.status).toBe('ACTIVE');
    expect(validateRes.body.data).toHaveProperty('figure');

    // Act 3: Staff redeems voucher
    const redeemRes = await request(app.getHttpServer())
      .post(`/api/vouchers/${qrToken}/redeem`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(redeemRes.body.data.status).toBe('REDEEMED');

    // Assert: Stock updated — available decreased, pickedUp increased
    const stockRecord = await testPrisma.stockRecord.findUnique({
      where: {
        branchId_figureId: {
          branchId: branch.id,
          figureId: figures[0].id,
        },
      },
    });

    expect(stockRecord!.available).toBe(9);
    expect(stockRecord!.reserved).toBe(0);
    expect(stockRecord!.pickedUp).toBe(1);
  });

  it('should reject redeem for already redeemed voucher', async () => {
    const customer = await createUser(testPrisma);
    const staff = await createUser(testPrisma, { role: 'STAFF', email: 'staff@test.com' });
    const { series, figures } = await createSeriesWithFigures(testPrisma);
    const branch = await createBranch(testPrisma);
    const order = await createOrder(testPrisma, {
      userId: customer.id,
      seriesId: series.id,
    });

    const pullRecord = await testPrisma.pullRecord.create({
      data: {
        orderId: order.id,
        userId: customer.id,
        seriesId: series.id,
        figureId: figures[0].id,
        rarity: 'COMMON',
        pityCountAtPull: 0,
      },
    });

    const voucher = await createVoucher(testPrisma, {
      userId: customer.id,
      pullRecordId: pullRecord.id,
      branchId: branch.id,
      figureId: figures[0].id,
      status: 'REDEEMED',
    });

    const staffLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Password123!' })
      .expect(200);

    const staffToken = staffLogin.body.data.accessToken;

    await request(app.getHttpServer())
      .post(`/api/vouchers/${voucher.qrToken}/redeem`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(400);
  });

  it('should reject redeem for expired voucher', async () => {
    const customer = await createUser(testPrisma);
    const staff = await createUser(testPrisma, { role: 'STAFF', email: 'staff@test.com' });
    const { series, figures } = await createSeriesWithFigures(testPrisma);
    const branch = await createBranch(testPrisma);
    const order = await createOrder(testPrisma, {
      userId: customer.id,
      seriesId: series.id,
    });

    const pullRecord = await testPrisma.pullRecord.create({
      data: {
        orderId: order.id,
        userId: customer.id,
        seriesId: series.id,
        figureId: figures[0].id,
        rarity: 'COMMON',
        pityCountAtPull: 0,
      },
    });

    const voucher = await createVoucher(testPrisma, {
      userId: customer.id,
      pullRecordId: pullRecord.id,
      branchId: branch.id,
      figureId: figures[0].id,
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
    });

    const staffLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Password123!' })
      .expect(200);

    const staffToken = staffLogin.body.data.accessToken;

    await request(app.getHttpServer())
      .post(`/api/vouchers/${voucher.qrToken}/redeem`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(400);
  });
});
