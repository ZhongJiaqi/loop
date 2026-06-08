import { test, expect } from '@playwright/test';

const DEMO_URL = '/?demo=1';

// Mood UI 是 mobile-first (max-w-md sheet)，用 iPhone 尺寸跑更贴近真实场景。
test.use({ viewport: { width: 390, height: 844 } });

// serial 避免并发跑时多个 page 争 preview server 导致 lazy chunk 加载抖动
test.describe.configure({ mode: 'serial' });

test.describe('Mood tab (demo flow)', () => {
  test('4 tabs render in correct order', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(DEMO_URL);
    await page.waitForSelector('h1', { timeout: 15000 });

    const labels = await page
      .locator('nav button span')
      .filter({ hasText: /TODAY|PRACTICE|MOOD|HISTORY/ })
      .allInnerTexts();
    const order = labels.map((t) => t.trim());
    expect(order).toEqual(['TODAY', 'PRACTICE', 'MOOD', 'HISTORY']);
    expect(errors).toEqual([]);
  });

  test('record a mood end-to-end and see it in feed', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(DEMO_URL);
    await page.waitForSelector('h1');

    await page.waitForSelector('nav button');
    await page.locator('nav button').filter({ hasText: 'MOOD' }).click();
    await expect(page.getByText('还没有记录')).toBeVisible({ timeout: 15000 });

    // 打开 picker
    await page.getByRole('button', { name: /\+ 此刻你怎么样？/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 选 "恐惧" 桶 — 用 evaluate 触发原生 click（sheet 在 mobile viewport 可能超出）
    await page
      .getByRole('button', { name: '选择 恐惧' })
      .evaluate((btn) => (btn as HTMLButtonElement).click());

    // 选两个词（scope 到 dialog 内避免和 nav 标签等元素冲突）
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: '焦虑' })
      .evaluate((btn) => (btn as HTMLButtonElement).click());
    await dialog
      .getByRole('button', { name: '多疑' })
      .evaluate((btn) => (btn as HTMLButtonElement).click());

    // 完成 — sheet 在 mobile viewport 下可能超出 viewport，用 evaluate 触发原生 click
    await dialog.getByRole('button', { name: '完成' }).evaluate((btn) =>
      (btn as HTMLButtonElement).click(),
    );

    // feed 出现 1 条 + 计数
    await expect(page.getByText(/今天 ·/)).toBeVisible();
    await expect(page.getByText('1 次')).toBeVisible();
    // 记录内含选的词（顺序可能任一）
    await expect(page.getByText(/焦虑.*多疑|多疑.*焦虑/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('只记桶（不选词）也能完成', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(DEMO_URL);
    await page.waitForSelector('h1');

    await page.waitForSelector('nav button');
    await page.locator('nav button').filter({ hasText: 'MOOD' }).click();
    await expect(page.getByText('还没有记录')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /\+ 此刻你怎么样？/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByRole('button', { name: '选择 平和' })
      .evaluate((btn) => (btn as HTMLButtonElement).click());

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '完成' }).evaluate((btn) =>
      (btn as HTMLButtonElement).click(),
    );

    await expect(page.getByText('1 次')).toBeVisible();
    // 平和 桶名显示
    await expect(page.getByLabel(/平和 记录/)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
