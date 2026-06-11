// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import React from 'react';

/**
 * 锁死乐观 UI 关键不变式：
 *   ① 点开启按钮 → prompt 在 < 100ms 内消失（不等 await）
 *   ② 后台异常（非 permission denied）→ prompt 重新弹出 + 错误信息
 *   ③ permission=denied → prompt 保持关闭（用户主动拒绝不骚扰）
 *
 * 这是 9bc6568 commit 的核心承诺。任何把 await 提到 setVisible 之前的
 * 改动都会让 ① 挂掉，提醒下次维护者别破坏「3 秒内体感成功」。
 */

vi.mock('../src/firebase', () => ({ db: {} }));

// motion/react 的 AnimatePresence 在 jsdom 下 exit 动画不完成会留 ghost
// DOM，导致 query 匹配多元素。测试只关心 React state → DOM 同步，把 motion
// 透明化即可。
vi.mock('motion/react', () => {
  const FRAMER_PROPS = new Set([
    'initial',
    'animate',
    'exit',
    'transition',
    'whileHover',
    'whileTap',
    'layout',
    'layoutId',
    'variants',
  ]);
  const makeTag =
    (tag: string) =>
    ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (FRAMER_PROPS.has(k)) continue;
        safeProps[k] = v;
      }
      return React.createElement(tag, safeProps, children);
    };
  return {
    motion: new Proxy(
      {},
      { get: (_t, prop: string) => makeTag(prop) },
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const requestPermissionAndSubscribeMock = vi.fn();
const isPushSupportedMock = vi.fn(() => true);
const isIOSNonStandaloneMock = vi.fn(() => false);
const resetServiceWorkerMock = vi.fn();

vi.mock('../src/lib/messaging', () => ({
  requestPermissionAndSubscribe: (...args: unknown[]) =>
    requestPermissionAndSubscribeMock(...args),
  isPushSupported: () => isPushSupportedMock(),
  isIOSNonStandalone: () => isIOSNonStandaloneMock(),
  resetServiceWorker: () => resetServiceWorkerMock(),
}));

import NotificationPrompt from '../src/components/NotificationPrompt';

function stubNotificationPermission(perm: 'default' | 'granted' | 'denied') {
  // jsdom 默认没有 Notification 全局
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: {
      permission: perm,
      requestPermission: vi.fn().mockResolvedValue(perm),
    },
  });
}

