import { useEffect, useState } from 'react';

// 国内移动网络 / 无 IndexedDB 缓存 / SW 刚更新冷启动 等场景下，Firestore 首次
// onSnapshot 回声偶尔慢于预期但仍能通。把判定窗口拉到 15s 让正常慢链路通过，
// 仍超时再报 banner — 网络真挂掉时 15s 也足以判定。
const FIRESTORE_TIMEOUT_MS = 15000;

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
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [firestoreReachable, setFirestoreReachable] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
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
