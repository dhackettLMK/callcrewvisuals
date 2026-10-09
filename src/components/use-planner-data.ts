"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Attachment, Platform, Post, Video } from "@/lib/types";

export type Slot = { date: string; platform: Platform };

export type Toast = {
  id: number;
  message: string;
  tone?: "error";
  /** Shown as an "Undo" button on the toast. */
  undo?: () => void;
};

type UndoEntry = { label: string; undo: () => void };

/** Fields of a post the user can edit. */
export type PostPatch = Partial<
  Pick<
    Post,
    | "title"
    | "platform"
    | "publish_date"
    | "publish_time"
    | "status"
    | "caption"
    | "notes"
    | "deleted_at"
  >
>;

export const RETENTION_DAYS = 30;

const nowIso = () => new Date().toISOString();

function newAttachment(postId: string, videoId: string): Attachment {
  return {
    id: crypto.randomUUID(),
    post_id: postId,
    video_id: videoId,
    created_by: null,
    created_at: nowIso(),
    deleted_at: null,
  };
}

function newPost(slot: Slot, fields: Partial<Post> = {}): Post {
  return {
    id: crypto.randomUUID(),
    title: "",
    publish_time: null,
    status: "ready",
    caption: "",
    notes: "",
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
    ...fields,
    platform: slot.platform,
    publish_date: slot.date,
  };
}

/**
 * All planner data and every mutation. Changes are applied to local state
 * immediately (optimistic UI), then saved; a failed save rolls the local change
 * back and shows an error. User actions record an inverse so they can be undone
 * from a toast or with Ctrl/Cmd+Z.
 */
