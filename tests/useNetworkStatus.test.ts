// @vitest-environment jsdom
/**
 * 单测 useNetworkStatus —— UI 网络状态指示条的数据源 hook。
 *
 * 三个关键场景：
 * 1. navigator.onLine=false → online=false（设备级断网）
 * 2. authReady+user 但 dataLoaded 超时未到 → firestoreReachable=false
 *    （Firestore 域名被代理墙阻断的场景，典型表现为 onSnapshot 永不 fire）
 * 3. dataLoaded=true → firestoreReachable=true（连通）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../src/lib/useNetworkStatus';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setOnline(true);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports online=true initially when navigator.onLine is true', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.online).toBe(true);
  });

  it('starts optimistically online even if navigator.onLine is false at mount; flips after 1.5s sustained offline', () => {
    setOnline(false);
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    // Optimistic: don't flash banner on cold boot. iOS PWA briefly mis-reports.
    expect(result.current.online).toBe(true);
    // Under 1.5s — still optimistically online.
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.online).toBe(true);
    // Past 1.5s sustained offline — now reflect reality.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.online).toBe(false);
  });

  it('online event during the offline debounce window cancels the flip', () => {
    setOnline(false);
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.online).toBe(true);
    // 0.8s in — offline timer still pending; fire online event.
    act(() => {
      vi.advanceTimersByTime(800);
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    // Past where offline timer would have fired — should still be online.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.online).toBe(true);
  });

  it('flips online via window events with debounced offline', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.online).toBe(true);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    // Debounced — still online immediately after the event.
    expect(result.current.online).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.online).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    // Online events take effect immediately (no debounce on the good direction).
    expect(result.current.online).toBe(true);
  });

  it('firestoreReachable is null before user is ready', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.firestoreReachable).toBeNull();
  });

  it('firestoreReachable=false after timeout if dataLoaded never flips', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: true, dataLoaded: false }),
    );
    expect(result.current.firestoreReachable).toBeNull();
    // Still null at 14s — under the 15s threshold (slow-but-fine networks pass).
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(result.current.firestoreReachable).toBeNull();
    // Past 15s — banner should fire.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.firestoreReachable).toBe(false);
  });

  it('firestoreReachable=true immediately when dataLoaded is true', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: true, dataLoaded: true }),
    );
    expect(result.current.firestoreReachable).toBe(true);
  });

  it('flips firestoreReachable=true if dataLoaded arrives before timeout', () => {
    const { result, rerender } = renderHook(
      ({ dataLoaded }: { dataLoaded: boolean }) =>
        useNetworkStatus({ ready: true, dataLoaded }),
      { initialProps: { dataLoaded: false } },
    );
    expect(result.current.firestoreReachable).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    rerender({ dataLoaded: true });
    expect(result.current.firestoreReachable).toBe(true);
  });
});
