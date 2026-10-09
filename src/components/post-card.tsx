"use client";

import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { formatTime } from "@/lib/dates";
import { PLATFORM_BY_ID, STATUS_BY_ID } from "@/lib/platforms";
import type { Post, Video } from "@/lib/types";
import type { DragData, DropData } from "./dnd";
import { useFileDrop } from "./file-drop";
import { FilmIcon, Thumbnail } from "./video-item";

export function PostCard({
  post,
  video,
  onOpen,
  onAttach,
  onFiles,
}: {
  post: Post;
  video: Video | undefined;
  onOpen: () => void;
  onAttach: () => void;
  onFiles: (files: File[]) => void;
}) {
  const drag: DragData = { type: "post", postId: post.id };
  const draggable = useDraggable({ id: `post:${post.id}`, data: drag });

  const drop: DropData = {
    kind: "card",
    postId: post.id,
    date: post.publish_date,
    platform: post.platform,
  };
  const droppable = useDroppable({ id: `card:${post.id}`, data: drop });
  const { active } = useDndContext();
  const videoOver =
    droppable.isOver &&
    (active?.data.current as DragData | undefined)?.type === "video";

  const { fileOver, fileDropProps } = useFileDrop(onFiles);
  const highlight = videoOver || fileOver;

  return (
    <div
      ref={(el) => {
        draggable.setNodeRef(el);
        droppable.setNodeRef(el);
      }}
      {...draggable.listeners}
      {...draggable.attributes}
      {...fileDropProps}
      onClick={onOpen}
      className={`relative cursor-grab rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        draggable.isDragging ? "opacity-40" : ""
      }`}
    >
      <PostCardView
        post={post}
        video={video}
        onAttach={onAttach}
        highlight={highlight}
      />
      {highlight && (
        <span className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-fit rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {video ? "Replace video" : "Attach video"}
        </span>
      )}
    </div>
  );
}

export function PostCardView({
  post,
  video,
  lifted = false,
  highlight = false,
  onAttach,
}: {
  post: Post;
  video: Video | undefined;
  lifted?: boolean;
  highlight?: boolean;
  onAttach?: () => void;
}) {
  const platform = PLATFORM_BY_ID[post.platform];
  const status = STATUS_BY_ID[post.status];
  const time = formatTime(post.publish_time);
  const title = post.title || video?.name || "Untitled";

  return (
    <div
      className={`overflow-hidden rounded-md border-l-[3px] bg-white p-1.5 ring-1 ${
        highlight
          ? "ring-2 ring-blue-500"
          : lifted
            ? "shadow-xl ring-zinc-200"
            : "shadow-xs ring-zinc-200 hover:ring-zinc-300"
      }`}
      style={{ borderLeftColor: platform.color }}
    >
      {video ? (
        <div className="relative">
          <Thumbnail video={video} className="aspect-video w-full" />
          {video.missing_since && (
            <span
              className="absolute top-1 left-1 rounded bg-amber-500 px-1 text-[10px] font-medium text-white"
              title="This file is no longer in the Drive folder"
            >
              Not in Drive
            </span>
          )}
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
          <FilmIcon className="h-5 w-5" />
          {onAttach && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAttach();
              }}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200"
            >
              + Attach video
            </button>
          )}
        </div>
      )}
      <div className="mt-1.5 flex items-start gap-1.5 px-0.5">
        <span
          className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
          style={{ background: status.color }}
          title={status.label}
          aria-label={`Status: ${status.label}`}
        />
        <p
          className={`line-clamp-2 min-w-0 flex-1 text-xs leading-snug font-medium ${
            post.title || video ? "text-zinc-800" : "text-zinc-400"
          }`}
        >
          {title}
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
