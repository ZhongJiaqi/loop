/**
 * E2E tests for Loop app.
 * Runs against local preview server (production build).
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Login Page', () => {
  test('shows Loop brand and login button', async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React to render (Firebase SDK keeps connections open, so networkidle won't work)
    await page.waitForSelector('h1', { timeout: 15000 });

    await expect(page.locator('h1')).toContainText('Loop');
    await expect(page.locator('button')).toContainText('Continue with Google');
  });

  test('shows tagline', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('h1', { timeout: 15000 });
    await expect(
      page.locator('p').filter({ hasText: 'Identity shapes thoughts' })
    ).toBeVisible();
  });
});

test.describe('PWA', () => {
  test('manifest is accessible with correct data', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.webmanifest`);
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest.name).toBe('Loop');
    expect(manifest.short_name).toBe('Loop');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#F5F2EC');
    // any + maskable variants × 2 sizes = 4 icons
    expect(manifest.icons).toHaveLength(4);
    const anyIcons = manifest.icons.filter((i: { purpose?: string }) => i.purpose === 'any');
    const maskableIcons = manifest.icons.filter((i: { purpose?: string }) => i.purpose === 'maskable');
    expect(anyIcons).toHaveLength(2);
    expect(maskableIcons).toHaveLength(2);
  });

  test('icons are accessible', async ({ page }) => {
    const icon192 = await page.goto(`${BASE_URL}/icon-192x192.png`);
    expect(icon192?.status()).toBe(200);

    const icon512 = await page.goto(`${BASE_URL}/icon-512x512.png`);
    expect(icon512?.status()).toBe(200);

    const appleTouchIcon = await page.goto(`${BASE_URL}/apple-touch-icon.png`);
    expect(appleTouchIcon?.status()).toBe(200);

    const maskable192 = await page.goto(`${BASE_URL}/icon-maskable-192x192.png`);
    expect(maskable192?.status()).toBe(200);

    const maskable512 = await page.goto(`${BASE_URL}/icon-maskable-512x512.png`);
    expect(maskable512?.status()).toBe(200);
  });

  test('page title is Loop', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Loop');
  });

  test('has correct meta tags in HTML', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#F5F2EC');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Identity shapes thoughts');

    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(appleCapable).toBe('yes');
  });
});

test.describe('Responsive', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await expect(page.locator('h1')).toContainText('Loop');
    await expect(page.locator('button')).toContainText('Continue with Google');
  });
});
