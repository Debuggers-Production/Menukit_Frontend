export interface Contest {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  reward_type: 'instant_cashback' | 'free_food' | 'discount' | 'offer';
  reward_value: string | null;
  contest_type: 'drawing' | 'kavithai';
  applies_to: 'all' | 'items';
  target_ids: string[] | null;
  status: 'active' | 'completed' | 'cancelled' | 'ended';
  ranking_criterion?: 'likes' | 'comments' | 'shares' | 'all';
  min_participants?: number;
  min_likes?: number;
  min_comments?: number;
  min_shares?: number;
  cancel_reason?: string | null;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContestParticipation {
  id: string;
  contest_id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  content_type: 'drawing' | 'kavithai';
  text_content: string | null;
  media_url: string | null;
  likes_count: number;
  comments_count?: number;
  shares_count?: number;
  time_remaining_seconds: number;
  is_timer_running: boolean;
  timer_last_updated_at: string | null;
  is_submitted: boolean;
  created_at: string;
  is_winner?: boolean;
  shop_name?: string;
  contest_status?: 'active' | 'completed' | 'cancelled' | 'ended';
  contest_title?: string;
}

export interface ContestCredit {
  customer_id: string;
  credits: number;
}

export interface ContestComment {
  id: string;
  participation_id: string;
  customer_id: string;
  customer_name?: string | null;
  text: string;
  likes_count?: number;
  is_liked?: boolean;
  created_at: string;
}
