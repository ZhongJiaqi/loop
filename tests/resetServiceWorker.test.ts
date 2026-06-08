// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/firebase', () => ({ db: {} }));

import { resetServiceWorker } from '../src/lib/messaging';

/**
 * resetServiceWorker 是「SW 卡死」逃生通道，必须满足：
 *  1. 调用 unregister 清掉所有 SW
 *  2. 调用 caches.delete 清掉所有 caches
 *  3. 即使某一步抛错也要继续往下走（保证用户能脱身）
 *
 * 注意：jsdom 的 window.location.reload 是 non-configurable，不便直接 mock。
 * 我们的契约里 reload 只是"最后一步"，函数本身用 try/catch 包住每个外部副作用；
 * 这里只校验 unregister/caches 链路，reload 的副作用靠真机回归 + 代码 review 兜底。
 */

describe('resetServiceWorker', () => {
  beforeEach(() => {
    // 让 reload 不真的刷新 jsdom（jsdom 28 之前 reload 会抛 "Not implemented" warn）
    try {
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: vi.fn(),
      });
    } catch {
      /* configurable=false，忽略；jsdom 仅打个 warning，不影响测试 */
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    delete (globalThis as unknown as Record<string, unknown>).caches;
  });

  function stubSw(getRegistrations: () => Promise<unknown[]>) {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: { getRegistrations },
    });
  }

  function stubCaches(api: {
    keys?: () => Promise<string[]>;
    delete?: (n: string) => Promise<boolean>;
  }) {
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      writable: true,
      value: api,
    });
  }

  it('unregisters all SW registrations and deletes all caches', async () => {
    const unregister1 = vi.fn().mockResolvedValue(true);
    const unregister2 = vi.fn().mockResolvedValue(true);
    const cacheDelete = vi.fn().mockResolvedValue(true);
    stubSw(() =>
      Promise.resolve([{ unregister: unregister1 }, { unregister: unregister2 }]),
    );
    stubCaches({ keys: () => Promise.resolve(['workbox-precache-v2', 'runtime']), delete: cacheDelete });

    await resetServiceWorker();

    expect(unregister1).toHaveBeenCalledTimes(1);
    expect(unregister2).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith('workbox-precache-v2');
    expect(cacheDelete).toHaveBeenCalledWith('runtime');
  });

  it('does not throw if getRegistrations rejects (iOS Safari quirks)', async () => {
    stubSw(() => Promise.reject(new Error('iOS rejected')));
    stubCaches({ keys: () => Promise.resolve([]), delete: vi.fn() });

    await expect(resetServiceWorker()).resolves.toBeUndefined();
  });

  it('does not throw when caches API is missing entirely', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    stubSw(() => Promise.resolve([{ unregister }]));
    // 不 stub caches；'caches' in window 应为 false

    await expect(resetServiceWorker()).resolves.toBeUndefined();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('does not throw when navigator.serviceWorker is missing (older browsers)', async () => {
    // 不 stub serviceWorker
    stubCaches({ keys: () => Promise.resolve([]), delete: vi.fn() });

    await expect(resetServiceWorker()).resolves.toBeUndefined();
  });

  it('does not throw when a single unregister rejects (continues to caches + reload)', async () => {
    const cacheDelete = vi.fn().mockResolvedValue(true);
    stubSw(() =>
      Promise.resolve([{ unregister: vi.fn().mockRejectedValue(new Error('boom')) }]),
    );
    stubCaches({ keys: () => Promise.resolve(['x']), delete: cacheDelete });

    await expect(resetServiceWorker()).resolves.toBeUndefined();
    expect(cacheDelete).toHaveBeenCalledWith('x');
  });
});
