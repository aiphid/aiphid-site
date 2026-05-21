import { test, expect } from '@playwright/test';

test.describe('Registration page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  // ── Page load ──────────────────────────────────────────────

  test('loads with VIP tier pre-selected', async ({ page }) => {
    const vip = page.locator('.tier-card[data-tier="vip"]');
    await expect(vip).toHaveClass(/selected/);
    await expect(page.locator('#cta-label')).toContainText('VIP');
    await expect(page.locator('#cta-price')).toHaveText('$75');
  });

  test('shows all three tiers', async ({ page }) => {
    await expect(page.locator('.tier-card[data-tier="general"]')).toBeVisible();
    await expect(page.locator('.tier-card[data-tier="vip"]')).toBeVisible();
    await expect(page.locator('.tier-card[data-tier="season"]')).toBeVisible();
  });

  test('consent checkboxes are unchecked by default', async ({ page }) => {
    await expect(page.locator('#consent-required')).not.toHaveClass(/checked/);
    await expect(page.locator('#consent-marketing')).not.toHaveClass(/checked/);
  });

  // ── Tier selection ──────────────────────────────────────────

  test('selecting General updates CTA label and price', async ({ page }) => {
    await page.locator('.tier-card[data-tier="general"]').click();
    await expect(page.locator('#cta-label')).toContainText('General');
    await expect(page.locator('#cta-price')).toHaveText('$35');
  });

  test('selecting Season Pass updates CTA label and price', async ({ page }) => {
    await page.locator('.tier-card[data-tier="season"]').click();
    await expect(page.locator('#cta-label')).toContainText('Season Pass');
    await expect(page.locator('#cta-price')).toHaveText('$200');
  });

  test('only one tier can be selected at a time', async ({ page }) => {
    await page.locator('.tier-card[data-tier="general"]').click();
    await expect(page.locator('.tier-card.selected')).toHaveCount(1);
    await expect(page.locator('.tier-card[data-tier="general"]')).toHaveClass(/selected/);
    await expect(page.locator('.tier-card[data-tier="vip"]')).not.toHaveClass(/selected/);
  });

  // ── Consent gate — CCPA critical ───────────────────────────

  test('CCPA: submitting without consent shows error and does not navigate', async ({ page }) => {
    // Fill valid fields
    await page.fill('#first-name', 'Thomas');
    await page.fill('#last-name', 'Wesley');
    await page.fill('#email', 'diplo@example.com');

    let navigated = false;
    page.on('framenavigated', () => { navigated = true; });

    await page.locator('#cta-btn').click();

    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toast')).toContainText('Privacy Policy');
    expect(navigated).toBe(false);
  });

  test('CCPA: consent checkbox toggles on click', async ({ page }) => {
    await page.locator('#consent-required').click();
    await expect(page.locator('#consent-required')).toHaveClass(/checked/);

    await page.locator('#consent-required').click();
    await expect(page.locator('#consent-required')).not.toHaveClass(/checked/);
  });

  test('CCPA: marketing consent is independent of required consent', async ({ page }) => {
    await page.locator('#consent-marketing').click();
    await expect(page.locator('#consent-marketing')).toHaveClass(/checked/);
    await expect(page.locator('#consent-required')).not.toHaveClass(/checked/);
  });

  // ── Form validation ─────────────────────────────────────────

  test('submitting without first name shows field error', async ({ page }) => {
    await page.fill('#last-name', 'Wesley');
    await page.fill('#email', 'diplo@example.com');
    await page.locator('#consent-required').click();
    await page.locator('#cta-btn').click();

    await expect(page.locator('#err-first')).toHaveClass(/show/);
    await expect(page.locator('#err-last')).not.toHaveClass(/show/);
    await expect(page.locator('#err-email')).not.toHaveClass(/show/);
  });

  test('submitting without last name shows field error', async ({ page }) => {
    await page.fill('#first-name', 'Thomas');
    await page.fill('#email', 'diplo@example.com');
    await page.locator('#consent-required').click();
    await page.locator('#cta-btn').click();

    await expect(page.locator('#err-last')).toHaveClass(/show/);
  });

  test('submitting with invalid email shows field error', async ({ page }) => {
    await page.fill('#first-name', 'Thomas');
    await page.fill('#last-name', 'Wesley');
    await page.fill('#email', 'notanemail');
    await page.locator('#consent-required').click();
    await page.locator('#cta-btn').click();

    await expect(page.locator('#err-email')).toHaveClass(/show/);
  });

  test('submitting with empty email shows field error', async ({ page }) => {
    await page.fill('#first-name', 'Thomas');
    await page.fill('#last-name', 'Wesley');
    await page.locator('#consent-required').click();
    await page.locator('#cta-btn').click();

    await expect(page.locator('#err-email')).toHaveClass(/show/);
  });

  // ── Happy path ──────────────────────────────────────────────

  test('all valid fields + consent triggers Stripe redirect', async ({ page }) => {
    // Intercept the Stripe redirect so we don't actually leave
    let redirectUrl = '';
    page.on('request', req => {
      if (req.url().includes('stripe.com') || req.url().includes('buy.stripe.com')) {
        redirectUrl = req.url();
      }
    });

    // Intercept navigation away from localhost
    await page.route('**', async route => {
      if (!route.request().url().startsWith('http://localhost')) {
        redirectUrl = route.request().url();
        await route.abort();
      } else {
        await route.continue();
      }
    });

    await page.fill('#first-name', 'Thomas');
    await page.fill('#last-name', 'Wesley');
    await page.fill('#email', 'diplo@example.com');
    await page.fill('#city', 'Los Angeles');
    await page.locator('#consent-required').click();
    await page.locator('#cta-btn').click();

    // Wait for redirect attempt
    await page.waitForTimeout(1000);

    // Redirect URL includes email (URL-encoded) and tier metadata
    expect(decodeURIComponent(redirectUrl)).toContain('diplo@example.com');
    expect(redirectUrl).toContain('vip');
  });

  // ── CCPA links ──────────────────────────────────────────────

  test('privacy policy link is present and points to /privacy', async ({ page }) => {
    const link = page.locator('.consent-text a[href="/privacy"]').first();
    await expect(link).toBeVisible();
  });

  test('CCPA rights link is present', async ({ page }) => {
    const link = page.locator('a[href="/privacy#ccpa"]').first();
    await expect(link).toBeVisible();
  });

  test('"do not sell" statement is visible', async ({ page }) => {
    await expect(page.locator('.ccpa-bar')).toContainText('do not sell');
  });

});

// ── Routing ─────────────────────────────────────────────────────
// Note: /run-club → /register is a Vercel redirect (vercel.json).
// It works in production but not with `serve` locally.
// Verified via: vercel dev or deployed preview URL.

