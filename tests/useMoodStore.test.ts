import { describe, it, expect } from 'vitest';
import { buildMoodPayload, buildMoodUpdatePayload } from '../src/useMoodStore';

describe('buildMoodPayload', () => {
  it('returns valid Firestore payload with userId, bucket, words, createdAt ISO', () => {
    const p = buildMoodPayload('u1', 'fear', ['焦虑', '多疑']);
    expect(p.userId).toBe('u1');
    expect(p.bucket).toBe('fear');
    expect(p.words).toEqual(['焦虑', '多疑']);
    expect(typeof p.createdAt).toBe('string');
    expect(p.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('allows empty words array (只记桶)', () => {
    const p = buildMoodPayload('u1', 'peace', []);
    expect(p.words).toEqual([]);
  });
});

describe('buildMoodUpdatePayload', () => {
  it('includes updatedAt ISO and only provided fields', () => {
    const u = buildMoodUpdatePayload({ words: ['平衡'] });
    expect(u.words).toEqual(['平衡']);
    expect(typeof u.updatedAt).toBe('string');
    expect('bucket' in u).toBe(false);
  });

  it('can update bucket alone', () => {
    const u = buildMoodUpdatePayload({ bucket: 'accept' });
    expect(u.bucket).toBe('accept');
    expect('words' in u).toBe(false);
  });
});
