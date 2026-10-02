# SendREQ

Role-based payment-request and approval workflow, custom-built for **YOTA
(Youth Opportunity and Transformation in Africa)**.

Staff raise payment requests; they move through Supervisor → Authorizer →
Approver (Executive Director), with signatures, notifications, 1:1 chat, and an
admin console for users and system lists.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind, React Router (hash),
  Recharts, `react-hot-toast`.
- **Backend:** Supabase (Postgres + Realtime + Auth) accessed from the client.
- **Serverless:** two Supabase Edge Functions — `notify` (email via SendGrid)
  and `summarize` (AI request summary via Gemini). API keys stay server-side.

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

Server (Supabase Function secrets — **never** in client env):

```bash
supabase secrets set SENDGRID_API_KEY=SG.xxxx
supabase secrets set SENDGRID_FROM=media@yotaweb.org   # verified sender
supabase secrets set GEMINI_API_KEY=xxxx
```

## Database

`supabase/schema.sql` is a reconstruction of the schema from the application
code (the archive's original `.sql` files were corrupt). **Diff it against the
live project before applying** — see the header of that file.

## Edge Functions

```bash
supabase functions deploy notify
supabase functions deploy summarize
```

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
