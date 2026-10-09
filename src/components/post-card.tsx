"use client";

import { useDraggable } from "@dnd-kit/core";
import { formatTime } from "@/lib/dates";
import { PLATFORM_BY_ID, STATUS_BY_ID } from "@/lib/platforms";
import type { Post, Video } from "@/lib/types";
import type { DragData } from "./planner";
import { Thumbnail } from "./video-item";

export function PostCard({ post, video }: { post: Post; video: Video }) {
  const data: DragData = { type: "post", postId: post.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `post:${post.id}`,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <PostCardView post={post} video={video} />
    </div>
  );
}

export function PostCardView({
  post,
  video,
  lifted = false,
}: {
  post: Post;
  video: Video;
  lifted?: boolean;
}) {
  const platform = PLATFORM_BY_ID[post.platform];
  const status = STATUS_BY_ID[post.status];
  const time = formatTime(post.publish_time);

  return (
    <div
      className={`overflow-hidden rounded-md border-l-[3px] bg-white p-1.5 ring-1 ring-zinc-200 ${
        lifted ? "shadow-xl" : "shadow-xs hover:ring-zinc-300"
      }`}
      style={{ borderLeftColor: platform.color }}
    >
      <Thumbnail video={video} className="aspect-video w-full" />
      <div className="mt-1.5 flex items-start gap-1.5 px-0.5">
        <span
          className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
          style={{ background: status.color }}
          title={status.label}
          aria-label={`Status: ${status.label}`}
        />
        <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug font-medium text-zinc-800">
          {video.name}
        </p>
        {time && (
          <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
