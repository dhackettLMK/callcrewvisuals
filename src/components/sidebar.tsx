"use client";

import { useMemo, useState } from "react";
import type { Platform, Post, Video } from "@/lib/types";
import { VideoItem } from "./video-item";

export function Sidebar({ videos, posts }: { videos: Video[]; posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [unscheduledOnly, setUnscheduledOnly] = useState(false);

  const platformsByVideo = useMemo(() => {
    const m = new Map<string, Platform[]>();
    for (const p of posts) {
      const list = m.get(p.video_id) ?? [];
      list.push(p.platform);
      m.set(p.video_id, list);
    }
    return m;
  }, [posts]);

  const q = query.trim().toLowerCase();
  const visible = videos.filter(
    (v) =>
      (!q || v.name.toLowerCase().includes(q)) &&
      (!unscheduledOnly || !platformsByVideo.has(v.id)),
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-4">
        <img src="/callcrew-mark.webp" alt="" width={28} height={28} />
        <span className="text-sm font-bold tracking-wide text-[#243B53]">
          CALLCREW
        </span>
        <span className="text-sm text-zinc-400">Content calendar</span>
      </div>

      <div className="space-y-2 border-b border-zinc-200 p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Drive library
          </h2>
          <span className="text-xs text-zinc-400 tabular-nums">
            {visible.length}/{videos.length}
          </span>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos…"
          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 select-none">
          <input
            type="checkbox"
            checked={unscheduledOnly}
            onChange={(e) => setUnscheduledOnly(e.target.checked)}
            className="accent-zinc-900"
          />
          Unscheduled only
        </label>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visible.map((v) => (
          <VideoItem
            key={v.id}
            video={v}
            scheduledOn={platformsByVideo.get(v.id) ?? []}
          />
        ))}
        {visible.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-zinc-400">
            {videos.length === 0 ? "No videos yet." : "No matching videos."}
          </li>
        )}
      </ul>
    </aside>
  );
}
