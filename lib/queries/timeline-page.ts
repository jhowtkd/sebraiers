import 'server-only';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { getTimeline, getPostsEngagementBatch } from '@/lib/queries/posts';
import { getMyPoints, getMyWeeklyPoints } from '@/lib/queries/me';
import { getRanking } from '@/lib/queries/ranking';
import type { PostEngagement } from '@/lib/queries/posts';
import type { RankingRow } from '@/lib/ranking';
import type { Network, Post } from '@/lib/types';

export type TimelinePageData = {
  userId: string;
  posts: Post[];
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  totalPoints: number;
  weeklyPoints: number;
  ranking: { top: RankingRow[]; myPosition: number; me: RankingRow | null };
  engagementMap: Map<string, PostEngagement>;
};

export async function getTimelinePageData(opts: {
  network?: Network | 'all';
  search?: string;
}): Promise<TimelinePageData> {
  const user = await requireUser();
  const [posts, profile, totalPoints, weeklyPoints, ranking] = await Promise.all([
    getTimeline(opts),
    getCurrentProfile(),
    getMyPoints(user.id),
    getMyWeeklyPoints(user.id),
    getRanking(50),
  ]);
  const engagementMap = await getPostsEngagementBatch(
    posts.map((p) => p.id),
    user.id
  );
  return {
    userId: user.id,
    posts,
    profile: profile
      ? { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url }
      : null,
    totalPoints,
    weeklyPoints,
    ranking,
    engagementMap,
  };
}
