// @vitest-environment jsdom
/**
 * 单测 useAuthTimeout —— Firebase auth 网络不通兜底。
 *
 * 三个关键场景：
 * 1. authReady=false 且超时未到 → timedOut=false（仍在等正常回调）
 * 2. authReady=false 且超时到 → timedOut=true（触发 ConnectivityError 渲染）
 * 3. 超时窗口内 authReady 翻 true → timedOut 始终 false，超时被清理（正常路径不误报）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthTimeout } from '../src/lib/useAuthTimeout';

describe('useAuthTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false before timeout elapses', () => {
    const { result } = renderHook(() =>
      useAuthTimeout({ authReady: false, timeoutMs: 1000 }),
    );
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(false);
  });

  it('flips to true once timeout elapses with authReady still false', () => {
    const { result } = renderHook(() =>
      useAuthTimeout({ authReady: false, timeoutMs: 1000 }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });

  it('stays false when authReady flips true before timeout', () => {
    const { result, rerender } = renderHook(
      ({ authReady }) => useAuthTimeout({ authReady, timeoutMs: 1000 }),
      { initialProps: { authReady: false } },
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ authReady: true });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it('uses default 10s timeout when timeoutMs omitted', () => {
    const { result } = renderHook(() => useAuthTimeout({ authReady: false }));

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('resets to false when authReady becomes true after timing out', () => {
    const { result, rerender } = renderHook(
      ({ authReady }) => useAuthTimeout({ authReady, timeoutMs: 1000 }),
      { initialProps: { authReady: false } },
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);

    rerender({ authReady: true });
    expect(result.current).toBe(false);
  });
});
