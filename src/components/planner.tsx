"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { addDays, formatWeekRange, toISODate, weekDays } from "@/lib/dates";
import type { Attachment, Platform, Post, Video } from "@/lib/types";
import { useConfirm } from "./confirm-dialog";
import type { DragData, DropData } from "./dnd";
import { PostCardView } from "./post-card";
import { PostDrawer } from "./post-drawer";
import { RecentlyDeleted, deletedItems } from "./recently-deleted";
import { Sidebar } from "./sidebar";
import { ToastView } from "./toast";
import { usePlannerData } from "./use-planner-data";
import { VideoDragPreview } from "./video-item";
import { VideoPicker } from "./video-picker";
import { WeekGrid, type GridHandlers } from "./week-grid";

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi|mkv|mpe?g|3gp|wmv)$/i;

// Videos dropped on a card attach to it; posts being moved target slots.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const kindOf = (id: string | number) =>
    (
      args.droppableContainers.find((c) => c.id === id)?.data.current as
        | DropData
        | undefined
    )?.kind;
  const draggingVideo =
    (args.active.data.current as DragData | undefined)?.type === "video";
  if (draggingVideo) {
    const card = hits.find((h) => kindOf(h.id) === "card");
    return card ? [card] : hits;
  }
  return hits.filter((h) => kindOf(h.id) === "slot");
};

