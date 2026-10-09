"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/dates";
import { PLATFORMS, STATUSES } from "@/lib/platforms";
import type { Post, Video } from "@/lib/types";
import type { PostPatch } from "./use-planner-data";
import { FilmIcon, Thumbnail } from "./video-item";

const label = "mb-1 block text-xs font-medium text-zinc-500";
const field =
  "w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400";

export function PostDrawer({
  post,
  video,
  onClose,
  onUpdate,
  onAttach,
  onRemoveVideo,
  onDelete,
}: {
  post: Post;
  video: Video | undefined;
  onClose: () => void;
  onUpdate: (patch: PostPatch, label: string) => void;
  onAttach: () => void;
  onRemoveVideo: () => void;
  onDelete: () => void;
}) {
  const [previewing, setPreviewing] = useState(false);

  // Text fields are uncontrolled and save on blur. Keying them by the saved
  // value re-renders them when an undo changes the value underneath.
  const commitText =
    (key: "title" | "caption" | "notes", what: string) =>
    (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) =>
      onUpdate({ [key]: e.currentTarget.value }, `edit ${what}`);

  return (
    <aside
      aria-label="Placeholder details"
      className="fixed top-0 right-0 bottom-0 z-40 flex w-[400px] flex-col border-l border-zinc-200 bg-white shadow-2xl"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 px-4">
        <h2 className="text-sm font-semibold">Placeholder</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Video */}
        <section>
          {video ? (
            <div className="space-y-2">
              {previewing ? (
                <iframe
                  src={`https://drive.google.com/file/d/${encodeURIComponent(video.drive_file_id)}/preview`}
                  title={video.name}
                  allow="autoplay; fullscreen"
                  className="mx-auto aspect-[9/16] w-full max-w-[260px] rounded-md bg-black"
                />
              ) : (
                <a
                  href={video.web_view_link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  title="Open in Google Drive"
                >
                  <Thumbnail video={video} className="aspect-video w-full" />
                  <span className="absolute inset-0 flex items-center justify-center rounded bg-black/0 transition group-hover:bg-black/30">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-900 opacity-0 shadow group-hover:opacity-100">
                      Open in Drive ↗
                    </span>
                  </span>
                </a>
              )}
              <div>
                <p className="text-sm font-medium break-words">{video.name}</p>
                <p className="text-xs text-zinc-500">
                  {[video.folder_path, formatDuration(video.duration_seconds)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {video.missing_since && (
                  <p className="mt-1 text-xs text-amber-700">
                    This file is no longer in the Drive folder.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <SmallButton onClick={() => setPreviewing((p) => !p)}>
                  {previewing ? "Hide preview" : "Preview"}
                </SmallButton>
                {video.web_view_link && (
                  <a
                    href={video.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Open in Drive ↗
                  </a>
                )}
                <SmallButton onClick={onAttach}>Replace</SmallButton>
                <SmallButton onClick={onRemoveVideo} danger>
                  Remove
                </SmallButton>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
              <FilmIcon className="h-6 w-6" />
              <p className="text-xs">No video attached</p>
              <button
                onClick={onAttach}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Attach video
              </button>
            </div>
          )}
        </section>

        <div>
          <label className={label} htmlFor="post-title">
            Title
          </label>
          <input
            id="post-title"
            key={`title:${post.id}:${post.title}`}
            defaultValue={post.title}
            placeholder={video?.name ?? "Untitled"}
            onBlur={commitText("title", "title")}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="post-date">
              Date
            </label>
            <input
              id="post-date"
              type="date"
              value={post.publish_date}
              onChange={(e) =>
                e.target.value &&
                onUpdate({ publish_date: e.target.value }, "change date")
              }
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="post-time">
              Publish time
            </label>
            <input
              id="post-time"
              type="time"
              value={post.publish_time?.slice(0, 5) ?? ""}
              onChange={(e) =>
                onUpdate(
                  {
                    publish_time: e.target.value
                      ? `${e.target.value}:00`
                      : null,
                  },
                  "change time",
                )
              }
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="post-platform">
            Platform
          </label>
          <select
            id="post-platform"
            value={post.platform}
            onChange={(e) =>
              onUpdate(
                { platform: e.target.value as Post["platform"] },
                "change platform",
              )
            }
            className={field}
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={label}>Status</span>
          <div className="grid grid-cols-4 gap-1 rounded-md bg-zinc-100 p-1">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdate({ status: s.id }, "change status")}
                aria-pressed={post.status === s.id}
                className={`flex items-center justify-center gap-1.5 rounded px-1 py-1 text-xs font-medium ${
                  post.status === s.id
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="post-caption">
            Caption
          </label>
          <textarea
            id="post-caption"
            key={`caption:${post.id}:${post.caption}`}
            defaultValue={post.caption}
            rows={4}
            onBlur={commitText("caption", "caption")}
            className={`${field} resize-y`}
          />
        </div>

        <div>
          <label className={label} htmlFor="post-notes">
            Notes
          </label>
          <textarea
            id="post-notes"
            key={`notes:${post.id}:${post.notes}`}
            defaultValue={post.notes}
            rows={3}
            onBlur={commitText("notes", "notes")}
            className={`${field} resize-y`}
          />
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-zinc-200 px-4 py-3">
        <span className="text-[11px] text-zinc-400">
          Created {new Date(post.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={onDelete}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete placeholder
        </button>
      </footer>
    </aside>
  );
}

function SmallButton({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
