import { useEffect, useState } from 'react';

const FIRESTORE_TIMEOUT_MS = 6000;

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