export function Planner({
  initialVideos,
  initialPosts,
  initialAttachments,
  userEmail,
}: {
  initialVideos: Video[];
  initialPosts: Post[];
  initialAttachments: Attachment[];
  userEmail: string;
}) {
  const data = usePlannerData({
    posts: initialPosts,
    attachments: initialAttachments,
    videos: initialVideos,
  });
  const { posts, attachments, videos, videosById, videoByPost } = data;

  // "Today" depends on the viewer's timezone, so it's only known in the
  // browser; the calendar renders after mount to avoid a hydration mismatch.
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [active, setActive] = useState<DragData | null>(null);
  const [altDown, setAltDown] = useState(false);
  const altRef = useRef(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [pickerPostId, setPickerPostId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const dndId = useId();

  const days = useMemo(() => (anchor ? weekDays(anchor) : []), [anchor]);
  const livePosts = useMemo(() => posts.filter((p) => !p.deleted_at), [posts]);
  const openPost = livePosts.find((p) => p.id === openPostId);
  const trash = useMemo(
    () => deletedItems(posts, attachments, videosById),
    [posts, attachments, videosById],
  );

  const scheduledByVideo = useMemo(() => {
    const m = new Map<string, Platform[]>();
    for (const p of livePosts) {
      const v = videoByPost.get(p.id);
      if (!v) continue;
      m.set(v.id, [...(m.get(v.id) ?? []), p.platform]);
    }
    return m;
  }, [livePosts, videoByPost]);

  useEffect(() => setAnchor(new Date()), []);

  // Load the library on first visit.
  const { syncLibrary } = data;
  useEffect(() => {
    if (initialVideos.length === 0) void syncLibrary();
  }, [initialVideos.length, syncLibrary]);

  // Keyboard: Alt while dragging duplicates; Ctrl/Cmd+Z undoes; Esc closes.
  const { undoLast } = data;
  useEffect(() => {
    const setAlt = (v: boolean) => {
      altRef.current = v;
      setAltDown(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        if (active) e.preventDefault(); // stop Windows focusing the menu bar
        setAlt(e.type === "keydown");
        return;
      }
      if (e.type !== "keydown") return;
      const target = e.target as HTMLElement;
      const typing =
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z" &&
        !typing
      ) {
        e.preventDefault();
        undoLast();
      } else if (e.key === "Escape" && !typing) {
        setOpenPostId(null);
      }
    };
    const onBlur = () => setAlt(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, undoLast]);

  // Stop the browser opening files dropped outside a drop target.
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const sensors = useSensors(
    // A small distance lets a plain click open the card instead of dragging.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  // --- Confirmed destructive actions

  async function removeVideo(postId: string) {
    const ok = await confirm({
      title: "Remove this video?",
      body: "The file stays in Google Drive. You can restore the link from Recently deleted.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) data.removeVideo(postId);
  }

  async function deletePost(postId: string) {
    const ok = await confirm({
      title: "Delete this placeholder?",
      body: "You can restore it from Recently deleted for 30 days.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) {
      data.deletePost(postId);
      setOpenPostId(null);
    }
  }

  async function purge(kind: "post" | "attachment", id: string) {
    const ok = await confirm({
      title: "Delete forever?",
      body:
        kind === "post"
          ? "This placeholder will be permanently deleted. This can't be undone."
          : "This video link will be permanently deleted. The file in Google Drive is not affected. This can't be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    if (kind === "post") data.purgePost(id);
    else data.purgeAttachment(id);
  }

  // --- Files dragged in from the desktop

  function onFiles(files: File[], target: DropData) {
    const notVideo = files.filter(
      (f) => !f.type.startsWith("video/") && !VIDEO_EXT.test(f.name),
    );
    if (notVideo.length > 0) {
      data.showToast({
        tone: "error",
        message: `“${notVideo[0].name}” isn't a video. Only video files can be attached.`,
      });
      return;
    }
    // Files are matched to the library by name (and size when known), so a
    // short dragged from a synced Drive folder on your computer just works.
    const library = videos.filter((v) => !v.missing_since);
    const matched: Video[] = [];
    for (const f of files) {
      const byName = library.filter((v) => v.name === f.name);
      const match =
        byName.find((v) => v.size_bytes === f.size) ??
        (byName.length === 1 ? byName[0] : undefined);
      if (!match) {
        data.showToast({
          tone: "error",
          message: `“${f.name}” isn't in the Drive folder. Add it there, press Refresh, then drag it from the library.`,
        });
        return;
      }
      matched.push(match);
    }

    if (target.kind === "card") {
      data.attachVideo(target.postId, matched[0].id);
      if (matched.length > 1) {
        data.showToast({
          message:
            "A placeholder holds one video, so only the first was attached.",
        });
      }
    } else {
      for (const v of matched) data.createPost(target, v.id);
    }
  }

  // --- Drag and drop

  function onDragStart(e: DragStartEvent) {
    setActive(e.active.data.current as DragData);
    const ev = e.activatorEvent as KeyboardEvent | PointerEvent;
    if (ev?.altKey) {
      altRef.current = true;
      setAltDown(true);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const drag = e.active.data.current as DragData | undefined;
    const drop = e.over?.data.current as DropData | undefined;
    if (!drag || !drop) return;
    const slot = { date: drop.date, platform: drop.platform };

    if (drag.type === "video") {
      if (drop.kind === "card") data.attachVideo(drop.postId, drag.videoId);
      else data.createPost(slot, drag.videoId);
      return;
    }

    const post = livePosts.find((p) => p.id === drag.postId);
    if (!post) return;
    if (post.platform === slot.platform && post.publish_date === slot.date)
      return;
    if (altRef.current) data.duplicatePost(post.id, slot);
    else data.movePost(post.id, slot);
  }

  const activePost =
    active?.type === "post"
      ? livePosts.find((p) => p.id === active.postId)
      : undefined;
  const activeVideo =
    active?.type === "video" ? videosById.get(active.videoId) : undefined;

  const handlers: GridHandlers = {
    onOpen: setOpenPostId,
    onAttach: setPickerPostId,
    onAdd: (slot) => setOpenPostId(data.createPost(slot)),
    onFiles,
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="flex h-full">
        <Sidebar
          videos={videos}
          scheduledByVideo={scheduledByVideo}
          syncing={data.syncing}
          onRefresh={() => void data.syncLibrary()}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-4">
            <button
              onClick={() => setAnchor(new Date())}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium hover:bg-zinc-50"
            >
              Today
            </button>
            <div className="flex">
              <NavButton
                label="Previous week"
                onClick={() => setAnchor((a) => a && addDays(a, -7))}
              >
                <path d="M10 12L6 8l4-4" />
              </NavButton>
              <NavButton
                label="Next week"
                onClick={() => setAnchor((a) => a && addDays(a, 7))}
              >
                <path d="M6 4l4 4-4 4" />
              </NavButton>
            </div>
            <h1 className="text-sm font-semibold">
              {days.length > 0 && formatWeekRange(days)}
            </h1>

            <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
              <span className="hidden xl:inline">
                Drag to move · hold <Kbd>Alt</Kbd> to duplicate ·{" "}
                <Kbd>⌘/Ctrl Z</Kbd> to undo
              </span>
              <button
                onClick={() => setShowDeleted(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-100 hover:text-zinc-800"
              >
                Recently deleted
                {trash.length > 0 && (
                  <span className="rounded-full bg-zinc-200 px-1.5 text-[10px] font-semibold text-zinc-700 tabular-nums">
                    {trash.length}
                  </span>
                )}
              </button>
              <span>{userEmail}</span>
              <form action="/auth/signout" method="post">
                <button className="rounded-md px-2 py-1 hover:bg-zinc-100 hover:text-zinc-800">
                  Sign out
                </button>
              </form>
            </div>
          </header>

          {anchor ? (
            <WeekGrid
              days={days}
              today={toISODate(new Date())}
              posts={livePosts}
              videoByPost={videoByPost}
              handlers={handlers}
            />
          ) : (
            <div className="flex-1" />
          )}
        </main>
      </div>

      {openPost && (
        <PostDrawer
          key={openPost.id}
          post={openPost}
          video={videoByPost.get(openPost.id)}
          onClose={() => setOpenPostId(null)}
          onUpdate={(patch, label) =>
            data.updatePost(openPost.id, patch, label)
          }
          onAttach={() => setPickerPostId(openPost.id)}
          onRemoveVideo={() => void removeVideo(openPost.id)}
          onDelete={() => void deletePost(openPost.id)}
        />
      )}

      {pickerPostId && (
        <VideoPicker
          videos={videos}
          currentVideoId={videoByPost.get(pickerPostId)?.id}
          onPick={(videoId) => {
            data.attachVideo(pickerPostId, videoId);
            setPickerPostId(null);
          }}
          onClose={() => setPickerPostId(null)}
        />
      )}

      {showDeleted && (
        <RecentlyDeleted
          items={trash}
          onClose={() => setShowDeleted(false)}
          onRestorePost={data.restorePost}
          onRestoreAttachment={data.restoreAttachment}
          onPurgePost={(id) => void purge("post", id)}
          onPurgeAttachment={(id) => void purge("attachment", id)}
        />
      )}

      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="relative w-44 cursor-grabbing">
            {activePost ? (
              <PostCardView
                post={activePost}
                video={videoByPost.get(activePost.id)}
                lifted
              />
            ) : activeVideo ? (
              <VideoDragPreview video={activeVideo} />
            ) : null}
            {active.type === "post" && (
              <span className="absolute -top-2 -right-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                {altDown ? "+ Duplicate" : "Move"}
              </span>
            )}
          </div>
        )}
      </DragOverlay>

      {confirmDialog}
      <ToastView toast={data.toast} onDismiss={data.dismissToast} />
    </DndContext>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-300 px-1 font-sans">
      {children}
    </kbd>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
