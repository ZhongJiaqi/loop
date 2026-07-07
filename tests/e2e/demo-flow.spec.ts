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
    // Wait for all three sections + section labels to settle
    await expect(page.getByText('Affirmations', { exact: true })).toBeVisible();
    await expect(page.getByText('Mindsets', { exact: true })).toBeVisible();
    await expect(page.getByText('Habits', { exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Today shows 3 sections: Affirmations + Mindsets + Habits', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    // Brand visible in header
    await expect(page.locator('h1').first()).toContainText('Loop');

    // Three section labels rendered (Affirmation → Mindset → Habit order)
    await expect(page.getByText('Affirmations', { exact: true })).toBeVisible();
    await expect(page.getByText('Mindsets', { exact: true })).toBeVisible();
    await expect(page.getByText('Habits', { exact: true })).toBeVisible();

    // Preset content present
    await expect(page.getByText('I am enough.')).toBeVisible();
    await expect(page.getByText('Today, I choose calm.')).toBeVisible();
    await expect(page.getByText('用行动构建自信')).toBeVisible();
    await expect(page.getByText('转移注意力')).toBeVisible();
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

  test('orphan task from a deleted habit never shows in Today', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    // The demo seeds one orphan task (habitId points to a deleted mindset habit).
    // Before the fix it leaked into the Habits section via the `?? "habit"`
    // fallback; it must now be excluded from every section.
    await expect(page.getByText('（已删）旧的 mindset')).toHaveCount(0);
    // Sanity: real practices still render.
    await expect(page.getByText('散步 30 分钟')).toBeVisible();
  });

  test('History renders Current / Best / Active stat trio', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: /HISTORY/i }).click();

    // Three stats sit side by side. Labels render as <span>X<br/>Y</span>, so
    // textContent collapses (e.g. "CurrentStreak") — match by regex substring.
    // Current Streak must come before Best Streak in the DOM.
    const current = page.locator('span').filter({ hasText: /CurrentStreak/ }).first();
    const best = page.locator('span').filter({ hasText: /BestStreak/ }).first();
    await expect(current).toBeVisible({ timeout: 5000 });
    await expect(best).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /Practices/ }).first()).toBeVisible();
  });

  test('History shows Completion Trend chart with working range toggle', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: /HISTORY/i }).click();

    // Trend chart section header + the stock-style range toggle are present.
    await expect(page.getByText('Completion Trend')).toBeVisible({ timeout: 5000 });
    const chart = page.locator('svg[aria-label*="趋势"]');
    await expect(chart).toBeVisible();

    // All six stock-style ranges are present.
    for (const label of ['1W', '1M', '3M', '6M', '1Y', 'ALL']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    // Default range is 1M (30 days). Switching re-scopes the series —
    // the aria-label encodes the active range, so it must change.
    await expect(chart).toHaveAttribute('aria-label', /范围 1m/);
    await page.getByRole('button', { name: '1W', exact: true }).click();
    await expect(chart).toHaveAttribute('aria-label', /范围 1w/);
    await page.getByRole('button', { name: '1Y', exact: true }).click();
    await expect(chart).toHaveAttribute('aria-label', /范围 1y/);
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

  test('Practice page reorders Habits via keyboard, Today follows new order', async ({ page }) => {
    // Demo seeds: Habits section is [散步 30 分钟, 读书 20 页] (sortIndex 0, 1).
    // Move "散步" down one slot using @dnd-kit's keyboard sensor:
    // focus drag handle → Space (lift) → ArrowDown (move) → Space (drop).
    // Expected after: [读书 20 页, 散步 30 分钟] on Practice AND on Today.
    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    await page.getByRole('button', { name: 'PRACTICE' }).click();
    await expect(page.getByText('Decide what to repeat.')).toBeVisible();

    // Sanity: starting order on Practice.
    const practiceTitlesBefore = await page
      .locator('main span.font-serif')
      .allTextContents();
    const habitsBefore = practiceTitlesBefore.filter(t =>
      t.includes('散步') || t.includes('读书'),
    );
    expect(habitsBefore).toEqual(['散步 30 分钟', '读书 20 页']);

    // Activator is a <button aria-label="Reorder item N..."> with the ordinal.
    // 6 activators in DOM order (Practice page sections):
    //   a1(0), a2(1), m1(2: 用行动构建自信), m2(3: 转移注意力), h1(4: 散步), h2(5: 读书)
    // Focus the 散步 handle (nth=4) and use @dnd-kit's keyboard sensor.
    const handles = page.locator('button[aria-label^="Reorder item"]');
    await expect(handles).toHaveCount(6);
    await handles.nth(4).focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    await page.keyboard.press('Space');
    await page.waitForTimeout(400); // allow @dnd-kit drop + state update

    // Practice: order swapped.
    const practiceTitlesAfter = await page
      .locator('main span.font-serif')
      .allTextContents();
    const habitsAfter = practiceTitlesAfter.filter(t =>
      t.includes('散步') || t.includes('读书'),
    );
    expect(habitsAfter).toEqual(['读书 20 页', '散步 30 分钟']);

    // Today: same order propagates.
    await page.getByRole('button', { name: 'TODAY' }).click();
    await expect(page.getByText('You are what you repeatedly do.')).toBeVisible();
    const todayTitles = await page
      .locator('main')
      .getByText(/散步|读书/)
      .allTextContents();
    expect(todayTitles).toEqual(['读书 20 页', '散步 30 分钟']);
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
