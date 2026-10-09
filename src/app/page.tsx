import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Planner } from "@/components/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post, Video } from "@/lib/types";

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

  const [videos, posts] = await Promise.all([
    supabase.from("videos").select("*").order("name"),
    supabase.from("posts").select("*"),
  ]);

  if (videos.error || posts.error) {
    throw new Error(
      `Failed to load data: ${(videos.error ?? posts.error)!.message}`,
    );
  }

  return (
    <Planner
      initialVideos={videos.data as Video[]}
      initialPosts={posts.data as Post[]}
      userEmail={user.email ?? ""}
    />
  );
}
