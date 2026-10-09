import type { Platform, PostStatus } from "./types";

/** Row order in the week view. Colours are used for rows, chips and cards. */
export const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "tiktok", label: "TikTok", color: "#00A8A0" },
  { id: "youtube_shorts", label: "YouTube Shorts", color: "#E62117" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "x", label: "X", color: "#18181B" },
  { id: "facebook", label: "Facebook", color: "#6E56CF" },
];

export const PLATFORM_BY_ID = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
) as Record<Platform, (typeof PLATFORMS)[number]>;

export const STATUSES: { id: PostStatus; label: string; color: string }[] = [
  { id: "idea", label: "Idea", color: "#A1A1AA" },
  { id: "ready", label: "Ready", color: "#F59E0B" },
  { id: "scheduled", label: "Scheduled", color: "#3B82F6" },
  { id: "posted", label: "Posted", color: "#10B981" },
];

export const STATUS_BY_ID = Object.fromEntries(
  STATUSES.map((s) => [s.id, s]),
) as Record<PostStatus, (typeof STATUSES)[number]>;
