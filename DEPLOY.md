# Deploying SendREQ

Two independent deploys:

- **Frontend** (this Vite app) goes to **Vercel** as a static site.
- **Email** runs as a **Supabase Edge Function** (`notify`), deployed with the
  Supabase CLI. Vercel does not host it.

Do Part A first so email works the moment the frontend is live. The app will
still load without it, but approval emails will fail silently until the
function exists.

---

## Part A. Supabase Edge Function (email)

Prerequisites: the Supabase CLI (`npm i -g supabase`) and a Resend account with
a verified sending domain.

1. Link the CLI to your project (run once, from the repo root):

   ```bash
   supabase login
   supabase link --project-ref mqmibsjedlkdwlgftdei
   ```

2. Set the function secrets (server-side only, never in the frontend):

   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   supabase secrets set RESEND_FROM="SendREQ <notifications@yourdomain>"
   ```

3. Deploy the function:

   ```bash
   supabase functions deploy notify
   ```

   **CHECKPOINT:** it appears under Edge Functions in the Supabase dashboard,
   each showing a recent deploy. Test `notify`:

   ```bash
   curl -i -X POST \
     "https://mqmibsjedlkdwlgftdei.supabase.co/functions/v1/notify" \
     -H "Authorization: Bearer <YOUR_ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"to":"you@yourdomain","subject":"SendREQ test","html":"<b>It works</b>"}'
   ```

   A `200` with `{"message":"Email sent"}` and an email in your inbox means it
   is wired. A `500` means a secret is missing; `502` means Resend rejected it
   (usually an unverified `RESEND_FROM` domain).

---

## Part B. Frontend on Vercel

### 1. Put the repo on GitHub

This repo is local only. Create a remote and push (replace the URL):

```bash
git remote add origin https://github.com/<you>/sendreq.git
git push -u origin main
```

`.env.local` is gitignored and will not be pushed. That is correct. The
secrets live in Vercel, not in the repo.

### 2. Import to Vercel

In the Vercel dashboard: Add New → Project → import the GitHub repo. Vercel
detects Vite from `vercel.json`, so leave the build settings as shown:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

### 3. Set environment variables (before the first build)

Project → Settings → Environment Variables. Add these for the Production (and
Preview) environments:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://mqmibsjedlkdwlgftdei.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key (from `.env.local`) |
| `VITE_APP_URL` | optional; see note below |

These are read at **build time** and inlined. A build without them produces a
shell that throws "Missing Supabase configuration" on load. If you add or
change them later, you must trigger a redeploy for the change to take effect.

`VITE_APP_URL` is optional. It only sets the "Open SendREQ" link in emails. If
omitted, the link falls back to whatever origin the app is served from, which
is already correct. Set it only if you want a fixed canonical URL, for example
once you attach a custom domain.

### 4. Deploy

Click Deploy. On success you get a `*.vercel.app` URL.

**CHECKPOINT:** open the URL. The login page should render fully styled (no
flash of unstyled content). If it loads blank, open the browser console: a
"Missing Supabase configuration" error means the env vars were not set for the
environment you deployed.

### 5. Custom domain (optional)

Project → Settings → Domains → add your domain and follow the DNS steps. If you
set a custom domain, set `VITE_APP_URL` to it (with the `/#/` suffix) and
redeploy so email links use the canonical address.

---

## After deploy: end-to-end check

1. Log in and raise a test request through to final approval.
2. Confirm each stage email arrives: supervisor, authorizer, each ED, then the
   requester plus supervisor plus Finance Manager on approval.
3. In the Supabase dashboard, open Edge Functions → `notify` → Logs to see each
   send, and check Resend's dashboard for delivery status.

## Notes and limits

- The anon key is public by design and safe to ship. RLS is not yet enabled, so
  it is doing no access control today. Enable Supabase Auth and RLS before this
  is exposed beyond trusted users (see `supabase/migrations/0001_supabase_auth.md`).
- Rotate the old SendGrid key that was committed in the original `api/` folder;
  it is no longer used but should be treated as compromised.
- The build warns that the JS bundle is over 500 kB. It works, but route-level
  code splitting would improve first load. Not required for deploy.
