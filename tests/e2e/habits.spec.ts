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
      page.locator('p').filter({ hasText: 'Thoughts create feelings' })
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
    expect(manifest.theme_color).toBe('#F9F8F6');
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons[0].sizes).toBe('192x192');
    expect(manifest.icons[1].sizes).toBe('512x512');
  });

  test('icons are accessible', async ({ page }) => {
    const icon192 = await page.goto(`${BASE_URL}/icon-192x192.png`);
    expect(icon192?.status()).toBe(200);

    const icon512 = await page.goto(`${BASE_URL}/icon-512x512.png`);
    expect(icon512?.status()).toBe(200);

    const appleTouchIcon = await page.goto(`${BASE_URL}/apple-touch-icon.png`);
    expect(appleTouchIcon?.status()).toBe(200);
  });

  test('page title is Loop', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Loop');
  });

  test('has correct meta tags in HTML', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#F9F8F6');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('Thoughts create feelings');

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
