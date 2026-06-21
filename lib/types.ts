export type Network = 'instagram' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube' | 'threads';

export type CheckinAction = 'like' | 'comment' | 'share';

export type CheckinStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface UserSocials {
  user_id: string;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  threads: string | null;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  description: string | null;
  network: Network;
  original_url: string;
  cover_url: string | null;
  published_at: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  post_id: string;
  action: CheckinAction;
  status: CheckinStatus;
  points: number;
  declared_at: string;
  decided_at: string | null;
  decided_by: string | null;
  admin_note: string | null;
}

export interface UserPoint {
  user_id: string;
  total_points: number;
  approved_checkins: number;
  last_approved_at: string | null;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export const NETWORK_LABELS: Record<Network, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  threads: 'Threads',
};

export const ACTION_POINTS: Record<CheckinAction, number> = {
  like: 1,
  comment: 2,
  share: 3,
};

export const ACTION_LABELS: Record<CheckinAction, string> = {
  like: 'Curti',
  comment: 'Comentei',
  share: 'Compartilhei',
};