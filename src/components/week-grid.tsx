"use client";

import { useDroppable } from "@dnd-kit/core";
import { toISODate } from "@/lib/dates";
import { PLATFORMS } from "@/lib/platforms";
import type { Platform, Post, Video } from "@/lib/types";
import type { SlotData } from "./planner";
import { PostCard } from "./post-card";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function WeekGrid({
  days,
  today,
  posts,
  videosById,
}: {
  days: Date[];
  today: string;
  posts: Post[];
  videosById: Map<string, Video>;
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
              <span className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-zinc-500"}`}>
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
          <PlatformRow
            key={platform.id}
            platform={platform}
            dates={dates}
            today={today}
            bySlot={bySlot}
            videosById={videosById}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformRow({
  platform,
  dates,
  today,
  bySlot,
  videosById,
}: {
  platform: (typeof PLATFORMS)[number];
  dates: string[];
  today: string;
  bySlot: Map<string, Post[]>;
  videosById: Map<string, Video>;
}) {
  return (
    <>
      <div
        className="sticky left-0 z-10 flex items-start gap-2 border-b border-zinc-200 bg-white px-3 py-2.5"
        style={{ boxShadow: `inset 3px 0 0 ${platform.color}` }}
      >
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: platform.color }}
        />
        <span className="text-[13px] font-medium text-zinc-700">{platform.label}</span>
      </div>
      {dates.map((date) => (
        <Slot
          key={date}
          date={date}
          platform={platform.id}
          color={platform.color}
          isToday={date === today}
          posts={bySlot.get(`${date}|${platform.id}`) ?? []}
          videosById={videosById}
        />
      ))}
    </>
  );
}

function Slot({
  date,
  platform,
  color,
  isToday,
  posts,
  videosById,
}: {
  date: string;
  platform: Platform;
  color: string;
  isToday: boolean;
  posts: Post[];
  videosById: Map<string, Video>;
}) {
  const data: SlotData = { date, platform };
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${date}:${platform}`,
    data,
  });
  const empty = posts.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-32 border-b border-l border-zinc-200 p-1.5 transition-colors ${
        isToday ? "bg-blue-50/50" : "bg-white"
      } ${empty ? "slot-empty" : ""
      }`}
      style={
        isOver
          ? { backgroundColor: `${color}14`, boxShadow: `inset 0 0 0 2px ${color}` }
          : undefined
      }
    >
      {empty ? (
        <div className="flex h-full min-h-28 items-center justify-center text-[11px] text-zinc-300">
          {isOver ? "" : "Empty"}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {posts.map((p) => {
            const video = videosById.get(p.video_id);
            return video ? <PostCard key={p.id} post={p} video={video} /> : null;
          })}
        </div>
      )}
    </div>
  );
}
