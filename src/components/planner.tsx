"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { addDays, formatWeekRange, toISODate, weekDays } from "@/lib/dates";
import type { Platform, Post, Video } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { WeekGrid } from "./week-grid";
import { PostCardView } from "./post-card";
import { VideoDragPreview } from "./video-item";

export type DragData =
  | { type: "video"; videoId: string }
  | { type: "post"; postId: string };

export type SlotData = { date: string; platform: Platform };

export function Planner({
  initialVideos,
  initialPosts,
  userEmail,
}: {
  initialVideos: Video[];
  initialPosts: Post[];
  userEmail: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const [videos] = useState(initialVideos);
  const [posts, setPosts] = useState(initialPosts);
  // "Today" depends on the viewer's timezone, so it's only known in the
  // browser; the calendar renders after mount to avoid a hydration mismatch.
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [active, setActive] = useState<DragData | null>(null);
  const [altDown, setAltDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const altRef = useRef(false);
  // Inserts still in flight, so a quick follow-up move waits for the row.
  const pendingInserts = useRef(new Map<string, PromiseLike<unknown>>());

  const videosById = useMemo(
    () => new Map(videos.map((v) => [v.id, v])),
    [videos],
  );
  const days = useMemo(() => (anchor ? weekDays(anchor) : []), [anchor]);
  const dndId = useId();

  useEffect(() => setAnchor(new Date()), []);

  // Track Alt during a drag so the user can press or release it mid-drag.
  useEffect(() => {
    const set = (v: boolean) => {
      altRef.current = v;
      setAltDown(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        if (active) e.preventDefault(); // stop Windows focusing the menu bar
        set(e.type === "keydown");
      }
    };
    const onBlur = () => set(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [active]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const sensors = useSensors(
    // A small distance lets a plain click open the card instead of dragging.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  // --- Mutations: update local state first, then persist; roll back on error.

  const createPost = useCallback(
    async (fields: Omit<Post, "id" | "created_by" | "created_at" | "updated_at">) => {
      const now = new Date().toISOString();
      const optimistic: Post = {
        ...fields,
        id: crypto.randomUUID(),
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      setPosts((ps) => [...ps, optimistic]);
      const request = supabase
        .from("posts")
        .insert({ id: optimistic.id, ...fields })
        .select()
        .single();
      pendingInserts.current.set(optimistic.id, request);
      const { data, error } = await request;
      pendingInserts.current.delete(optimistic.id);
      if (error) {
        setPosts((ps) => ps.filter((p) => p.id !== optimistic.id));
        setError(`Couldn't schedule: ${error.message}`);
      } else {
        setPosts((ps) => ps.map((p) => (p.id === data.id ? (data as Post) : p)));
      }
    },
    [supabase],
  );

  const movePost = useCallback(
    async (post: Post, slot: SlotData) => {
      const patch = { platform: slot.platform, publish_date: slot.date };
      setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, ...patch } : p)));
      await pendingInserts.current.get(post.id);
      const { data, error } = await supabase
        .from("posts")
        .update(patch)
        .eq("id", post.id)
        .select()
        .single();
      if (error) {
        setPosts((ps) =>
          ps.map((p) =>
            p.id === post.id
              ? { ...p, platform: post.platform, publish_date: post.publish_date }
              : p,
          ),
        );
        setError(`Couldn't move: ${error.message}`);
      } else {
        setPosts((ps) => ps.map((p) => (p.id === data.id ? (data as Post) : p)));
      }
    },
    [supabase],
  );

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
    const data = e.active.data.current as DragData | undefined;
    const slot = e.over?.data.current as SlotData | undefined;
    if (!data || !slot) return;

    if (data.type === "video") {
      void createPost({
        video_id: data.videoId,
        platform: slot.platform,
        publish_date: slot.date,
        publish_time: null,
        status: "ready",
        caption: "",
        notes: "",
      });
      return;
    }

    const post = posts.find((p) => p.id === data.postId);
    if (!post) return;
    const sameSlot =
      post.platform === slot.platform && post.publish_date === slot.date;
    if (sameSlot) return;

    if (altRef.current) {
      void createPost({
        video_id: post.video_id,
        platform: slot.platform,
        publish_date: slot.date,
        publish_time: post.publish_time,
        status: post.status === "posted" ? "ready" : post.status,
        caption: post.caption,
        notes: post.notes,
      });
    } else {
      void movePost(post, slot);
    }
  }

  const activePost =
    active?.type === "post" ? posts.find((p) => p.id === active.postId) : undefined;
  const activeVideo =
    active?.type === "video"
      ? videosById.get(active.videoId)
      : activePost && videosById.get(activePost.video_id);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="flex h-full">
        <Sidebar videos={videos} posts={posts} />

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-4">
            <button
              onClick={() => setAnchor(new Date())}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-sm font-medium hover:bg-zinc-50"
            >
              Today
            </button>
            <div className="flex">
              <NavButton label="Previous week" onClick={() => setAnchor((a) => a && addDays(a, -7))}>
                <path d="M10 12L6 8l4-4" />
              </NavButton>
              <NavButton label="Next week" onClick={() => setAnchor((a) => a && addDays(a, 7))}>
                <path d="M6 4l4 4-4 4" />
              </NavButton>
            </div>
            <h1 className="text-sm font-semibold">
              {days.length > 0 && formatWeekRange(days)}
            </h1>

            <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
              <span className="hidden lg:inline">
                Drag to move · hold <kbd className="rounded border border-zinc-300 px-1 font-sans">Alt</kbd> to duplicate
              </span>
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
              posts={posts}
              videosById={videosById}
            />
          ) : (
            <div className="flex-1" />
          )}
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {active && activeVideo && (
          <div className="relative w-44 cursor-grabbing">
            {activePost ? (
              <PostCardView post={activePost} video={activeVideo} lifted />
            ) : (
              <VideoDragPreview video={activeVideo} />
            )}
            {active.type === "post" && (
              <span className="absolute -top-2 -right-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                {altDown ? "+ Duplicate" : "Move"}
              </span>
            )}
          </div>
        )}
      </DragOverlay>

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </DndContext>
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
