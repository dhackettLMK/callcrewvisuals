import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { listFolderVideos } from "@/lib/drive";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Refreshes the video library from the Google Drive folder. Writes go through
// the signed-in user's session, so Row Level Security still applies.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!folderId || !apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_FOLDER_ID and GOOGLE_API_KEY must be set." },
      { status: 500 },
    );
  }

  let found;
  try {
    found = await listFolderVideos(folderId, apiKey);
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't read the Drive folder. ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  if (found.length > 0) {
    const { error } = await supabase.from("videos").upsert(
      found.map((v) => ({ ...v, last_synced_at: now, missing_since: null })),
      { onConflict: "drive_file_id" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Flag (never delete) videos that are no longer in the folder.
  const foundIds = new Set(found.map((v) => v.drive_file_id));
  const { data: present, error: presentError } = await supabase
    .from("videos")
    .select("id, drive_file_id")
    .is("missing_since", null);
  if (presentError) {
    return NextResponse.json({ error: presentError.message }, { status: 500 });
  }
  const gone = present.filter((v) => !foundIds.has(v.drive_file_id));
  if (gone.length > 0) {
    const { error } = await supabase
      .from("videos")
      .update({ missing_since: now })
      .in(
        "id",
        gone.map((v) => v.id),
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: videos, error } = await supabase
    .from("videos")
    .select("*")
    .order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: found.length, videos });
}
