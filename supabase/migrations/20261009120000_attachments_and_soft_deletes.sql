-- Footage attachments, editable placeholders and soft deletes.
--
-- * videos is the library, synced from the Google Drive folder. Files stay in
--   Drive; only metadata is stored. Files that disappear from the folder are
--   flagged (missing_since), never deleted, so placeholders keep their link.
-- * A post is a calendar placeholder. It can exist without footage.
-- * attachments links a placeholder to one video. At most one active
--   attachment per placeholder; removing or replacing a video soft-deletes the
--   old attachment so it can be restored from "Recently deleted".
-- * deleted_at implements soft deletes. Rows are purged after 30 days.

alter table public.videos
  add column mime_type     text,
  add column size_bytes    bigint,
  add column folder_path   text not null default '',
  add column missing_since timestamptz;

alter table public.posts
  add column title      text not null default '',
  add column deleted_at timestamptz;

create table public.attachments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  video_id   uuid not null references public.videos (id) on delete restrict,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index attachments_one_active_per_post
  on public.attachments (post_id) where deleted_at is null;
create index attachments_video_id_idx on public.attachments (video_id);

-- Carry existing post -> video links over, then drop the old column.
insert into public.attachments (post_id, video_id, created_by, created_at)
select id, video_id, created_by, created_at from public.posts;

alter table public.posts drop column video_id;

alter table public.attachments enable row level security;

create policy "allowed users read attachments" on public.attachments
  for select to authenticated using (public.is_allowed_user());
create policy "allowed users insert attachments" on public.attachments
  for insert to authenticated with check (public.is_allowed_user());
create policy "allowed users update attachments" on public.attachments
  for update to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "allowed users delete attachments" on public.attachments
  for delete to authenticated using (public.is_allowed_user());
