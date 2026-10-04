# Deploying SendREQ

Everything deploys to **Vercel** in one go: the Vite frontend plus the
`api/send-email.ts` serverless function that sends email via Resend. There is
no Supabase CLI and no separate function deploy. Supabase remains only the
database.

The app loads without email configured, but approval emails fail silently until
you set the Resend env vars (Part A).

---

## Part A. Resend (email)

Prerequisite: a Resend account with a verified sending domain.

1. At resend.com, add your sending domain and the DNS records it gives you.
   Wait until it shows Verified. Without this, Resend only sends to your own
   account email.
2. Create an API key (starts with `re_`).
3. In Vercel -> Project -> Settings -> Environment Variables, add (Production and
   Preview), **without** a `VITE_` prefix so they stay server-side:

   | Name | Value |
   | --- | --- |
   | `RESEND_API_KEY` | `re_...` |
   | `RESEND_FROM` | `SendREQ <notifications@yourdomain>` (verified domain) |
   | `EMAIL_RELAY_SECRET` | required; a long random string (see "Relay guard" below) |

4. Set the matching client value so the frontend is allowed to call the relay.
   `VITE_EMAIL_RELAY_SECRET` must equal `EMAIL_RELAY_SECRET`. Set it in Vercel
   env vars (it is build-time, so it is fine here) and in your local `.env.local`.

5. Redeploy so the function and build pick up the vars (Deployments -> latest ->
   Redeploy, or push a commit).

   **CHECKPOINT:** test the live function (replace the domain and secret):

   ```bash
   curl -i -X POST "https://YOUR-APP.vercel.app/api/send-email" \
     -H "Content-Type: application/json" \
     -H "x-relay-secret: YOUR_EMAIL_RELAY_SECRET" \
     -d '{"to":"you@yourdomain","subject":"SendREQ test","html":"<b>It works</b>"}'
   ```

   `200` with `{"message":"Email sent"}` and an email in your inbox means it is
   wired. `401` means the `x-relay-secret` header is missing or wrong. `500`
   means one of `RESEND_API_KEY` / `RESEND_FROM` / `EMAIL_RELAY_SECRET` is not
   set; `502` means Resend rejected it (usually an unverified `RESEND_FROM`
   domain).

### The relay guard (required)

`/api/send-email` rejects any request without a matching `x-relay-secret`
header, so a stranger who finds the URL cannot use it to send mail from your
domain. Set `EMAIL_RELAY_SECRET` (server) and `VITE_EMAIL_RELAY_SECRET`
(client) to the same long random value. Generate one with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` or
`openssl rand -hex 32`.

This raises the bar but is not full authentication, because the client value
ships in the bundle, so anyone who reads the deployed JavaScript can recover it.
Real protection arrives with the Supabase Auth migration (verify the user's
session JWT in the function). Rotate the secret by changing both env vars and
redeploying.

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
3. In Vercel, open the project → the deployment → Functions → `api/send-email`
   logs to see each send, and check Resend's dashboard for delivery status.

## Notes and limits

- The anon key is public by design and safe to ship. RLS is not yet enabled, so
  it is doing no access control today. Enable Supabase Auth and RLS before this
  is exposed beyond trusted users (see `supabase/migrations/0001_supabase_auth.md`).
- Rotate the old SendGrid key that was committed in the original `api/` folder;
  it is no longer used but should be treated as compromised.
- The build warns that the JS bundle is over 500 kB. It works, but route-level
  code splitting would improve first load. Not required for deploy.
