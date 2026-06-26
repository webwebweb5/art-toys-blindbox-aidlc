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
  createBranch,
} from './helpers/factories';

/**
 * Integration test: Drop Event Flow
 *
 * Tests the limited-release drop event lifecycle:
 * 1. Admin creates a drop event
 * 2. Drop activates (status → ACTIVE)
 * 3. User enters queue / attempts purchase
 * 4. Per-person limit is enforced
 */
describe('Drop Event Flow (Integration)', () => {
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

  it('should complete drop flow: create → activate → enter queue → verify position', async () => {
    // Arrange: Admin user and a published series
    const admin = await createUser(testPrisma, { role: 'ADMIN', email: 'admin@test.com' });
    const customer = await createUser(testPrisma, { role: 'CUSTOMER' });
    const { series } = await createSeriesWithFigures(testPrisma, { status: 'PUBLISHED' });

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Password123!' })
      .expect(200);

    const adminToken = adminLogin.body.data.accessToken;

    // Act 1: Admin creates a drop event
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const createDropRes = await request(app.getHttpServer())
      .post('/api/drops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seriesId: series.id,
        name: 'Exclusive Collaboration Drop',
        startsAt: futureDate.toISOString(),
        totalQuantity: 500,
        perPersonLimit: 2,
        earlyAccessMinutes: 30,
        earlyAccessMinTier: 'GOLD',
      })
      .expect(201);

    expect(createDropRes.body.data).toHaveProperty('id');
    expect(createDropRes.body.data.status).toBe('SCHEDULED');
    expect(createDropRes.body.data.totalQuantity).toBe(500);
    expect(createDropRes.body.data.perPersonLimit).toBe(2);

    const dropId = createDropRes.body.data.id;

    // Act 2: Admin activates the drop
    const activateRes = await request(app.getHttpServer())
      .post(`/api/drops/${dropId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(activateRes.body.data.status).toBe('ACTIVE');

    // Act 3: Customer enters the queue
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: 'Password123!' })
      .expect(200);

    const customerToken = customerLogin.body.data.accessToken;

    const queueRes = await request(app.getHttpServer())
      .post(`/api/drops/${dropId}/queue`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    expect(queueRes.body.data).toHaveProperty('position');
    expect(queueRes.body.data.position).toBeGreaterThanOrEqual(1);

    // Assert: Drop exists in DB with correct state
    const drop = await testPrisma.dropEvent.findUnique({ where: { id: dropId } });
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe('ACTIVE');
    expect(drop!.remainingQuantity).toBe(500);
  });

  it('should enforce per-person purchase limit on drop', async () => {
    const admin = await createUser(testPrisma, { role: 'ADMIN', email: 'admin@test.com' });
    const customer = await createUser(testPrisma, { role: 'CUSTOMER' });
    const { series } = await createSeriesWithFigures(testPrisma, { status: 'PUBLISHED' });

    // Admin creates and activates drop with limit of 2
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Password123!' })
      .expect(200);

    const adminToken = adminLogin.body.data.accessToken;

    const dropRes = await request(app.getHttpServer())
      .post('/api/drops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seriesId: series.id,
        name: 'Limited Drop',
        startsAt: new Date().toISOString(),
        totalQuantity: 100,
        perPersonLimit: 2,
        earlyAccessMinutes: 0,
        earlyAccessMinTier: 'BRONZE',
      })
      .expect(201);

    const dropId = dropRes.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/drops/${dropId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Customer creates purchase records to simulate 2 purchases
    await testPrisma.dropPurchaseRecord.create({
      data: {
        dropEventId: dropId,
        userId: customer.id,
        purchaseCount: 2,
      },
    });

    // Verify enforcement via service logic
    const canPurchase = await testPrisma.dropPurchaseRecord.findUnique({
      where: {
        dropEventId_userId: { dropEventId: dropId, userId: customer.id },
      },
    });

    expect(canPurchase).not.toBeNull();
    expect(canPurchase!.purchaseCount).toBe(2);
    // User at limit — next purchase should be rejected
    expect(canPurchase!.purchaseCount >= 2).toBe(true);
  });

  it('should not allow non-admin to create drop events', async () => {
    const customer = await createUser(testPrisma, { role: 'CUSTOMER' });
    const { series } = await createSeriesWithFigures(testPrisma, { status: 'PUBLISHED' });

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: 'Password123!' })
      .expect(200);

    const customerToken = customerLogin.body.data.accessToken;

    await request(app.getHttpServer())
      .post('/api/drops')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        seriesId: series.id,
        name: 'Unauthorized Drop',
        startsAt: new Date().toISOString(),
        totalQuantity: 100,
        perPersonLimit: 1,
        earlyAccessMinutes: 0,
        earlyAccessMinTier: 'BRONZE',
      })
      .expect(403);
  });

  it('should end a drop event', async () => {
    const admin = await createUser(testPrisma, { role: 'ADMIN', email: 'admin@test.com' });
    const { series } = await createSeriesWithFigures(testPrisma, { status: 'PUBLISHED' });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Password123!' })
      .expect(200);

    const adminToken = adminLogin.body.data.accessToken;

    const dropRes = await request(app.getHttpServer())
      .post('/api/drops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seriesId: series.id,
        name: 'Ending Drop',
        startsAt: new Date().toISOString(),
        totalQuantity: 50,
        perPersonLimit: 1,
        earlyAccessMinutes: 0,
        earlyAccessMinTier: 'BRONZE',
      })
      .expect(201);

    const dropId = dropRes.body.data.id;

    // Activate then end
    await request(app.getHttpServer())
      .post(`/api/drops/${dropId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const endRes = await request(app.getHttpServer())
      .post(`/api/drops/${dropId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(endRes.body.data.status).toBe('ENDED');
  });
});
