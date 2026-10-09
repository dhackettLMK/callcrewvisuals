import type { Platform } from "@/lib/types";

/** What is being dragged. */
export type DragData =
  | { type: "video"; videoId: string }
  | { type: "post"; postId: string };

/** Where it can be dropped: an empty part of a slot, or onto a card. */
export type DropData =
  | { kind: "slot"; date: string; platform: Platform }
  | { kind: "card"; postId: string; date: string; platform: Platform };
