# WhatsApp Web Clone — Real WhatsApp, not a demo

A pixel-close clone of WhatsApp Web (dark theme) that links to your **real**
WhatsApp account (QR code or phone number, exactly like the real app) using
[Baileys](https://github.com/WhiskeySockets/Baileys), a Node.js
implementation of the WhatsApp Web protocol. There is no mock/dummy data
anywhere — every chat, message, and piece of media you see is really yours.

**Stack:** Next.js 14 (App Router) · Tailwind · Zustand · Framer Motion ·
Express · Socket.io · Prisma + Neon (PostgreSQL) · Baileys · Cloudinary ·
custom Email OTP auth (no NextAuth).

```
whatsapp-clone/
├── frontend/            Next.js app (the UI you interact with)
├── backend/              Express API + Socket.io + Baileys + Prisma
└── docker-compose.yml    Local Docker + Defang deploy config
```

---

## ⚠️ Please read before you deploy

Baileys talks to WhatsApp's servers by re-implementing the same protocol
the official WhatsApp Web client uses. It is **not** WhatsApp's official
API, and linking an account this way is against WhatsApp's Terms of
Service — accounts that automate messaging (especially bulk/spam-like
behaviour) risk being banned. This project is intended for **personal
use on your own number** (mirroring your own chats to a nicer UI), the
same way thousands of open-source WhatsApp bots already work. Don't use
it for mass messaging or on numbers you don't own.

---

## 1. How the real connection works

1. You log in to **this app** with your email (6-digit OTP, unchanged
   from before — this just protects who can open your dashboard).
2. The app then shows the real **"Link a device"** screen — scan the QR
   code with WhatsApp on your phone, or tap "Link with phone number
   instead" and type in the number to get an 8-character pairing code.
3. The moment your phone confirms the link, the backend starts syncing
   your real chats and messages into Postgres and streaming them to the
   browser over Socket.io. Nothing is faked or pre-filled.
4. Sending a message, replying, or attaching media from the UI sends a
   **real WhatsApp message** from your account via Baileys.

Session credentials (the "linked device" keys) are stored per-user under
`backend/wa-sessions/<userId>/` so you don't have to re-scan the QR every
time the server restarts — as long as that folder persists (see the
Docker volume / Render disk notes below).

---

## 2. Local setup

### 2.1 Backend
```bash
cd backend
cp .env.example .env
```
Fill in:
- `DATABASE_URL` / `DIRECT_URL` — from [Neon](https://neon.tech) (free tier is fine).
- `JWT_SECRET` — any long random string.
- Email (`MAIL_PROVIDER=smtp` + `SMTP_*`, or `MAIL_PROVIDER=resend` + `RESEND_API_KEY`) — same as before, for the app's own OTP login.
- **New:** `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from your [Cloudinary](https://cloudinary.com) dashboard (free tier works). This is where real photos/videos/docs/voice notes are stored.
- `WA_SESSIONS_DIR` can stay as the default.

```bash
npm install
npx prisma migrate dev --name init
npm run dev        # Express + Socket.io on :4000
```

### 2.2 Frontend
```bash
cd ../frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SOCKET_URL already point at :4000
npm install
npm run dev                    # http://localhost:3000
```

Log in with your email → OTP → you'll land on the real QR/phone-number
linking screen. Scan it and your real chats appear.

---

## 3. Deploying

### 3.1 With Docker Compose (also works for Defang)
```bash
docker compose up --build
```
[Defang](https://defang.io) deploys straight from the same file:
```bash
defang login
# one-time: push every secret referenced by env_file — Defang keeps
# these out of the compose file entirely.
defang config set DATABASE_URL
defang config set DIRECT_URL
defang config set JWT_SECRET
defang config set SMTP_USER
defang config set SMTP_PASS
defang config set CLOUDINARY_CLOUD_NAME
defang config set CLOUDINARY_API_KEY
defang config set CLOUDINARY_API_SECRET

defang compose up
```
The `wa-sessions` named volume in `docker-compose.yml` keeps linked
WhatsApp sessions across redeploys — without it you'd have to re-scan
the QR code every time.

### 3.2 On Render (backend) — RAM notes
Baileys itself is lightweight (no Chromium/Puppeteer — it's a pure
WebSocket + protobuf client), so it runs fine on Render's free/starter
tiers. To keep memory smooth:
- `syncFullHistory: false` is already set in `baileysManager.js` — we
  persist our own history into Postgres instead of letting Baileys cache
  everything in memory.
- Mount a **persistent disk** on Render at e.g. `/data/wa-sessions` and
  set `WA_SESSIONS_DIR=/data/wa-sessions`, or your session dies (and you
  must re-scan the QR) on every deploy.
- One Baileys socket stays open per linked user for the life of the
  process — expect ~40–80MB per active linked session; size your Render
  plan accordingly if more than a couple of people will use this.

### 3.3 Frontend on Vercel
Unchanged from before — set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`
to your deployed backend's URL and redeploy. **Nothing about your
existing Vercel env vars needs to change** — this update only adds new
backend-side vars (Cloudinary, `WA_SESSIONS_DIR`); nothing already
configured was touched or renamed.

---

## 4. What's real vs. what's intentionally still a shell

| Screen | Status |
|---|---|
| Chats, messages, media, replies, read receipts | **Real** — live from your WhatsApp account |
| New chat by phone number | **Real** — checks the number is on WhatsApp via Baileys before creating the chat |
| Calls tab | Honest empty state — Baileys/WhatsApp Web doesn't expose call history to linked devices |
| Status tab | Shell UI only — posting/viewing statuses isn't wired up yet |
| Channels tab | Honest empty state — channel discovery isn't part of the Baileys protocol |
| Communities tab | Shell UI only |

None of these show made-up data; where a real feature isn't wired up yet,
you'll see a genuine empty state explaining why, not a fake list.

---

## 5. Android/browser back-button behaviour

The back button (hardware back on Android, or the browser's own back
button) now closes exactly **one UI layer at a time**, closest-first —
matching the real WhatsApp app:

1. Three-dot menu / reply preview (whichever is open)
2. Media/Docs/Links modal
3. New Chat drawer
4. Settings drawer
5. Mobile chat view → back to the chat list
6. OTP step → back to the email step
7. From the chat list root, one more back press leaves/exits the app as normal

This is implemented with a small JS stack (`backStack` in
`store/useChatStore.ts`) kept in sync with real `history.pushState` /
`popstate` events (`hooks/useBackButtonHandler.ts`) — no fragile
`beforeunload` hacks, and it degrades gracefully to normal browser
navigation once every layer is closed.

---

## 6. Architecture notes

### Auth (Email + OTP) — unchanged
Still exactly what it was: `POST /api/auth/send-otp` → bcrypt-hashed,
5-minute-expiry code emailed via Nodemailer/Resend → `POST
/api/auth/verify-otp` checks it (5-attempt limit) and issues a 30-day JWT.

### Real WhatsApp layer (new)
- `backend/src/whatsapp/baileysManager.js` — one Baileys socket per
  linked app-user, QR **and** phone-pairing-code support, persists chats
  and messages into `WaChat`/`WaMessage` (Prisma), uploads any real media
  to Cloudinary, and pushes everything to the browser over
  `user:<id>`-scoped Socket.io rooms (`wa:qr`, `wa:pairing-code`,
  `wa:connected`, `wa:disconnected`, `wa:chat:update`, `wa:message:new`,
  `wa:message:status`).
- `backend/src/controllers/whatsappController.js` +
  `backend/src/routes/whatsapp.js` — REST surface: connect / status /
  logout / list chats / list messages / send text / send media (multipart
  → Cloudinary → Baileys) / start a new chat by phone number.
- `backend/src/utils/cloudinary.js` — buffer → Cloudinary upload helper,
  used both for outgoing attachments and incoming media Baileys hands us.

### Frontend
- `store/useChatStore.ts` — the real-time engine: wires every `wa:*`
  socket event, exposes `sendMessage` / `sendMediaMessage` /
  `startChatWithNumber`, holds the reply-target and the back-button stack.
- `components/WhatsAppLinkScreen.tsx` — the real QR/phone-pairing screen.
- `components/MessageBubble.tsx` — renders real images/video/audio/docs
  from Cloudinary URLs, quoted replies, and a hover "reply" action.
- `components/MessageInput.tsx` — flat, docked compose bar (no floating
  pill — matches the real WhatsApp Web layout), with a reply-preview bar
  and a caption strip when you attach a file.
- Theming: `app/globals.css` defines dark-mode CSS variables with a
  `.light` override; `tailwind.config.ts` maps `bg-wa-*` classes to them,
  so the theme toggle in Settings re-themes the whole app instantly.

---

## 7. Production checklist
- [ ] Rotate `JWT_SECRET` if it's ever been shared/committed.
- [ ] Put a persistent volume/disk under `wa-sessions` in every deploy target.
- [ ] Set `CORS_ORIGIN` to your real frontend domain.
- [ ] Cloudinary's free tier has monthly bandwidth/storage caps — upgrade before it matters in production.
- [ ] Add a cron/job to prune expired `Otp` rows.
- [ ] Re-read section "⚠️ Please read before you deploy" above.
