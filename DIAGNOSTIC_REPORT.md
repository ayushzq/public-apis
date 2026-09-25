# BaseKey CRM — Diagnostic & Fix Report

Repo shell name is "RiMusic" but the app is BaseKey CRM (a WhatsApp Business
CRM). This report covers everything found and fixed across this engagement.

---

## 🚨 1. Critical security findings (fixed)

These were the most serious issues in the codebase — worse than any UX bug.

### 1.1 Team/Agent login was completely spoofable
- `/api/team/login` compared passwords with plain `===`, not bcrypt —
  despite the DB column being named `passwordHash`, team member passwords
  were effectively **plaintext**.
- On "success" it returned the user's raw database ID as JSON. The
  frontend then did `localStorage.setItem("agent_token", id)` and treated
  that as a login. **Nothing server-side ever re-checked this token.**
  Anyone with browser devtools could type
  `localStorage.setItem("agent_token", "<any-known-user-id>")` and fully
  impersonate any team member — no password needed.
- **Fix:** deleted `/api/team/login` entirely. Team/Agent login now goes
  through the same NextAuth `CredentialsProvider` (`bcrypt.compare`, real
  signed httpOnly JWT cookie) that admin password login already used.
  Fixed in 5 files that all trusted the fake token: `Login.tsx`,
  `app/login/page.tsx`, `app/page.tsx`, `app/chat/page.tsx`,
  `components/Sidebar.tsx`.
- **Also fixed:** `/api/team` (member creation) was hashing nothing —
  `passwordHash: password` directly. Now `bcrypt.hash(password, 10)`.

### 1.2 No route protection at all
- There was no `middleware.ts` anywhere. Only `/dashboard/page.tsx`
  bothered to check `useSession()` and redirect — every other protected
  page (`/chat`, `/campaigns`, `/contacts`, `/developers`, `/template`,
  `/chatbot-builder`, and the new `/settings`) rendered its full shell for
  anyone, logged in or not.
- **Fix:** added `middleware.ts` guarding all of those routes via
  `next-auth/middleware`, redirecting unauthenticated requests to `/login`.

### 1.3 Sidebar hardcoded every logged-in user as ADMIN
- Once real sessions exist for Agents too (per the fix above), the old
  code would have shown every Agent the Admin-only nav (Dashboard,
  Campaigns, Flows, Templates, Team) because it hardcoded
  `setUserRole("ADMIN")` for any NextAuth session, ignoring the actual
  `role` column. **Fixed** — role now comes from `session.user.role`.

### 1.4 Wide-open API routes
No auth check at all on:
- `/api/config` (GET leaked the Meta access token to anyone; POST let
  anyone rewrite your WhatsApp/AI settings)
- `/api/upload` (anyone could upload arbitrary files to your Cloudinary account)
- `/api/keys` (anyone could list/generate/revoke live developer API keys)
- `/api/team` GET/POST/DELETE (anyone could list team members, **create
  their own ADMIN account**, or delete any user)

All four now require a session; the mutating team endpoints require
`role === "ADMIN"`.

### 1.5 Predictable API key tokens
`Math.random()` was used to generate developer API tokens — not
cryptographically secure, and predictable. Switched to
`crypto.randomBytes(24)`.

---

## 🔧 2. The Great Firebase Purge & DB migration (done)

The Chatbot Flow Engine read/wrote flow state from Firebase Realtime
Database while the Flow Builder saved to Postgres via Prisma — **two
databases that never talked to each other**, and `firebase-admin` was
never even initialized, so every engine call threw and was silently
swallowed by the webhook's try/catch. This was the actual reason your bot
never responded to anyone.

- Rewrote `lib/whatsapp/engine.ts` to run entirely on Prisma/Postgres,
  using the already-existing-but-unused `Contact.activeFlowNodeId` column
  as the per-conversation cursor.
- Added `GET /api/flows` + a `loadFlow` store action so the builder shows
  your last-saved flow instead of always resetting to the hardcoded
  defaults.
- Removed `firebase` / `firebase-admin` from `package.json` and deleted
  the unused `firebase.js`. **Zero Firebase references remain.**

---

## 🤖 3. Multi-AI Provider (done)

- `SystemSettings` schema extended: `aiProvider` ("gemini" | "openai" |
  "claude"), `openaiApiKey`, `claudeApiKey`, `geminiApiKey`.
- `lib/whatsapp/aiBot.ts` rewritten to route to whichever provider is
  configured, each with its own key (falls back to an env var of the same
  purpose). Previously this was a Gemini-only stub that logged a comment
  and sent nothing — flipping "AI Bot" on used to silently disable the
  Flow Engine and reply with **nothing at all**.
- Settings page lets you pick the provider and paste in the matching key.

## 🎛️ 4. New Settings page + feature toggles (done)

- The sidebar's "Settings" link 404'd — no `app/settings/page.tsx` existed.
  Built the real page: WhatsApp connection fields, AI provider + keys,
  dark-mode-default toggle, and on/off switches for Campaigns / Chatbot
  Builder / Developer API / Team presence (`SystemSettings.feature*`
  columns, checked wherever those modules render — you can flip a module
  off for your whole team without a redeploy).
