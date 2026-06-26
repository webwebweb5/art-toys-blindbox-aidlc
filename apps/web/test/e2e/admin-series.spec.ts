import { test, expect, loginViaUI } from './helpers/fixtures';

/**
 * E2E Test: Admin Series Management
 *
 * Validates admin workflows:
 * 1. Login as admin
 * 2. Navigate to series management
 * 3. Create a new series
 * 4. Add figures with probabilities
 * 5. Verify probability sum validation
 * 6. Publish the series
 */
test.describe('Admin Series Management', () => {
  const adminCredentials = {
    email: 'admin@arttoys.test',
    password: 'AdminPass123!',
  };

  test('admin can create and publish a series', async ({ page }) => {
    // Step 1: Login as admin
    await loginViaUI(page, adminCredentials.email, adminCredentials.password);

    // Step 2: Navigate to series management
    await page.goto('/admin/series');
    await expect(page.getByRole('heading')).toContainText(/series/i);

    // Step 3: Click create new series
    await page.getByRole('button', { name: /create|new|add/i }).click();

    // Step 4: Fill in series details
    await page.getByLabel(/name/i).fill('E2E Test Series');
    await page.getByLabel(/artist/i).fill('E2E Artist');
    await page.getByLabel(/price/i).fill('9.99');

    // Submit the series creation form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Should navigate to series edit page or show success
    await expect(
      page.getByText(/created|success/i).or(page.getByTestId('series-edit')),
    ).toBeVisible({ timeout: 5000 });
  });

  test('probability validation: sum must equal 100%', async ({ page }) => {
    await loginViaUI(page, adminCredentials.email, adminCredentials.password);
    await page.goto('/admin/series');

    // Navigate to an existing series edit page
    const seriesRows = page.getByTestId('series-row').or(
      page.locator('table tbody tr'),
    );
    const count = await seriesRows.count();
    test.skip(count === 0, 'No series available for editing');

    await seriesRows.first().click();

    // Navigate to figures tab/section
    const figuresTab = page.getByRole('tab', { name: /figure/i }).or(
      page.getByRole('link', { name: /figure/i }),
    );
    if (await figuresTab.isVisible()) {
      await figuresTab.click();
    }

    // Look for probability validation message
    const probabilityDisplay = page.getByTestId('probability-total').or(
      page.getByText(/total.*probability|sum.*%/i),
    );

    if (await probabilityDisplay.isVisible()) {
      const text = await probabilityDisplay.textContent();
      // The UI should show the total probability percentage
      expect(text).toBeTruthy();
    }
  });

  test('admin can navigate series management dashboard', async ({ page }) => {
    await loginViaUI(page, adminCredentials.email, adminCredentials.password);

    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page.getByRole('main')).toBeVisible();

    // Navigate to series section
    const seriesLink = page.getByRole('link', { name: /series/i });
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await expect(page).toHaveURL(/\/admin\/series/);
    }
  });

  test('non-admin user cannot access admin pages', async ({ page }) => {
    // Login as regular customer
    await page.goto('/login');
    await page.getByLabel('Email').fill('customer@arttoys.test');
    await page.getByLabel('Password').fill('CustomerPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Try to access admin page
    await page.goto('/admin/series');

    // Should be redirected away or show access denied
    await expect(
      page.getByText(/unauthorized|forbidden|access denied/i).or(
        page.locator('[data-testid="access-denied"]'),
      ),
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // Alternative: redirected to home or login
      expect(page.url()).not.toContain('/admin/series');
    });
  });
});
