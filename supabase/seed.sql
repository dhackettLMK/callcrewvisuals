-- Sample videos for step 1 (before the Google Drive sync exists).
-- Safe to re-run. Remove these rows once the Drive sync is in place:
--   delete from public.videos where drive_file_id like 'sample-%';
-- (any posts using them must be deleted first).
insert into public.videos (drive_file_id, name, thumbnail_url, duration_seconds, web_view_link) values
  ('sample-01', 'Founder intro – why we started',      'https://picsum.photos/seed/cc01/640/360', 42,  null),
  ('sample-02', 'Product walkthrough in 60s',          'https://picsum.photos/seed/cc02/640/360', 61,  null),
  ('sample-03', 'Customer story – Northwind',          'https://picsum.photos/seed/cc03/640/360', 95,  null),
  ('sample-04', 'Behind the scenes – shoot day',       'https://picsum.photos/seed/cc04/640/360', 28,  null),
  ('sample-05', '3 mistakes teams make with calls',    'https://picsum.photos/seed/cc05/640/360', 47,  null),
  ('sample-06', 'Feature drop – smart summaries',      'https://picsum.photos/seed/cc06/640/360', 33,  null),
  ('sample-07', 'Office tour',                         'https://picsum.photos/seed/cc07/640/360', 74,  null),
  ('sample-08', 'Q&A with the CTO',                    'https://picsum.photos/seed/cc08/640/360', 182, null),
  ('sample-09', 'Hiring – join the crew',              'https://picsum.photos/seed/cc09/640/360', 39,  null),
  ('sample-10', 'Tip of the week – call notes',        'https://picsum.photos/seed/cc10/640/360', 21,  null),
  ('sample-11', 'Event recap – SaaS Summit',           'https://picsum.photos/seed/cc11/640/360', 58,  null),
  ('sample-12', 'Team intro – meet support',           'https://picsum.photos/seed/cc12/640/360', 50,  null)
on conflict (drive_file_id) do nothing;
