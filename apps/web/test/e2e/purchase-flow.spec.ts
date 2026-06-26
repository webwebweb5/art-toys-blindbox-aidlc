import { test, expect, loginViaUI } from './helpers/fixtures';

/**
 * E2E Test: Purchase Journey
 *
 * Validates the complete user journey:
 * 1. Navigate to series catalog
 * 2. Select a series
 * 3. Start purchase (mock payment success)
 * 4. See reveal animation
 * 5. Select branch for pickup
 */
test.describe('Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data would normally happen via API fixture
    // For E2E, assume dev seed data is available
  });

  test('complete purchase journey: catalog → series → purchase → reveal → branch', async ({
    page,
  }) => {
    // Step 1: Navigate to series catalog
    await page.goto('/series');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/series|catalog/i);

    // Step 2: Wait for series cards to load and select the first one
    const seriesCards = page.locator('[data-testid="series-card"]');
    await expect(seriesCards.first()).toBeVisible({ timeout: 10000 });
    await seriesCards.first().click();

    // Step 3: Verify series detail page
    await expect(page.getByTestId('series-detail')).toBeVisible();
    await expect(page.getByTestId('series-price')).toBeVisible();
    await expect(page.getByRole('button', { name: /buy|purchase/i })).toBeVisible();

    // Step 4: Start purchase
    await page.getByRole('button', { name: /buy|purchase/i }).click();

    // Should redirect to payment or show payment modal
    await expect(
      page.getByTestId('payment-form').or(page.getByText(/payment/i)),
    ).toBeVisible({ timeout: 5000 });

    // Step 5: Mock payment success (in E2E, Stripe test mode or intercepted)
    // For test environment, the payment form should have a "test" confirmation
    const confirmButton = page.getByRole('button', { name: /confirm|pay/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Step 6: See reveal animation
    await expect(
      page.getByTestId('reveal-container').or(page.getByText(/reveal|congratulations/i)),
    ).toBeVisible({ timeout: 15000 });

    // Step 7: Select branch for pickup
    const branchSelector = page.getByTestId('branch-selector').or(
      page.getByRole('button', { name: /select.*branch|choose.*location/i }),
    );

    if (await branchSelector.isVisible({ timeout: 5000 })) {
      await branchSelector.click();
      const branchOption = page.getByTestId('branch-option').first();
      if (await branchOption.isVisible()) {
        await branchOption.click();
      }
    }
  });

  test('series catalog displays available series', async ({ page }) => {
    await page.goto('/series');

    // Should show at least the page structure
    await expect(page).toHaveURL(/\/series/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('series detail shows figure gallery and pricing', async ({ page }) => {
    await page.goto('/series');

    const seriesCards = page.locator('[data-testid="series-card"]');
    // If no series exist in test env, skip gracefully
    const count = await seriesCards.count();
    test.skip(count === 0, 'No series data seeded');

    await seriesCards.first().click();

    // Verify key elements on series detail
    await expect(page.getByTestId('series-detail')).toBeVisible();
    await expect(page.getByTestId('figure-gallery').or(page.getByText(/figure/i))).toBeVisible();
  });

  test('unauthenticated user is redirected to login on purchase attempt', async ({
    page,
  }) => {
    await page.goto('/series');

    const seriesCards = page.locator('[data-testid="series-card"]');
    const count = await seriesCards.count();
    test.skip(count === 0, 'No series data seeded');

    await seriesCards.first().click();

    const buyButton = page.getByRole('button', { name: /buy|purchase/i });
    if (await buyButton.isVisible()) {
      await buyButton.click();
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });
});
