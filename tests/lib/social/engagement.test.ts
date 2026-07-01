import { describe, it, expect } from 'vitest';
import { buildEngagementBatch, countReactions } from '@/lib/social/engagement';

describe('countReactions', () => {
  it('aggregates reaction counts', () => {
    expect(
      countReactions([
        { reaction: 'fire' },
        { reaction: 'fire' },
        { reaction: 'clap' },
      ])
    ).toEqual({ fire: 2, clap: 1 });
  });
});

describe('buildEngagementBatch', () => {
  it('builds per-id engagement maps', () => {
    const result = buildEngagementBatch(
      ['a', 'b'],
      [
        { id: 'a', reaction: 'fire' },
        { id: 'b', reaction: 'clap' },
        { id: 'b', reaction: 'clap' },
      ],
      [{ id: 'a', reaction: 'fire' }],
      [{ id: 'a' }, { id: 'a' }, { id: 'b' }]
    );
    expect(result.get('a')).toEqual({
      reactions: { fire: 1 },
      myReactions: ['fire'],
      commentCount: 2,
    });
    expect(result.get('b')).toEqual({
      reactions: { clap: 2 },
      myReactions: [],
      commentCount: 1,
    });
  });

  it('returns empty engagement for ids with no data', () => {
    const result = buildEngagementBatch(['x'], [], [], []);
    expect(result.get('x')).toEqual({
      reactions: {},
      myReactions: [],
      commentCount: 0,
    });
  });
});
