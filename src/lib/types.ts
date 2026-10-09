export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube_shorts"
  | "linkedin"
  | "x"
  | "facebook";

export type PostStatus = "idea" | "ready" | "scheduled" | "posted";

/** A video in the Google Drive folder. Only metadata is stored. */
export type Video = {
  id: string;
  drive_file_id: string;
  name: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  web_view_link: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  /** Subfolder path inside the synced folder, e.g. "Edited Shorts". */
  folder_path: string;
  /** Set when the file was no longer found in the folder on the last sync. */
  missing_since: string | null;
  last_synced_at: string;
};

/** A calendar placeholder. */
export type Post = {
  id: string;
  title: string;
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
  deleted_at: string | null;
};

/** Links a placeholder to its video. One active attachment per placeholder. */
export type Attachment = {
  id: string;
  post_id: string;
  video_id: string;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
};
