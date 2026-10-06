# Authoriza

Role-based payment-request and approval workflow, custom-built for **YOTA
(Youth Opportunity and Transformation in Africa)**.

Staff raise payment requests; they move through Supervisor → Authorizer →
Approver (Executive Director), with signatures, notifications, 1:1 chat, and an
admin console for users and system lists.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind, React Router (hash),
  Recharts, `react-hot-toast`.
- **Backend:** Supabase (Postgres + Realtime + Auth) accessed from the client.
- **Serverless:** one Vercel serverless function — `api/send-email.ts` (email
  via Resend). The Resend key stays in Vercel server-side env vars.
- **Email templates:** `services/emailTemplates.ts` renders a branded email per
  approval stage; sent to the next actor and to the requester as a request moves.

## Roles

`ADMIN`, `STAFF`, `SUPERVISOR`, `AUTHORIZER`, `APPROVER` (Executive Director),
`AUDITOR`. See `types.ts` for the status workflow.

## Run locally

Prerequisites: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

`npm run build` runs `tsc` then `vite build`. Env vars prefixed `VITE_` must be
present **at build time** — a build without them produces a broken shell, not an
error.

## Configuration

Client (`.env.local`, exposed to the browser):

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public by design) |

Server (Vercel env vars — set in Project Settings, **not** `VITE_`-prefixed so
they stay off the client):

| Var | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (`re_...`) |
| `RESEND_FROM` | sender, e.g. `Authoriza <notifications@yourdomain>` (verified domain) |
| `EMAIL_RELAY_SECRET` | required; `/api/send-email` rejects calls without a matching `x-relay-secret` header |
| `SUPABASE_URL` | `https://<project>.supabase.co` (for `/api/admin-user`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key; powers user create/edit/delete and password changes. **Secret, server-side only.** |

Email requires a domain verified in Resend (add the DNS records Resend gives
you). `RESEND_FROM` must use that domain. `EMAIL_RELAY_SECRET` is required: set
it here and set `VITE_EMAIL_RELAY_SECRET` (client) to the same value so the
frontend is allowed to call the relay. The function refuses to send if either
is missing.

## Database

`supabase/schema.sql` is a reconstruction of the schema from the application
code (the archive's original `.sql` files were corrupt). **Diff it against the
live project before applying** — see the header of that file.

## Serverless functions

Both deploy automatically with the frontend on every push (no Supabase CLI):

- `api/send-email.ts` — email via Resend.
- `api/admin-user.ts` — user create/edit/delete and password changes via the
  Supabase service role. It verifies the caller's session: an ADMIN may manage
  anyone; a normal user may edit only their own profile and password.

## Authentication

Login uses Supabase Auth (`signInWithPassword`); the session, not `localStorage`,
is the source of truth. RLS restricts all data to signed-in users. Migrating an
existing database from the old plaintext-password scheme is a staged cutover —
see `supabase/migrations/0001_supabase_auth.md`.

## Deploy (frontend)

Static build (`dist/`) on any static host (Vercel, Netlify, Render static site).
Set the two `VITE_` vars in the host's build environment. The router uses hash
routing, so no SPA rewrite rule is required.

## Known issues / roadmap

1. **Plaintext passwords** — login currently compares plaintext against the
   `users` table. Fix planned in `supabase/migrations/0001_supabase_auth.md`
   (migrate to Supabase Auth + RLS). **Top priority.**
2. **No server-side writes path** — all mutations go directly from the browser
   under the anon key, so atomicity and authorization depend entirely on RLS,
   which is not yet enabled. Tied to the auth migration.
3. **Rotate leaked secrets** — the previous `api/` code committed a live
   SendGrid key. Rotate it in SendGrid; the new key goes only in Function
   secrets.
4. Bundle is a single ~1.3 MB chunk; consider route-level code splitting.
