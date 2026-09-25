# BaseKey CRM

A multi-tenant WhatsApp Business CRM — contacts, live chat, campaigns, a
visual chatbot flow builder, template management, and a developer API —
built on Next.js (App Router) + TypeScript + Prisma/PostgreSQL.

## Project structure

```
src/
  app/          → Next.js App Router: pages + API routes (app/api/**)
  components/   → UI components, grouped by feature (chat/, campaigns/, ...)
  lib/          → server-side helpers (auth, tenant scoping, WhatsApp sender, ...)
  store/        → Zustand client state stores
  types/        → shared TypeScript types
  middleware.ts → auth + per-agent route guarding
prisma/
  schema.prisma → database schema
  migrations/   → SQL migrations
public/         → static assets
scripts/        → one-off maintenance scripts
docs/           → deployment notes
```

`prisma/` and `public/` stay at the project root (standard Next.js
convention); everything else app-related lives under `src/`.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET,
                        # RESEND_API_KEY, and your WhatsApp/Meta credentials
npx prisma migrate deploy   # or `npx prisma db push` for local dev
npm run dev
```

## Access model — Owner / Admin vs. Agent

Every signup automatically gets its own isolated `Organization`
(workspace). Inside a workspace there are two kinds of login:

- **Owner / Admin (the "root" user)** — the account that owns the
  workspace, or anyone promoted to Admin. Full access to every page:
  Dashboard, Chat, Contacts, Campaigns, Flow Builder, Templates, Settings,
  Developers, and **Team management** (`/dashboard/team`).
- **Agent (restricted login)** — created *by* an Owner/Admin from
  `/dashboard/team`. The Owner/Admin picks exactly which pages that agent
  can open (e.g. only Chat + Contacts) and which one they land on after
  login. This is enforced in two places, so the UI and the server always
  agree:
  - `src/middleware.ts` checks the signed-in user's `allowedPages` on every
    request and redirects away from anything not on the list.
  - `src/components/Sidebar.tsx` only renders nav links the agent is
    actually allowed to open.

Creating an agent (`POST /api/team`) sends them an email with a
verification link (`/verify/[token]`); their account is inactive until
they click it. Owners/Admins can edit an agent's access at any time
(`PUT /api/team`) or revoke it entirely (`DELETE /api/team`).

## Notes for deployment

- WhatsApp/AI credentials are stored per-workspace in the `SystemSettings`
  table (via the Settings page), not in environment variables — they
  survive redeploys.
- See `docs/AWS_DEPLOY.md` for containerized deployment options.