describe('NotificationPrompt 乐观 UI', () => {
  beforeEach(() => {
    // vitest 4.x 在某些 jsdom 配置下 localStorage 不完整，直接 stub
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    requestPermissionAndSubscribeMock.mockReset();
    isPushSupportedMock.mockReturnValue(true);
    isIOSNonStandaloneMock.mockReturnValue(false);
    stubNotificationPermission('default');
  });

  afterEach(() => {
    cleanup(); // 先 unmount React（让 useEffect cleanup 还能访问 stubbed globals）
    delete (globalThis as unknown as Record<string, unknown>).Notification;
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it('点开启按钮立即关闭 prompt（不等 subscribe 完成）', async () => {
    // requestPermissionAndSubscribe 永不 resolve，模拟 FCM 慢
    requestPermissionAndSubscribeMock.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<NotificationPrompt userId="test-user" />);

    const enableBtn = await screen.findByRole('button', { name: /^开启$/ });
    expect(enableBtn).not.toBeNull();

    fireEvent.click(enableBtn);

    // 关键不变式：prompt 立即消失，不等 await 完成
    await waitFor(
      () => {
        expect(
          screen.queryByRole('button', { name: /^开启$/ }),
        ).toBeNull();
      },
      { timeout: 100 },
    );

    // 后台 fire-and-forget 已触发
    expect(requestPermissionAndSubscribeMock).toHaveBeenCalledWith('test-user');
    expect(requestPermissionAndSubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('subscribe 失败时静默不再弹出 prompt + 不显示错误（SW 升级过渡态不骚扰）', async () => {
    let rejectFn: (err: Error) => void = () => {};
    requestPermissionAndSubscribeMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFn = reject;
        }),
    );

    render(<NotificationPrompt userId="test-user" />);

    const enableBtn = await screen.findByRole('button', { name: /^开启$/ });
    fireEvent.click(enableBtn);

    // 先确认乐观隐藏发生
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /^开启$/ }),
      ).toBeNull();
    });

    // 后台 reject（典型 SW 升级过渡态错误）
    await act(async () => {
      rejectFn(new Error('Service Worker 初始化超时（15s；installing(installing),scope=/）'));
    });

    // 关键不变式：prompt 保持关闭，错误不显示，「重置 SW」按钮不显示。
    // 依赖 controllerchange 监听器 + useEffect mount 路径在 SW active 时
    // 静默 retry。用户体感始终是「点了 = 成功了」。
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('button', { name: /^开启$/ })).toBeNull();
    expect(screen.queryByText(/Service Worker/)).toBeNull();
    expect(screen.queryByRole('button', { name: /重置/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /重试/ })).toBeNull();
  });

  it('SW controllerchange 事件 + permission=granted → 自动 silent retry subscribe', async () => {
    stubNotificationPermission('granted');
    requestPermissionAndSubscribeMock.mockResolvedValue({ endpoint: 'fcm-endpoint' });

    // mock navigator.serviceWorker with addEventListener
    const handlers: Record<string, EventListener[]> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        addEventListener: (event: string, h: EventListener) => {
          (handlers[event] = handlers[event] || []).push(h);
        },
        removeEventListener: (event: string, h: EventListener) => {
          handlers[event] = (handlers[event] || []).filter((x) => x !== h);
        },
      },
    });

    render(<NotificationPrompt userId="test-user" />);
    await new Promise((r) => setTimeout(r, 20));

    // useEffect mount 路径已经触发一次（permission=granted）
    const initialCalls = requestPermissionAndSubscribeMock.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    // 模拟 SW activate 触发 controllerchange
    await act(async () => {
      (handlers['controllerchange'] || []).forEach((h) => h(new Event('controllerchange')));
    });

    // 触发了额外一次 silent retry
    expect(requestPermissionAndSubscribeMock.mock.calls.length).toBeGreaterThan(
      initialCalls,
    );
    // UI 完全无变化（prompt 仍隐藏，无错误）
    expect(screen.queryByRole('button', { name: /^开启$/ })).toBeNull();
    expect(screen.queryByText(/Service Worker/)).toBeNull();
    // serviceWorker stub 在 afterEach 里清
  });

  it('permission denied 时 prompt 保持关闭（用户主动拒绝不再骚扰）', async () => {
    let rejectFn: (err: Error) => void = () => {};
    requestPermissionAndSubscribeMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFn = reject;
        }),
    );

    render(<NotificationPrompt userId="test-user" />);

    const enableBtn = await screen.findByRole('button', { name: /^开启$/ });
    fireEvent.click(enableBtn);

    // 后台 reject with permission=denied
    await act(async () => {
      rejectFn(new Error('permission=denied'));
    });

    // prompt 仍隐藏，无错误信息
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.queryByRole('button', { name: /^开启$/ }),
    ).toBeNull();
    expect(screen.queryByText(/Service Worker/)).toBeNull();
  });

  it('permission granted 时 prompt 不显示（已经开启过的用户）', async () => {
    stubNotificationPermission('granted');
    requestPermissionAndSubscribeMock.mockResolvedValue({ endpoint: 'fcm-endpoint' });

    render(<NotificationPrompt userId="test-user" />);

    // 给 useEffect 跑完一帧
    await new Promise((r) => setTimeout(r, 20));

    // 不显示 prompt
    expect(screen.queryByRole('button', { name: /^开启$/ })).toBeNull();
    // useEffect 静默 re-subscribe 路径触发
    expect(requestPermissionAndSubscribeMock).toHaveBeenCalledWith('test-user');
  });
});
