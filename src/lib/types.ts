export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube_shorts"
  | "linkedin"
  | "x"
  | "facebook";

export type PostStatus = "idea" | "ready" | "scheduled" | "posted";

export type Video = {
  id: string;
  drive_file_id: string;
  name: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  web_view_link: string | null;
  last_synced_at: string;
};

export type Post = {
  id: string;
  video_id: string;
  platform: Platform;
  /** YYYY-MM-DD */
  publish_date: string;
  /** HH:MM:SS, or null when no time is set yet */
  publish_time: string | null;
  status: PostStatus;
  caption: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
