"use client";

import { useDraggable } from "@dnd-kit/core";
import { formatDuration } from "@/lib/dates";
import { PLATFORM_BY_ID } from "@/lib/platforms";
import type { Platform, Video } from "@/lib/types";
import type { DragData } from "./planner";

export function Thumbnail({
  video,
  className = "",
}: {
  video: Video;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded bg-zinc-200 ${className}`}>
      {video.thumbnail_url && (
        // Plain <img>: thumbnails come from Drive/other hosts and are small.
        <img
          src={video.thumbnail_url}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {video.duration_seconds != null && (
        <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[10px] font-medium tabular-nums text-white">
          {formatDuration(video.duration_seconds)}
        </span>
      )}
    </div>
  );
}

export function VideoItem({
  video,
  scheduledOn,
}: {
  video: Video;
  /** Platforms of every post using this video (may repeat). */
  scheduledOn: Platform[];
}) {
  const data: DragData = { type: "video", videoId: video.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `video:${video.id}`,
    data,
  });
  const platforms = [...new Set(scheduledOn)];

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab gap-3 rounded-md p-2 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <Thumbnail video={video} className="aspect-video w-32 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <p className="line-clamp-2 text-[13px] leading-snug font-medium text-zinc-800">
          {video.name}
        </p>
        {scheduledOn.length > 0 ? (
          <span
            className="flex w-fit items-center gap-1 rounded-full bg-zinc-100 py-0.5 pr-2 pl-1.5 text-[11px] text-zinc-600"
            title={platforms.map((p) => PLATFORM_BY_ID[p].label).join(", ")}
          >
            <span className="flex -space-x-0.5">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="h-2 w-2 rounded-full ring-1 ring-zinc-100"
                  style={{ background: PLATFORM_BY_ID[p].color }}
                />
              ))}
            </span>
            Scheduled{scheduledOn.length > 1 ? ` ×${scheduledOn.length}` : ""}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-400">Not scheduled</span>
        )}
      </div>
    </li>
  );
}

export function VideoDragPreview({ video }: { video: Video }) {
  return (
    <div className="rounded-md bg-white p-1.5 shadow-xl ring-1 ring-zinc-200">
      <Thumbnail video={video} className="aspect-video w-full" />
      <p className="mt-1 truncate px-0.5 text-xs font-medium">{video.name}</p>
    </div>
  );
}
