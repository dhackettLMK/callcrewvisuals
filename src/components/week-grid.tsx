"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { toISODate } from "@/lib/dates";
import { PLATFORMS } from "@/lib/platforms";
import type { Platform, Post, Video } from "@/lib/types";
import type { DragData, DropData } from "./dnd";
import { useFileDrop } from "./file-drop";
import { PostCard } from "./post-card";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export type GridHandlers = {
  onOpen: (postId: string) => void;
  onAttach: (postId: string) => void;
  onAdd: (slot: { date: string; platform: Platform }) => void;
  onFiles: (files: File[], target: DropData) => void;
};

export function WeekGrid({
  days,
  today,
  posts,
  videoByPost,
  handlers,
}: {
  days: Date[];
  today: string;
  /** Live (not deleted) placeholders. */
  posts: Post[];
  videoByPost: Map<string, Video>;
  handlers: GridHandlers;
}) {
  const dates = days.map(toISODate);

  // Bucket posts by "date|platform" for the visible week.
  const bySlot = new Map<string, Post[]>();
  const visible = new Set(dates);
  for (const p of posts) {
    if (!visible.has(p.publish_date)) continue;
    const key = `${p.publish_date}|${p.platform}`;
    const list = bySlot.get(key) ?? [];
    list.push(p);
    bySlot.set(key, list);
  }
  for (const list of bySlot.values()) {
    list.sort(
      (a, b) =>
        (a.publish_time ?? "99").localeCompare(b.publish_time ?? "99") ||
        a.created_at.localeCompare(b.created_at),
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="grid min-w-[1100px]"
        style={{ gridTemplateColumns: "128px repeat(7, minmax(140px, 1fr))" }}
      >
        {/* Header row */}
        <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white" />
        {days.map((d, i) => {
          const isToday = dates[i] === today;
          return (
            <div
              key={dates[i]}
              className="sticky top-0 z-20 flex items-baseline gap-1.5 border-b border-l border-zinc-200 bg-white px-2.5 py-2"
            >
              <span
                className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-zinc-500"}`}
              >
                {dayFmt.format(d)}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  isToday
                    ? "flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1 text-white"
                    : "text-zinc-800"
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}

        {/* One row per platform */}
        {PLATFORMS.map((platform) => (
          <div key={platform.id} className="contents">
            <div
              className="sticky left-0 z-10 flex items-start gap-2 border-b border-zinc-200 bg-white px-3 py-2.5"
              style={{ boxShadow: `inset 3px 0 0 ${platform.color}` }}
            >
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: platform.color }}
              />
              <span className="text-[13px] font-medium text-zinc-700">
                {platform.label}
              </span>
            </div>
            {dates.map((date) => (
              <SlotCell
                key={date}
                date={date}
                platform={platform.id}
                color={platform.color}
                isToday={date === today}
                posts={bySlot.get(`${date}|${platform.id}`) ?? []}
                videoByPost={videoByPost}
                handlers={handlers}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCell({
  date,
  platform,
  color,
  isToday,
  posts,
  videoByPost,
  handlers,
}: {
  date: string;
  platform: Platform;
  color: string;
  isToday: boolean;
  posts: Post[];
  videoByPost: Map<string, Video>;
  handlers: GridHandlers;
}) {
  const data: DropData = { kind: "slot", date, platform };
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${date}:${platform}`,
    data,
  });
  const { active } = useDndContext();
  const dragging = active?.data.current as DragData | undefined;
  const { fileOver, fileDropProps } = useFileDrop((files) =>
    handlers.onFiles(files, data),
  );
  const over = isOver || fileOver;
  const empty = posts.length === 0;

  return (
    <div
      ref={setNodeRef}
      {...fileDropProps}
      className={`group relative min-h-32 border-b border-l border-zinc-200 p-1.5 transition-colors ${
        isToday ? "bg-blue-50/50" : "bg-white"
      } ${empty ? "slot-empty" : ""}`}
      style={
        over
          ? {
              backgroundColor: `${color}14`,
              boxShadow: `inset 0 0 0 2px ${color}`,
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-1.5">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            video={videoByPost.get(p.id)}
            onOpen={() => handlers.onOpen(p.id)}
            onAttach={() => handlers.onAttach(p.id)}
            onFiles={(files) =>
              handlers.onFiles(files, {
                kind: "card",
                postId: p.id,
                date: p.publish_date,
                platform: p.platform,
              })
            }
          />
        ))}
      </div>

      {empty ? (
        <button
          onClick={() => handlers.onAdd({ date, platform })}
          className="flex h-full min-h-28 w-full items-center justify-center rounded text-[11px] text-zinc-300 outline-none hover:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Add placeholder"
        >
          {over ? (
            dragging?.type === "post" ? (
              "Move here"
            ) : (
              "Drop to add"
            )
          ) : (
            <>
              <span className="group-hover:hidden">Empty</span>
              <span className="hidden group-hover:inline">+ Add</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => handlers.onAdd({ date, platform })}
          className="mt-1.5 hidden w-full rounded py-0.5 text-[11px] text-zinc-400 group-hover:block hover:bg-zinc-100 hover:text-zinc-600"
        >
          + Add
        </button>
      )}
    </div>
  );
}
