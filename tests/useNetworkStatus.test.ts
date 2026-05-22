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

  it('reports online=false when navigator.onLine is false at mount', () => {
    setOnline(false);
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.online).toBe(false);
  });

  it('flips online when window dispatches offline / online events', () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ ready: false, dataLoaded: false }),
    );
    expect(result.current.online).toBe(true);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
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
    act(() => {
      vi.advanceTimersByTime(7000);
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
