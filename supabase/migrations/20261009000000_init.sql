-- Content calendar: initial schema.
-- Videos are metadata only (the files stay in Google Drive); posts are the
-- calendar entries. One video can have many posts.

create type public.platform as enum (
  'instagram', 'tiktok', 'youtube_shorts', 'linkedin', 'x', 'facebook'
);

create type public.post_status as enum ('idea', 'ready', 'scheduled', 'posted');

create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  drive_file_id    text not null unique,
  name             text not null,
  thumbnail_url    text,
  duration_seconds integer,
  web_view_link    text,
  last_synced_at   timestamptz not null default now()
);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  -- restrict: a Drive sync must never silently delete scheduled posts.
  video_id     uuid not null references public.videos (id) on delete restrict,
  platform     public.platform not null,
  publish_date date not null,
  publish_time time,
  status       public.post_status not null default 'ready',
  caption      text not null default '',
  notes        text not null default '',
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index posts_publish_date_idx on public.posts (publish_date);
create index posts_video_id_idx on public.posts (video_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access control: only signed-in users whose email is on the allowlist can
-- read or write anything. The app also checks the allowlist at sign-in, but
-- RLS is what actually protects the data (the publishable key is public).
-- Add each allowed user after running this migration:
--   insert into public.allowed_emails (email) values ('someone@example.com');
-- ---------------------------------------------------------------------------

create table public.allowed_emails (
  email text primary key check (email = lower(email))
);

alter table public.allowed_emails enable row level security;
-- No policies: not readable or writable through the API.

create function public.is_allowed_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.allowed_emails a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke execute on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

alter table public.videos enable row level security;
alter table public.posts enable row level security;

create policy "allowed users read videos" on public.videos
  for select to authenticated using (public.is_allowed_user());
create policy "allowed users write videos" on public.videos
  for all to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());

create policy "allowed users read posts" on public.posts
  for select to authenticated using (public.is_allowed_user());
create policy "allowed users insert posts" on public.posts
  for insert to authenticated with check (public.is_allowed_user());
create policy "allowed users update posts" on public.posts
  for update to authenticated
  using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "allowed users delete posts" on public.posts
  for delete to authenticated using (public.is_allowed_user());
