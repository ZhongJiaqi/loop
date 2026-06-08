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
import { withTimeout } from './lib/timeout';
import type { MoodBucketId, MoodEntry } from './types';

const WRITE_TIMEOUT_MS = 10000;

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

  const addMood = async (bucket: MoodBucketId, words: string[]) => {
    if (!userId) return;
    const ref = collection(db, `users/${userId}/moods`);
    await withTimeout(
      addDoc(ref, buildMoodPayload(userId, bucket, words)),
      WRITE_TIMEOUT_MS,
      'addMood',
    );
  };

  const updateMood = async (
    id: string,
    patch: Partial<Pick<MoodEntry, 'bucket' | 'words'>>,
  ) => {
    if (!userId) return;
    const ref = doc(db, `users/${userId}/moods/${id}`);
    await withTimeout(
      updateDoc(ref, buildMoodUpdatePayload(patch)),
      WRITE_TIMEOUT_MS,
      'updateMood',
    );
  };

  const deleteMood = async (id: string) => {
    if (!userId) return;
    const ref = doc(db, `users/${userId}/moods/${id}`);
    await withTimeout(deleteDoc(ref), WRITE_TIMEOUT_MS, 'deleteMood');
  };

  return { entries, loaded, addMood, updateMood, deleteMood };
}
