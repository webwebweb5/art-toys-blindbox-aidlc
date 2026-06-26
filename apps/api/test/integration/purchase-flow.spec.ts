import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, mockStripeClient } from './helpers/test-app';
import {
  connectTestDb,
  disconnectTestDb,
  cleanDatabase,
  testPrisma,
} from './helpers/prisma-helpers';
import { createUser, createSeriesWithFigures } from './helpers/factories';

/**
 * Integration test: Complete Purchase Flow
 *
 * Tests the critical path:
 * 1. Create/publish series with figures
 * 2. User purchases a blind box (Stripe mock)
 * 3. Payment confirmation triggers reveal
 * 4. PullRecord is created with correct figure assignment
 */
describe('Purchase Flow (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

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
    mockStripeClient.paymentIntents.create.mockClear();
    mockStripeClient.paymentIntents.confirm.mockClear();
  });

  it('should complete full purchase flow: series → buy → reveal → pull record', async () => {
    // Arrange: Create user and published series with figures
    const user = await createUser(testPrisma, { role: 'CUSTOMER' });
    const { series, figures } = await createSeriesWithFigures(testPrisma, {
      status: 'PUBLISHED',
    });

    // Act 1: Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);

    authToken = loginRes.body.data.accessToken;

    // Act 2: Create purchase order
    const purchaseRes = await request(app.getHttpServer())
      .post('/api/purchase/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seriesId: series.id,
        type: 'SINGLE',
        quantity: 1,
      })
      .expect(201);

    expect(purchaseRes.body.data).toHaveProperty('orderId');
    expect(purchaseRes.body.data).toHaveProperty('clientSecret');
    expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledTimes(1);

    const orderId = purchaseRes.body.data.orderId;

    // Act 3: Simulate payment confirmation (webhook or confirm endpoint)
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/purchase/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(confirmRes.body.data).toHaveProperty('pullRecords');
    expect(confirmRes.body.data.pullRecords).toHaveLength(1);

    // Assert: PullRecord exists in database
    const pullRecord = await testPrisma.pullRecord.findFirst({
      where: { orderId },
    });
    expect(pullRecord).not.toBeNull();
    expect(pullRecord!.userId).toBe(user.id);
    expect(pullRecord!.seriesId).toBe(series.id);
    expect(figures.map((f) => f.id)).toContain(pullRecord!.figureId);
  });

  it('should reject purchase for DRAFT series', async () => {
    const user = await createUser(testPrisma);
    const { series } = await createSeriesWithFigures(testPrisma, {
      status: 'DRAFT',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);

    authToken = loginRes.body.data.accessToken;

    await request(app.getHttpServer())
      .post('/api/purchase/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seriesId: series.id,
        type: 'SINGLE',
        quantity: 1,
      })
      .expect(400);
  });

  it('should create correct number of pull records for multi-pull', async () => {
    const user = await createUser(testPrisma);
    const { series } = await createSeriesWithFigures(testPrisma, {
      status: 'PUBLISHED',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);

    authToken = loginRes.body.data.accessToken;

    const purchaseRes = await request(app.getHttpServer())
      .post('/api/purchase/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seriesId: series.id,
        type: 'MULTI_PULL',
        quantity: 6,
      })
      .expect(201);

    const orderId = purchaseRes.body.data.orderId;

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/purchase/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(confirmRes.body.data.pullRecords).toHaveLength(6);

    // Verify no duplicate figures in multi-pull
    const figureIds = confirmRes.body.data.pullRecords.map(
      (pr: { figureId: string }) => pr.figureId,
    );
    expect(new Set(figureIds).size).toBe(6);
  });
});
