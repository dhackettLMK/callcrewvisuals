import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Planner } from "@/components/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Attachment, Post, Video } from "@/lib/types";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          Loading calendar…
        </div>
      }
    >
      <PlannerWithData />
    </Suspense>
  );
}

async function PlannerWithData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [videos, posts, attachments] = await Promise.all([
    supabase.from("videos").select("*").order("name"),
    supabase.from("posts").select("*"),
    supabase.from("attachments").select("*"),
  ]);

  const error = videos.error ?? posts.error ?? attachments.error;
  if (error) throw new Error(`Failed to load data: ${error.message}`);

  return (
    <Planner
      initialVideos={videos.data as Video[]}
      initialPosts={posts.data as Post[]}
      initialAttachments={attachments.data as Attachment[]}
      userEmail={user.email ?? ""}
    />
  );
}