export function usePlannerData(initial: {
  posts: Post[];
  attachments: Attachment[];
  videos: Video[];
}) {
  const supabase = getSupabaseBrowserClient();
  const [posts, setPosts] = useState(initial.posts);
  const [attachments, setAttachments] = useState(initial.attachments);
  const [videos, setVideos] = useState(initial.videos);
  const [toast, setToast] = useState<Toast | null>(null);

  // Mirrors of state for reading current values inside event handlers.
  const postsRef = useRef(posts);
  const attachmentsRef = useRef(attachments);
  postsRef.current = posts;
  attachmentsRef.current = attachments;

  const undoStack = useRef<UndoEntry[]>([]);
  const toastSeq = useRef(0);

  const showToast = useCallback((t: Omit<Toast, "id">) => {
    setToast({ ...t, id: ++toastSeq.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Database writes for the same placeholder run one after another, so e.g. an
  // attachment is never inserted before its placeholder exists.
  const queues = useRef(new Map<string, Promise<unknown>>());
  const enqueue = useCallback(
    (
      key: string,
      fn: () => PromiseLike<{ error: { message: string } | null }>,
    ) => {
      const prev = queues.current.get(key) ?? Promise.resolve();
      const next = prev.then(() => fn());
      queues.current.set(
        key,
        next.catch(() => {}),
      );
      return next;
    },
    [],
  );

  const fail = useCallback(
    (what: string, message: string) =>
      showToast({ message: `Couldn't ${what}: ${message}`, tone: "error" }),
    [showToast],
  );

  // --- Row-level helpers (no undo recording) -------------------------------

  const insertPost = useCallback(
    (post: Post) => {
      setPosts((ps) => [...ps, post]);
      const {
        created_by: _by,
        created_at: _at,
        updated_at: _up,
        ...row
      } = post;
      void enqueue(post.id, () => supabase.from("posts").insert(row)).then(
        ({ error }) => {
          if (error) {
            setPosts((ps) => ps.filter((p) => p.id !== post.id));
            fail("save", error.message);
          }
        },
      );
    },
    [enqueue, fail, supabase],
  );

  const patchPost = useCallback(
    (id: string, patch: PostPatch) => {
      const before = postsRef.current.find((p) => p.id === id);
      if (!before) return;
      const prev = Object.fromEntries(
        Object.keys(patch).map((k) => [k, before[k as keyof Post]]),
      ) as PostPatch;
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      void enqueue(id, () =>
        supabase.from("posts").update(patch).eq("id", id),
      ).then(({ error }) => {
        if (error) {
          setPosts((ps) =>
            ps.map((p) => (p.id === id ? { ...p, ...prev } : p)),
          );
          fail("save", error.message);
        }
      });
    },
    [enqueue, fail, supabase],
  );

  const hardDeletePost = useCallback(
    (id: string) => {
      const post = postsRef.current.find((p) => p.id === id);
      const atts = attachmentsRef.current.filter((a) => a.post_id === id);
      if (!post) return;
      setPosts((ps) => ps.filter((p) => p.id !== id));
      setAttachments((as) => as.filter((a) => a.post_id !== id));
      void enqueue(id, () => supabase.from("posts").delete().eq("id", id)).then(
        ({ error }) => {
          if (error) {
            setPosts((ps) => [...ps, post]);
            setAttachments((as) => [...as, ...atts]);
            fail("delete", error.message);
          }
        },
      );
    },
    [enqueue, fail, supabase],
  );

  const insertAttachment = useCallback(
    (att: Attachment) => {
      setAttachments((as) => [...as, att]);
      const { created_by: _by, created_at: _at, ...row } = att;
      void enqueue(att.post_id, () =>
        supabase.from("attachments").insert(row),
      ).then(({ error }) => {
        if (error) {
          setAttachments((as) => as.filter((a) => a.id !== att.id));
          fail("attach the video", error.message);
        }
      });
    },
    [enqueue, fail, supabase],
  );

  const setAttachmentDeleted = useCallback(
    (att: Attachment, deletedAt: string | null) => {
      const prev = att.deleted_at;
      const apply = (v: string | null) =>
        setAttachments((as) =>
          as.map((a) => (a.id === att.id ? { ...a, deleted_at: v } : a)),
        );
      apply(deletedAt);
      void enqueue(att.post_id, () =>
        supabase
          .from("attachments")
          .update({ deleted_at: deletedAt })
          .eq("id", att.id),
      ).then(({ error }) => {
        if (error) {
          apply(prev);
          fail("save", error.message);
        }
      });
    },
    [enqueue, fail, supabase],
  );

  const hardDeleteAttachment = useCallback(
    (att: Attachment) => {
      setAttachments((as) => as.filter((a) => a.id !== att.id));
      void enqueue(att.post_id, () =>
        supabase.from("attachments").delete().eq("id", att.id),
      ).then(({ error }) => {
        if (error) {
          setAttachments((as) => [...as, att]);
          fail("delete", error.message);
        }
      });
    },
    [enqueue, fail, supabase],
  );

  // --- Undo -----------------------------------------------------------------

  const record = useCallback((label: string, undo: () => void) => {
    const entry = { label, undo };
    undoStack.current.push(entry);
    if (undoStack.current.length > 100) undoStack.current.shift();
    return entry;
  }, []);

  const runUndo = useCallback(
    (entry: UndoEntry) => {
      const i = undoStack.current.lastIndexOf(entry);
      if (i === -1) return; // already undone
      undoStack.current.splice(i, 1);
      entry.undo();
      showToast({ message: `Undone: ${entry.label}` });
    },
    [showToast],
  );

  const undoLast = useCallback(() => {
    const entry = undoStack.current.at(-1);
    if (entry) runUndo(entry);
    else showToast({ message: "Nothing to undo" });
  }, [runUndo, showToast]);

  /** Record an undoable action and show a toast with an Undo button. */
  const recordWithToast = useCallback(
    (label: string, message: string, undo: () => void) => {
      const entry = record(label, undo);
      showToast({ message, undo: () => runUndo(entry) });
    },
    [record, runUndo, showToast],
  );

  // --- Helpers --------------------------------------------------------------

  const activeAttachment = useCallback(
    (postId: string) =>
      attachmentsRef.current.find((a) => a.post_id === postId && !a.deleted_at),
    [],
  );

  // --- User actions (undoable) ---------------------------------------------

  /** New placeholder in a slot, optionally with a video. Returns its id. */
  const createPost = useCallback(
    (slot: Slot, videoId?: string) => {
      const post = newPost(slot);
      insertPost(post);
      if (videoId) insertAttachment(newAttachment(post.id, videoId));
      record(videoId ? "schedule video" : "add placeholder", () =>
        hardDeletePost(post.id),
      );
      return post.id;
    },
    [insertPost, insertAttachment, record, hardDeletePost],
  );

  const movePost = useCallback(
    (postId: string, slot: Slot) => {
      const post = postsRef.current.find((p) => p.id === postId);
      if (!post) return;
      const prev = { platform: post.platform, publish_date: post.publish_date };
      patchPost(postId, { platform: slot.platform, publish_date: slot.date });
      record("move", () => patchPost(postId, prev));
    },
    [patchPost, record],
  );

  const duplicatePost = useCallback(
    (postId: string, slot: Slot) => {
      const src = postsRef.current.find((p) => p.id === postId);
      if (!src) return;
      const copy = newPost(slot, {
        title: src.title,
        publish_time: src.publish_time,
        status: src.status === "posted" ? "ready" : src.status,
        caption: src.caption,
        notes: src.notes,
      });
      insertPost(copy);
      const att = activeAttachment(postId);
      if (att) insertAttachment(newAttachment(copy.id, att.video_id));
      record("duplicate", () => hardDeletePost(copy.id));
    },
    [activeAttachment, hardDeletePost, insertAttachment, insertPost, record],
  );

  const updatePost = useCallback(
    (postId: string, patch: PostPatch, label = "edit") => {
      const post = postsRef.current.find((p) => p.id === postId);
      if (!post) return;
      const changed = Object.fromEntries(
        Object.entries(patch).filter(([k, v]) => post[k as keyof Post] !== v),
      ) as PostPatch;
      if (Object.keys(changed).length === 0) return;
      const prev = Object.fromEntries(
        Object.keys(changed).map((k) => [k, post[k as keyof Post]]),
      ) as PostPatch;
      patchPost(postId, changed);
      record(label, () => patchPost(postId, prev));
    },
    [patchPost, record],
  );

  /** Attach a video, replacing (soft-deleting) the current one if any. */
  const attachVideo = useCallback(
    (postId: string, videoId: string) => {
      const current = activeAttachment(postId);
      if (current?.video_id === videoId) return;
      if (current) setAttachmentDeleted(current, nowIso());
      const att = newAttachment(postId, videoId);
      insertAttachment(att);
      if (current) {
        recordWithToast("replace video", "Video replaced", () => {
          hardDeleteAttachment(att);
          setAttachmentDeleted(current, null);
        });
      } else {
        record("attach video", () => hardDeleteAttachment(att));
      }
    },
    [
      activeAttachment,
      hardDeleteAttachment,
      insertAttachment,
      record,
      recordWithToast,
      setAttachmentDeleted,
    ],
  );

  const removeVideo = useCallback(
    (postId: string) => {
      const current = activeAttachment(postId);
      if (!current) return;
      setAttachmentDeleted(current, nowIso());
      recordWithToast("remove video", "Video removed", () =>
        setAttachmentDeleted(current, null),
      );
    },
    [activeAttachment, recordWithToast, setAttachmentDeleted],
  );

  const deletePost = useCallback(
    (postId: string) => {
      patchPost(postId, { deleted_at: nowIso() });
      recordWithToast("delete placeholder", "Placeholder deleted", () =>
        patchPost(postId, { deleted_at: null }),
      );
    },
    [patchPost, recordWithToast],
  );

  const restorePost = useCallback(
    (postId: string) => {
      const post = postsRef.current.find((p) => p.id === postId);
      if (!post?.deleted_at) return;
      const deletedAt = post.deleted_at;
      patchPost(postId, { deleted_at: null });
      recordWithToast("restore placeholder", "Placeholder restored", () =>
        patchPost(postId, { deleted_at: deletedAt }),
      );
    },
    [patchPost, recordWithToast],
  );

  /** Restore a removed video; it replaces whatever is attached now. */
  const restoreAttachment = useCallback(
    (attId: string) => {
      const att = attachmentsRef.current.find((a) => a.id === attId);
      if (!att?.deleted_at) return;
      const deletedAt = att.deleted_at;
      const current = activeAttachment(att.post_id);
      if (current) setAttachmentDeleted(current, nowIso());
      setAttachmentDeleted(att, null);
      recordWithToast("restore video", "Video restored", () => {
        setAttachmentDeleted({ ...att, deleted_at: null }, deletedAt);
        if (current)
          setAttachmentDeleted({ ...current, deleted_at: nowIso() }, null);
      });
    },
    [activeAttachment, recordWithToast, setAttachmentDeleted],
  );

  /** Permanent deletes. Not undoable (the UI confirms first). */
  const purgePost = useCallback(
    (postId: string) => {
      hardDeletePost(postId);
      showToast({ message: "Permanently deleted" });
    },
    [hardDeletePost, showToast],
  );

  const purgeAttachment = useCallback(
    (attId: string) => {
      const att = attachmentsRef.current.find((a) => a.id === attId);
      if (!att) return;
      hardDeleteAttachment(att);
      showToast({ message: "Permanently deleted" });
    },
    [hardDeleteAttachment, showToast],
  );

  // Purge anything deleted more than RETENTION_DAYS ago.
  useEffect(() => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString();
    const expired = (d: string | null) => d !== null && d < cutoff;
    if (
      !postsRef.current.some((p) => expired(p.deleted_at)) &&
      !attachmentsRef.current.some((a) => expired(a.deleted_at))
    ) {
      return;
    }
    void (async () => {
      const a = await supabase
        .from("attachments")
        .delete()
        .lt("deleted_at", cutoff);
      const p = await supabase.from("posts").delete().lt("deleted_at", cutoff);
      if (!a.error && !p.error) {
        setAttachments((as) => as.filter((x) => !expired(x.deleted_at)));
        setPosts((ps) => ps.filter((x) => !expired(x.deleted_at)));
      }
    })();
  }, [supabase]);

  // --- Drive library ----------------------------------------------------------

  const [syncing, setSyncing] = useState(false);
  const syncLibrary = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/drive/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setVideos(body.videos as Video[]);
      showToast({
        message: `Library refreshed · ${body.count} videos in Drive`,
      });
    } catch (e) {
      fail("refresh the library", (e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [fail, showToast]);

  // --- Derived ------------------------------------------------------------------

  const videosById = useMemo(
    () => new Map(videos.map((v) => [v.id, v])),
    [videos],
  );

  /** Active video per live placeholder. */
  const videoByPost = useMemo(() => {
    const m = new Map<string, Video>();
    for (const a of attachments) {
      if (a.deleted_at) continue;
      const v = videosById.get(a.video_id);
      if (v) m.set(a.post_id, v);
    }
    return m;
  }, [attachments, videosById]);

  return {
    posts,
    attachments,
    videos,
    videosById,
    videoByPost,
    toast,
    dismissToast: () => setToast(null),
    showToast,
    syncing,
    syncLibrary,
    createPost,
    movePost,
    duplicatePost,
    updatePost,
    attachVideo,
    removeVideo,
    deletePost,
    restorePost,
    restoreAttachment,
    purgePost,
    purgeAttachment,
    undoLast,
  };
}
