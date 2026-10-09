"use client";

import { useState } from "react";
import type { Platform, Video } from "@/lib/types";
import { VideoItem } from "./video-item";

export function Sidebar({
  videos,
  scheduledByVideo,
  syncing,
  onRefresh,
}: {
  videos: Video[];
  scheduledByVideo: Map<string, Platform[]>;
  syncing: boolean;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [unscheduledOnly, setUnscheduledOnly] = useState(false);

  const library = videos.filter((v) => !v.missing_since);
  const q = query.trim().toLowerCase();
  const visible = library.filter(
    (v) =>
      (!q ||
        v.name.toLowerCase().includes(q) ||
        v.folder_path.toLowerCase().includes(q)) &&
      (!unscheduledOnly || !scheduledByVideo.has(v.id)),
  );

  const lastSynced = library.reduce<string | null>(
    (max, v) => (max && max > v.last_synced_at ? max : v.last_synced_at),
    null,
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
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Drive library
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 tabular-nums">
              {visible.length}/{library.length}
            </span>
            <button
              onClick={onRefresh}
              disabled={syncing}
              title={
                lastSynced
                  ? `Last refreshed ${new Date(lastSynced).toLocaleString()}`
                  : "Load videos from the Drive folder"
              }
              className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
              </svg>
              {syncing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos or folders…"
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
            scheduledOn={scheduledByVideo.get(v.id) ?? []}
          />
        ))}
        {visible.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-zinc-400">
            {library.length === 0
              ? syncing
                ? "Loading videos from Drive…"
                : "No videos yet. Press Refresh to load the Drive folder."
              : "No matching videos."}
          </li>
        )}
      </ul>
    </aside>
  );
}
