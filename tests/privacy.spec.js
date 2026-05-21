import { test, expect } from '@playwright/test';

test.describe('Privacy policy', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy');
  });

  test('loads without errors', async ({ page }) => {
    await expect(page).toHaveTitle(/Privacy Policy/);
  });

  test('displays no-sell statement prominently', async ({ page }) => {
    const highlight = page.locator('.highlight-box').first();
    await expect(highlight).toContainText('do not sell');
  });

  test('CCPA section is present', async ({ page }) => {
    await expect(page.locator('#ccpa')).toBeVisible();
    await expect(page.locator('#ccpa')).toContainText('California');
  });

  test('direct link to #ccpa scrolls to the section', async ({ page }) => {
    await page.goto('/privacy#ccpa');
    const ccpaSection = page.locator('#ccpa');
    await expect(ccpaSection).toBeInViewport();
  });

  test('privacy@aiphid.com contact link is present', async ({ page }) => {
    await expect(page.locator('a[href="mailto:privacy@aiphid.com"]').first()).toBeVisible();
  });

  test('back to registration link works', async ({ page }) => {
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('data table lists all collection categories', async ({ page }) => {
    const rows = page.locator('table tr');
    await expect(rows).toHaveCount(7); // header + 6 data rows
  });

});
