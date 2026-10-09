# Content calendar

Internal planning board: what video is going out, when, and on which platform.
Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Auth), dnd-kit.

## Setup

### 1. Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/20261009000000_init.sql`.
3. Allow your company domain (lowercase):
   ```sql
   insert into public.allowed_domains (domain) values ('yourcompany.com');
   ```
4. Load the sample videos: run `supabase/seed.sql`.

### 2. Google sign-in

1. In Google Cloud Console → APIs & Services → Credentials, create an
   **OAuth client ID** (type: Web application).
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - If your Google Workspace allows it, set the OAuth consent screen to
     **Internal** so only your organisation can use it.
2. In Supabase → Authentication → Sign In / Providers → **Google**: enable it and
   paste the client ID and secret.
3. In Supabase → Authentication → URL Configuration:
   - Site URL: your production URL (or `http://localhost:3000` for now)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and
     `https://<your-vercel-domain>/auth/callback`

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable / anon key) |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | Your Google Workspace domain, e.g. `yourcompany.com` |

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How access is restricted

- The Google account picker is limited to your domain (`hd` parameter; a hint only).
- `/auth/callback` and `src/proxy.ts` sign out anyone whose email isn't on
  `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`.
- Row Level Security only lets users whose email domain is in
  `public.allowed_domains` read or write data. This is the real protection,
  since the publishable key is public.

## Deploying to Vercel

Import the repo, add the three environment variables above, deploy, then add
`https://<your-vercel-domain>/auth/callback` to Supabase's redirect URLs.
