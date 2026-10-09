"use client";

import { useState } from "react";
import type { Video } from "@/lib/types";
import { Modal } from "./modal";
import { Thumbnail } from "./video-item";

/** Click-to-attach alternative to drag and drop. */
export function VideoPicker({
  videos,
  currentVideoId,
  onPick,
  onClose,
}: {
  videos: Video[];
  currentVideoId: string | undefined;
  onPick: (videoId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = videos.filter(
    (v) =>
      !v.missing_since &&
      (!q ||
        v.name.toLowerCase().includes(q) ||
        v.folder_path.toLowerCase().includes(q)),
  );

  return (
    <Modal
      title={currentVideoId ? "Replace video" : "Attach video"}
      onClose={onClose}
    >
      <div className="border-b border-zinc-200 p-3">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos or folders…"
          className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <ul className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-3">
        {list.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => onPick(v.id)}
              disabled={v.id === currentVideoId}
              className="w-full rounded-md p-1.5 text-left hover:bg-zinc-100 disabled:opacity-50"
            >
              <Thumbnail video={v} className="aspect-video w-full" />
              <p className="mt-1 line-clamp-2 text-xs font-medium">{v.name}</p>
              {v.folder_path && (
                <p className="truncate text-[11px] text-zinc-400">
                  {v.folder_path}
                </p>
              )}
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="col-span-3 py-8 text-center text-sm text-zinc-400">
            {videos.length === 0
              ? "The library is empty. Press Refresh in the sidebar."
              : "No matching videos."}
          </li>
        )}
      </ul>
    </Modal>
  );
}
