# Content calendar

Internal planning board: what video is going out, when, and on which platform.
Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Auth), dnd-kit.

## Setup

### 1. Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/20261009000000_init.sql`.
3. Add each person who may sign in (lowercase):
   ```sql
   insert into public.allowed_emails (email) values ('someone@example.com');
   ```
4. Load the sample videos: run `supabase/seed.sql`.

### 2. Google sign-in

1. In Google Cloud Console → APIs & Services → Credentials, create an
   **OAuth client ID** (type: Web application).
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - On the OAuth consent screen, choose **External** and leave it in
     **Testing**. Add every allowed email under **Test users**; Google then
     refuses sign-in for anyone else before they even reach the app.
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
| `ALLOWED_EMAILS` | Comma-separated Google accounts that may sign in |

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How access is restricted

To give someone access, add their email in all three places below.

- While the Google OAuth app is in Testing, only its listed test users can sign in.
- `/auth/callback` and `src/proxy.ts` sign out anyone whose email isn't in
  `ALLOWED_EMAILS`.
- Row Level Security only lets users whose email is in
  `public.allowed_emails` read or write data. This is the real protection,
  since the publishable key is public.

## Deploying to Vercel

Import the repo, add the three environment variables above, deploy, then add
`https://<your-vercel-domain>/auth/callback` to Supabase's redirect URLs.
