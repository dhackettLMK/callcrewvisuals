"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { formatDuration } from "@/lib/dates";
import { PLATFORM_BY_ID } from "@/lib/platforms";
import type { Platform, Video } from "@/lib/types";
import type { DragData } from "./dnd";

export function Thumbnail({
  video,
  className = "",
}: {
  video: Video;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`relative overflow-hidden rounded bg-zinc-200 ${className}`}
    >
      {video.thumbnail_url && !broken ? (
        // Plain <img>: Drive thumbnails are served by Google, not optimised here.
        <img
          src={video.thumbnail_url}
          alt=""
          draggable={false}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <FilmIcon className="absolute inset-0 m-auto h-6 w-6 text-zinc-400" />
      )}
      {video.duration_seconds != null && (
        <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[10px] font-medium text-white tabular-nums">
          {formatDuration(video.duration_seconds)}
        </span>
      )}
    </div>
  );
}

export function FilmIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4" />
    </svg>
  );
}

export function VideoItem({
  video,
  scheduledOn,
}: {
  video: Video;
  /** Platforms of every live placeholder using this video (may repeat). */
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
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <p className="line-clamp-2 text-[13px] leading-snug font-medium text-zinc-800">
          {video.name}
        </p>
        {video.folder_path && (
          <p
            className="truncate text-[11px] text-zinc-400"
            title={video.folder_path}
          >
            {video.folder_path}
          </p>
        )}
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
