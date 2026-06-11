import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MoodBucketId, MoodEntry } from './types';

// === Pure helpers (单测覆盖) ===

export function buildMoodPayload(
  userId: string,
  bucket: MoodBucketId,
  words: string[],
): Omit<MoodEntry, 'id'> {
  return {
    userId,
    bucket,
    words,
    createdAt: new Date().toISOString(),
  };
}

export function buildMoodUpdatePayload(
  patch: Partial<Pick<MoodEntry, 'bucket' | 'words'>>,
): Partial<MoodEntry> & { updatedAt: string } {
  return { ...patch, updatedAt: new Date().toISOString() };
}

// === Hook ===

export interface MoodStore {
  entries: MoodEntry[];
  loaded: boolean;
  addMood: (bucket: MoodBucketId, words: string[]) => Promise<void>;
  updateMood: (
    id: string,
    patch: Partial<Pick<MoodEntry, 'bucket' | 'words'>>,
  ) => Promise<void>;
  deleteMood: (id: string) => Promise<void>;
}

export function useMoodStore(userId: string | null): MoodStore {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setLoaded(false);
      return;
    }
    const q = query(
      collection(db, `users/${userId}/moods`),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: MoodEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MoodEntry, 'id'>),
      }));
      setEntries(list);
      setLoaded(true);
    });
    return unsub;
  }, [userId]);

  // 三个 mutation 全部 fire-and-forget，不再 withTimeout 等服务器 ack。
  //
  // 之前 `await withTimeout(addDoc, 10s)` 会在国内 Firestore ack 慢时（5-30s
  // 常态）误报"addMood超时"。但写入其实已经成功：Firestore SDK 跟
  // persistentLocalCache 协作 — addDoc 立即写本地 IndexedDB，onSnapshot 带
  // `hasPendingWrites=true` 立刻 emit 新 entry，UI 通过 useEffect 监听器
  // 即时显示。后台异步 sync 到云端，失败时 SDK 自动重试。
  //
  // 真正 fatal 失败（rules 拒绝等）：本地 cache 会被回滚，UI 上 entry 短暂
  // 闪现后消失。console.error 兜底诊断。
  //
  // 函数签名保留 Promise<void> + async 关键字以兼容 MoodView.handleDone 的
  // await 调用（await 一个立即 resolved 的 promise）。
  const addMood = async (bucket: MoodBucketId, words: string[]) => {
    if (!userId) return;
    const ref = collection(db, `users/${userId}/moods`);
    addDoc(ref, buildMoodPayload(userId, bucket, words)).catch((e) => {
      console.error('[mood] addDoc background failure:', e);
    });
  };

  const updateMood = async (
    id: string,
    patch: Partial<Pick<MoodEntry, 'bucket' | 'words'>>,
  ) => {
    if (!userId) return;
    const ref = doc(db, `users/${userId}/moods/${id}`);
    updateDoc(ref, buildMoodUpdatePayload(patch)).catch((e) => {
      console.error('[mood] updateDoc background failure:', e);
    });
  };

  const deleteMood = async (id: string) => {
    if (!userId) return;
    const ref = doc(db, `users/${userId}/moods/${id}`);
    deleteDoc(ref).catch((e) => {
      console.error('[mood] deleteDoc background failure:', e);
    });
  };

  return { entries, loaded, addMood, updateMood, deleteMood };
}
