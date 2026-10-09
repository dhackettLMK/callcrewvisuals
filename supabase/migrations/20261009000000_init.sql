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
-- Access control: only signed-in users whose email is on an allowed company
-- domain can read or write anything. The app also checks the domain at sign-in,
-- but RLS is what actually protects the data (the anon key is public).
-- Add your domain after running this migration:
--   insert into public.allowed_domains (domain) values ('yourcompany.com');
-- ---------------------------------------------------------------------------

create table public.allowed_domains (
  domain text primary key check (domain = lower(domain))
);

alter table public.allowed_domains enable row level security;
-- No policies: not readable or writable through the API.

create function public.is_company_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.allowed_domains d
    where d.domain = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2))
  );
$$;

revoke execute on function public.is_company_user() from public, anon;
grant execute on function public.is_company_user() to authenticated;

alter table public.videos enable row level security;
alter table public.posts enable row level security;

create policy "company users read videos" on public.videos
  for select to authenticated using (public.is_company_user());
create policy "company users write videos" on public.videos
  for all to authenticated
  using (public.is_company_user()) with check (public.is_company_user());

create policy "company users read posts" on public.posts
  for select to authenticated using (public.is_company_user());
create policy "company users insert posts" on public.posts
  for insert to authenticated with check (public.is_company_user());
create policy "company users update posts" on public.posts
  for update to authenticated
  using (public.is_company_user()) with check (public.is_company_user());
create policy "company users delete posts" on public.posts
  for delete to authenticated using (public.is_company_user());
