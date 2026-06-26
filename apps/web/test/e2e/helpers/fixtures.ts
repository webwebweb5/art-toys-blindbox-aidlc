import { test as base, expect, Page } from '@playwright/test';

/**
 * Extended test fixtures for Art Toys E2E tests.
 * Provides login helpers and API seeding utilities.
 */

const API_BASE = 'http://localhost:3001/api';

// ========================
// Authentication Helpers
// ========================

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user via API and return tokens.
 */
export async function registerUser(
  credentials: AuthCredentials & { name: string },
): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status}`);
  }

  const body = await res.json();
  return body.data;
}

/**
 * Login an existing user via API and return tokens.
 */
export async function loginUser(
  credentials: AuthCredentials,
): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const body = await res.json();
  return body.data;
}

/**
 * Login via the UI by filling in the login form.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/\/(series|dashboard|admin)/);
}

// ========================
// API Seeding Helpers
// ========================

/**
 * Seed a published series with figures via admin API.
 */
export async function seedSeries(
  adminToken: string,
  options: {
    name?: string;
    figureCount?: number;
    price?: number;
  } = {},
): Promise<{ seriesId: string }> {
  const { name = 'E2E Test Series', figureCount = 12, price = 9.99 } = options;

  const res = await fetch(`${API_BASE}/admin/series`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name,
      artist: 'E2E Test Artist',
      pricePerBox: price,
      figureCount,
      coverImage: 'https://cdn.example.com/e2e-cover.jpg',
    }),
  });

  if (!res.ok) {
    throw new Error(`Series creation failed: ${res.status}`);
  }

  const body = await res.json();
  return { seriesId: body.data.id };
}

/**
 * Seed a branch via admin API.
 */
export async function seedBranch(
  adminToken: string,
  options: { name?: string; address?: string } = {},
): Promise<{ branchId: string }> {
  const { name = 'E2E Test Branch', address = '123 Test Street' } = options;

  const res = await fetch(`${API_BASE}/admin/branches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name, address }),
  });

  if (!res.ok) {
    throw new Error(`Branch creation failed: ${res.status}`);
  }

  const body = await res.json();
  return { branchId: body.data.id };
}

// ========================
// Custom Test Fixture
// ========================

interface TestFixtures {
  customerPage: Page;
  adminPage: Page;
}

export const test = base.extend<TestFixtures>({
  customerPage: async ({ page }, use) => {
    // Customer page — tests can login as needed
    await use(page);
  },
  adminPage: async ({ browser }, use) => {
    // Admin page — separate browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
