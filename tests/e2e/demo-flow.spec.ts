/**
 * E2E tests for Loop app — logged-in UI flows.
 *
 * Uses ?demo=1 mode to bypass Firebase Auth (which requires authorized domains
 * not configured for localhost). This validates that the post-login UI renders,
 * tab navigation works, and interactive states fire — without needing the
 * Firebase Auth Emulator.
 *
 * Limitation: this does NOT verify the Firebase Auth chain (signInWithGoogle
 * popup/redirect/token exchange) or real Firestore reads/writes. Those remain
 * covered by manual + iOS smoke testing. Full Auth Emulator setup is deferred.
 */
import { test, expect } from '@playwright/test';

const DEMO_URL = 'http://localhost:4173/?demo=1';

test.describe('Demo mode (logged-in UI surrogate)', () => {
  test('Demo cold-load fires zero React warnings or errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });
    // Wait for affirmations + habits + section labels to settle
    await expect(page.getByText('Affirmations', { exact: true })).toBeVisible();
    await expect(page.getByText('Habits', { exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Today shows 2 affirmations + 2 habits sections', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    // Brand visible in header
    await expect(page.locator('h1').first()).toContainText('Loop');

    // Two section labels rendered
    await expect(page.getByText('Affirmations', { exact: true })).toBeVisible();
    await expect(page.getByText('Habits', { exact: true })).toBeVisible();

    // Preset content present
    await expect(page.getByText('I am enough.')).toBeVisible();
    await expect(page.getByText('Today, I choose calm.')).toBeVisible();
    await expect(page.getByText('散步 30 分钟')).toBeVisible();
    await expect(page.getByText('读书 20 页')).toBeVisible();
  });

  test('Toggling a task checkbox flips its completed state', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    const firstAffirmationToggle = page.getByRole('button', { name: 'Mark complete' }).first();
    await firstAffirmationToggle.click();

    // After click, the same row's button label flips to "Mark incomplete"
    await expect(
      page.getByRole('button', { name: 'Mark incomplete' }).first(),
    ).toBeVisible({ timeout: 3000 });
  });

  test('Today tab shows Will Durant tagline', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    // Today is the default landing tab after demo load.
    await expect(page.getByText('You are what you repeatedly do.')).toBeVisible({
      timeout: 3000,
    });
  });

  test('Practice tab shows "Decide what to repeat." tagline', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    // Bottom-nav PRACTICE tab
    await page.getByRole('button', { name: /PRACTICE/i }).click();

    await expect(page.getByText('Decide what to repeat.')).toBeVisible({
      timeout: 3000,
    });
  });

  test('History tab renders Active Practices stat', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: /HISTORY/i }).click();

    // The History tab shows the "Active Practices" stat label.
    // The label is rendered as <span>Active<br/>Practices</span>, so its
    // textContent collapses to "ActivePractices" — match by regex substring.
    await expect(page.locator('span').filter({ hasText: /Practices/ }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('Calendar day tap opens detail sheet showing that day\'s practices', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: /HISTORY/i }).click();

    // Tap the first calendar day that has practices (aria-label "View MMM d details")
    await page.getByRole('button', { name: /^View .* details$/ }).first().click();

    // Sheet appears with "of N completed" summary
    await expect(page.getByText(/of \d+ completed/i)).toBeVisible({ timeout: 3000 });

    // Escape key closes the sheet
    await page.keyboard.press('Escape');
    await expect(page.getByText(/of \d+ completed/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('Day detail sheet has scrollable content region separate from drag handle', async ({ page }) => {
    // Small viewport forces the sheet (max-h 80vh) to be shorter than content.
    await page.setViewportSize({ width: 390, height: 240 });
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: /HISTORY/i }).click();
    await page.getByRole('button', { name: /^View .* details$/ }).first().click();
    await expect(page.getByText(/of \d+ completed/i)).toBeVisible({ timeout: 3000 });

    // Structural guarantee against the original bug:
    //   The bug was that drag="y" + overflow-y-auto on the same element made
    //   framer-motion swallow vertical touch gestures, so the user couldn't
    //   scroll. The fix splits these into separate elements: drag is opt-in
    //   via dragControls on the grab handle, and the content area owns scroll.
    const structure = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!dialog) return null;
      const dialogCS = getComputedStyle(dialog);
      const scrollEl = dialog.querySelector<HTMLElement>('.overflow-y-auto');
      if (!scrollEl) return { dialogOverflowY: dialogCS.overflowY, scrollEl: null };
      // Verify content actually overflows and the inner element does scroll.
      scrollEl.scrollTop = 0;
      const before = scrollEl.scrollTop;
      scrollEl.scrollTop = 9999;
      const after = scrollEl.scrollTop;
      return {
        dialogOverflowY: dialogCS.overflowY,
        scrollEl: {
          overflowY: getComputedStyle(scrollEl).overflowY,
          canScroll: scrollEl.scrollHeight > scrollEl.clientHeight,
          scrollTopBefore: before,
          scrollTopAfter: after,
        },
      };
    });
    expect(structure).not.toBeNull();
    // Outer dialog must NOT be the scroll container — that's what blocked touch scroll.
    expect(structure!.dialogOverflowY).not.toBe('auto');
    expect(structure!.dialogOverflowY).not.toBe('scroll');
    // Inner content region owns scroll.
    expect(structure!.scrollEl).not.toBeNull();
    expect(structure!.scrollEl!.overflowY).toBe('auto');
    expect(structure!.scrollEl!.canScroll).toBe(true);
    expect(structure!.scrollEl!.scrollTopAfter).toBeGreaterThan(0);
  });

  test('Exit Demo button returns to login page', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: 'Exit Demo' }).click();

    // After exit, login button (Continue with Google) becomes visible
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