- **Honest caveat:** the dark-mode toggle persists a preference, but the
  app currently has **zero Tailwind `dark:` variants anywhere** — every
  page is hardcoded light-theme hex colors. The toggle is real
  plumbing, not yet a real dark theme. Retrofitting `dark:` classes across
  ~30 components is a substantial follow-up, not something to do blind
  without visual QA.

## 💬 5. Chat section (done, with one honest gap)

- Swipe-to-reply/quote banner was **already fully built** (touch gesture
  in `ChatBubble.tsx`, quoted banner in `ChatInput.tsx`) — I verified it
  rather than rebuilding it. It's UI-state only (no DB column), which
  matches what was asked.
- `handleSendMedia`, `handleSendLocation`, `handleSendTemplate` in
  `app/chat/page.tsx` were literal `alert("API abhi baaki hai!")` stubs —
  despite a fully-working Cloudinary upload route (`/api/upload`) and a
  fully-built attach/emoji/dropzone UI already existing. Wired them
  together end-to-end: attach → Cloudinary → real WhatsApp media message,
  with the reply quote passed through.
- Same Cloudinary wiring applied to the Flow Builder's Media node, which
  had a literal `alert("Cloudinary upload widget will be connected
  here.")` placeholder.
- **Gap:** "send template from chat" currently posts the template name as
  plain text, not a true Meta template message with filled variables. A
  real implementation needs the same approved-components flow already
  built in Template Management — wiring that into chat is more work than
  fit in this pass.

## 🧹 6. Dummy data / dead buttons (done)

- ~40 `alert()` calls across 10 files converted to `sonner` toasts.
  `sonner` was already a dependency but **never mounted anywhere** — every
  toast call in the app was previously a silent no-op. Now mounted in root
  layout.
- Deleted: `Dummy/` folder (orphaned `.txt` duplicates of old engine code),
  the stray `mnt/` folder, and a root-level `webhook-route.ts` that was a
  stale duplicate of the real `app/api/webhook/route.ts`.
- Campaigns page fetched `/api/templates`, which never existed — the real
  route is `/api/whatsapp/templates`. One-line fix; the template dropdown
  was always empty before.

## 🏗️ 7. Architecture (partially done — see honest limits)

- **Global Sidebar:** built `AppShell` correctly matching your Sidebar's
  actual desktop layout (`components/Sidebar.tsx` renders as a normal-flow
  flex child on desktop, not `position: fixed` — the existing but
  zero-import `DashboardLayout.tsx` assumed the wrong model and would
  never have worked). Wired into root `layout.tsx`. **Not yet retrofitted**
  into the 7 pages that still self-manage their own `<Sidebar/>` — doing
  that blind, across 7 differently-sized files, without a way to visually
  verify each one in this environment, risked silently breaking pages
  that currently work. It's a mechanical one-block removal per page; I'd
  rather do it with you watching each page than guess.
- **Android/PWA back button:** added a reusable `useBackButtonClose(isOpen,
  onClose)` hook and wired it to `ConfigModal` and the mobile chat
  conversation view (back closes the conversation → returns to the
  contact list, instead of leaving `/chat` or the app). Other modals
  (TemplatePicker, etc.) can adopt the same hook — not all wired yet.
- **Loading states:** added `react-spinners` + a reusable `LoadingButton`
  component, and an `nprogress` top-of-page bar for route navigation.

## 📦 8. AWS deployment (done)

- `.env.example` — every env var actually referenced in the codebase,
  generated by grepping `process.env.*` usage (not guessed).
- `Dockerfile` (multi-stage, uses `output: 'standalone'` — added to
  `next.config.js`), `.dockerignore`, `docker-compose.yml` for local testing.
- `docs/AWS_DEPLOY.md` — three deploy paths (App Runner, ECS Fargate,
  Elastic Beanstalk Docker), plus a note that WhatsApp/AI credentials live
  in the database via the Settings page, not env vars, so they survive
  redeploys.

## ⚠️ 9. Known remaining gaps (not fixed — flagging honestly)

- Dark mode: plumbing only, no actual `dark:` styling (see §4).
- Template quick-send from chat: text placeholder, not a real templated
  message (see §5).
- 7 pages still self-manage their own Sidebar rather than using the new
  `AppShell` (see §7) — safe as-is, just not consolidated.
- Not every modal in the app uses `useBackButtonClose` yet — only
  `ConfigModal` and the chat mobile view.
- `Message.replyTo` isn't a real DB column (reply context doesn't survive
  a page refresh) — this was explicitly asked to be UI-state-only, so left
  as-is, flagging in case that assumption should change later.

---

## What to do before deploying

1. `npx prisma migrate dev` (or `db push`) locally against a dev database
   to generate the migration for the new `SystemSettings` and no-longer-Firebase
   columns, then `npx prisma migrate deploy` in production.
2. Fill in `.env.example` → `.env` (or your AWS secrets manager).
3. Any existing team members created before this fix have a plaintext
   value sitting in `passwordHash` from the old bug — they'll need their
   password reset once (`/api/team` recreate, or a manual `bcrypt.hash`
   backfill) since the new login path expects a real bcrypt hash.
