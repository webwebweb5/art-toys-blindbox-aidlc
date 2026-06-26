import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import {
  connectTestDb,
  disconnectTestDb,
  cleanDatabase,
} from './helpers/prisma-helpers';

/**
 * Integration test: Auth Flow
 *
 * Tests the complete authentication lifecycle:
 * 1. Register a new user
 * 2. Login with credentials
 * 3. Access protected route with token
 * 4. Refresh token
 * 5. Use new token for protected route
 */
describe('Auth Flow (Integration)', () => {
  let app: INestApplication;

  const testUser = {
    email: 'integration-test@example.com',
    password: 'SecurePass123!',
    name: 'Integration Test User',
  };

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

  it('should complete auth lifecycle: register → login → refresh → access protected', async () => {
    // Step 1: Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(registerRes.body.data).toHaveProperty('accessToken');
    expect(registerRes.body.data).toHaveProperty('refreshToken');
    expect(registerRes.body.data.user.email).toBe(testUser.email);

    // Step 2: Login with same credentials
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(loginRes.body.data).toHaveProperty('accessToken');
    expect(loginRes.body.data).toHaveProperty('refreshToken');

    const { accessToken, refreshToken } = loginRes.body.data;

    // Step 3: Access protected route
    const protectedRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(protectedRes.body.data.email).toBe(testUser.email);
    expect(protectedRes.body.data.name).toBe(testUser.name);

    // Step 4: Refresh token
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body.data).toHaveProperty('accessToken');
    const newAccessToken = refreshRes.body.data.accessToken;

    // Step 5: Access protected route with new token
    const secondProtectedRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(secondProtectedRes.body.data.email).toBe(testUser.email);
  });

  it('should reject login with wrong password', async () => {
    // Register first
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    // Login with wrong password
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123!' })
      .expect(401);
  });

  it('should reject access to protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('should reject access with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here')
      .expect(401);
  });

  it('should reject duplicate email registration', async () => {
    // Register first time
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    // Register again with same email
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);
  });
});
