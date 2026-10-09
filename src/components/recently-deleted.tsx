"use client";

import { parseISODate } from "@/lib/dates";
import { PLATFORM_BY_ID } from "@/lib/platforms";
import type { Attachment, Post, Video } from "@/lib/types";
import { Modal } from "./modal";
import { RETENTION_DAYS } from "./use-planner-data";
import { Thumbnail } from "./video-item";

type Item =
  | { kind: "post"; deletedAt: string; post: Post; video?: Video }
  | {
      kind: "attachment";
      deletedAt: string;
      att: Attachment;
      post: Post;
      video?: Video;
    };

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function deletedItems(
  posts: Post[],
  attachments: Attachment[],
  videosById: Map<string, Video>,
): Item[] {
  const postsById = new Map(posts.map((p) => [p.id, p]));
  const items: Item[] = [];
  for (const p of posts) {
    if (!p.deleted_at) continue;
    const att = attachments.find((a) => a.post_id === p.id && !a.deleted_at);
    items.push({
      kind: "post",
      deletedAt: p.deleted_at,
      post: p,
      video: att && videosById.get(att.video_id),
    });
  }
  for (const a of attachments) {
    const post = postsById.get(a.post_id);
    // Removed videos of a deleted placeholder come back with it; list only
    // those whose placeholder is still on the calendar.
    if (!a.deleted_at || !post || post.deleted_at) continue;
    items.push({
      kind: "attachment",
      deletedAt: a.deleted_at,
      att: a,
      post,
      video: videosById.get(a.video_id),
    });
  }
  return items.sort((x, y) => y.deletedAt.localeCompare(x.deletedAt));
}

export function RecentlyDeleted({
  items,
  onClose,
  onRestorePost,
  onRestoreAttachment,
  onPurgePost,
  onPurgeAttachment,
}: {
  items: Item[];
  onClose: () => void;
  onRestorePost: (postId: string) => void;
  onRestoreAttachment: (attId: string) => void;
  onPurgePost: (postId: string) => void;
  onPurgeAttachment: (attId: string) => void;
}) {
  return (
    <Modal title="Recently deleted" onClose={onClose} width="w-[640px]">
      <p className="border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500">
        Deleted placeholders and removed videos are kept for {RETENTION_DAYS}{" "}
        days. Removing a video never touches the file in Google Drive.
      </p>
      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto">
        {items.map((item) => {
          const platform = PLATFORM_BY_ID[item.post.platform];
          const when = `${platform.label} · ${dateFmt.format(parseISODate(item.post.publish_date))}`;
          const postTitle = item.post.title || item.video?.name || "Untitled";
          return (
            <li
              key={
                item.kind === "post" ? `p:${item.post.id}` : `a:${item.att.id}`
              }
              className="flex items-center gap-3 px-4 py-2.5"
            >
              {item.video ? (
                <Thumbnail
                  video={item.video}
                  className="aspect-video w-20 shrink-0"
                />
              ) : (
                <div className="aspect-video w-20 shrink-0 rounded border border-dashed border-zinc-300" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.kind === "post"
                    ? postTitle
                    : (item.video?.name ?? "Video")}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: platform.color }}
                  />
                  {item.kind === "post"
                    ? `Placeholder · ${when}`
                    : `Video removed from “${postTitle}” · ${when}`}
                  {" · "}deleted {ago(item.deletedAt)}
                </p>
              </div>
              <button
                onClick={() =>
                  item.kind === "post"
                    ? onRestorePost(item.post.id)
                    : onRestoreAttachment(item.att.id)
                }
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50"
              >
                Restore
              </button>
              <button
                onClick={() =>
                  item.kind === "post"
                    ? onPurgePost(item.post.id)
                    : onPurgeAttachment(item.att.id)
                }
                className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete forever
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="py-10 text-center text-sm text-zinc-400">
            Nothing here.
          </li>
        )}
      </ul>
    </Modal>
  );
}
