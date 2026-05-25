import { useEffect, useRef, useState } from 'react';

// 国内移动网络 / 无 IndexedDB 缓存 / SW 刚更新冷启动 等场景下，Firestore 首次
// onSnapshot 回声偶尔慢于预期但仍能通。把判定窗口拉到 15s 让正常慢链路通过，
// 仍超时再报 banner — 网络真挂掉时 15s 也足以判定。
const FIRESTORE_TIMEOUT_MS = 15000;

// iOS PWA / 部分浏览器冷启动时 `navigator.onLine` 短暂报 false 然后立即翻 true。
// 持续 1.5s 仍 offline 才报 banner — 真离线时 1.5s 体感很小；瞬态毛刺被吞掉。
const ONLINE_DEBOUNCE_MS = 1500;

export interface NetworkStatus {
  online: boolean;
  firestoreReachable: boolean | null;
}

interface UseNetworkStatusInput {
  ready: boolean;
  dataLoaded: boolean;
}

export function useNetworkStatus({
  ready,
  dataLoaded,
}: UseNetworkStatusInput): NetworkStatus {
  // Optimistically start online — even if navigator.onLine briefly reports
  // false on cold boot, we wait for a sustained offline signal before showing
  // the banner. Real offline state is reflected after ONLINE_DEBOUNCE_MS.
  const [online, setOnline] = useState<boolean>(true);
  const [firestoreReachable, setFirestoreReachable] = useState<boolean | null>(
    null,
  );
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimerRef.current !== null) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };

    const goOnlineImmediately = () => {
      clearOfflineTimer();
      setOnline(true);
    };

    const scheduleOffline = () => {
      clearOfflineTimer();
      offlineTimerRef.current = setTimeout(() => {
        setOnline(false);
        offlineTimerRef.current = null;
      }, ONLINE_DEBOUNCE_MS);
    };

    // Sync initial state — if browser reports offline at mount, start the
    // debounce timer rather than flipping immediately.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      scheduleOffline();
    }

    window.addEventListener('online', goOnlineImmediately);
    window.addEventListener('offline', scheduleOffline);
    return () => {
      clearOfflineTimer();
      window.removeEventListener('online', goOnlineImmediately);
      window.removeEventListener('offline', scheduleOffline);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      setFirestoreReachable(null);
      return;
    }
    if (dataLoaded) {
      setFirestoreReachable(true);
      return;
    }
    const t = setTimeout(() => setFirestoreReachable(false), FIRESTORE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [ready, dataLoaded]);

  return { online, firestoreReachable };
}
