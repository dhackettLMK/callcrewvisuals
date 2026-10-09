// Lists every video in a Google Drive folder (including subfolders) using the
// Drive API v3 with an API key. This works because the folder is shared as
// "Anyone with the link can view". Read-only: nothing in Drive is changed.

const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type DriveVideo = {
  drive_file_id: string;
  name: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  web_view_link: string;
  mime_type: string;
  size_bytes: number | null;
  folder_path: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  videoMediaMetadata?: { durationMillis?: string };
};

/** Stable thumbnail URL for link-shared files (thumbnailLink expires). */
export function driveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w640`;
}

export async function listFolderVideos(
  folderId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveVideo[]> {
  const videos: DriveVideo[] = [];
  const queue: { id: string; path: string }[] = [{ id: folderId, path: "" }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const folder = queue.shift()!;
    if (seen.has(folder.id)) continue; // guard against shortcut loops
    seen.add(folder.id);

    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: `'${folder.id}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, size, webViewLink, videoMediaMetadata(durationMillis))",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetchImpl(`${API}?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Drive API ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        files?: DriveFile[];
        nextPageToken?: string;
      };

      for (const f of data.files ?? []) {
        if (f.mimeType === FOLDER_MIME) {
          queue.push({
            id: f.id,
            path: folder.path ? `${folder.path} / ${f.name}` : f.name,
          });
        } else if (f.mimeType.startsWith("video/")) {
          const ms = Number(f.videoMediaMetadata?.durationMillis);
          videos.push({
            drive_file_id: f.id,
            name: f.name,
            thumbnail_url: driveThumbnailUrl(f.id),
            duration_seconds:
              Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : null,
            web_view_link:
              f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
            mime_type: f.mimeType,
            size_bytes: f.size ? Number(f.size) : null,
            folder_path: folder.path,
          });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  return videos;
}
