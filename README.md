# WhatsApp Web Clone — Full-Stack SaaS Chat App

A pixel-close clone of WhatsApp Web (dark theme) built with **Next.js 14 (App Router)**,
**Tailwind CSS**, **Zustand**, **Framer Motion**, **Express**, **Prisma + Neon (PostgreSQL)**,
**Socket.io**, and a **custom Email OTP** auth flow (no NextAuth).

```
whatsapp-clone/
├── frontend/   Next.js app (UI you interact with)
└── backend/    Express API + Socket.io + Prisma
```

---

## 1. Quick preview (no backend needed)

The frontend ships with **demo mode** so you can see the full UI instantly with mock data:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and click **"Continue with demo account."** You'll land straight
in the chat list — click any chat to open it, try Calls / Status / Channels / Communities in
the left rail, open Settings (bottom-left avatar) for the slide-in drawer, "+" for New Chat,
and click a chat header for the Media/Docs/Links modal.

To turn demo mode off and go through the real OTP flow, set `NEXT_PUBLIC_DEMO_MODE=false`
in `frontend/.env.local` once your backend (step 2) is running.

---

## 2. Real backend setup (Neon + Prisma + Email OTP)

### 2.1 Create a Neon database
1. Go to https://neon.tech, create a free project.
2. Copy the **pooled** connection string → `DATABASE_URL`.
3. Copy the **direct** connection string → `DIRECT_URL` (used only for migrations).

### 2.2 Configure environment variables
```bash
cd backend
cp .env.example .env
```
Fill in:
- `DATABASE_URL`, `DIRECT_URL` — from Neon.
- `JWT_SECRET` — any long random string (`openssl rand -hex 32`).
- Email: either
  - **SMTP** — set `SMTP_HOST/PORT/USER/PASS` (e.g. a Gmail App Password), or
  - **Resend** — set `MAIL_PROVIDER=resend` and `RESEND_API_KEY`.

### 2.3 Install, migrate, run
```bash
npm install
npx prisma migrate dev --name init   # creates User/Conversation/Participant/Message/Otp tables
npm run dev                          # starts Express + Socket.io on :4000
```

`GET http://localhost:4000/health` should return `{ "status": "ok" }`.

### 2.4 Point the frontend at it
```bash
cd ../frontend
cp .env.example .env.local
```
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_DEMO_MODE=false
```
```bash
npm run dev
```

Now the login screen sends a real email with a 6-digit code (via Nodemailer/Resend), the
code is bcrypt-hashed and stored in the `Otp` table, verified server-side, and a JWT is
issued for the session — exactly the flow requested (no NextAuth default providers).

---

## 3. Architecture notes

### Auth flow (Email + OTP)
`OTPForm.tsx` + `LoginForm.tsx` (frontend) →
`POST /api/auth/send-otp` → `authController.sendOtp` generates a random 6-digit code,
bcrypt-hashes it, stores it with a 5-minute expiry in the `Otp` table, and emails the
plaintext code. `POST /api/auth/verify-otp` compares the submitted code against the hash,
enforces a 5-attempt limit and expiry, then creates/updates the `User` row and returns a
JWT (`jsonwebtoken`, 30-day expiry). The **Resend OTP** button has its own 60-second client
-side cooldown and calls `POST /api/auth/resend-otp` (identical to send-otp, additionally
rate-limited server-side to 10 requests / 15 min / IP via `express-rate-limit`).

### Database schema (Prisma → Neon Postgres)
See `backend/prisma/schema.prisma`:
- `User` — id, email, name, avatar, about, onlineStatus, themePreference.
- `Conversation` — id, isGroup, name (groups), createdAt.
- `Participant` — join table: userId, conversationId, role, unreadCount, isFavorite.
- `Message` — id, conversationId, senderId, text, mediaUrl, status (sent/delivered/read), timestamp.
- `Otp` — email, codeHash, expiresAt, attempts, consumed.

### Real-time messaging (Socket.io)
`backend/src/socket/index.js` authenticates each socket with the same JWT, joins the user
to a room per conversation, and relays `message:new`, `typing:update`, `presence:update`
and `message:status` (read receipts) events. `frontend/lib/socket.ts` is the client-side
singleton that connects with the stored JWT.

### Frontend structure
- `store/useAuthStore.ts` — session state (persisted to `localStorage`).
- `store/useChatStore.ts` — conversations, active chat, filters, drawers, theme.
- `lib/api.ts` — Axios client with JWT interceptor, typed auth/chat endpoints.
- `lib/socket.ts` — Socket.io client singleton.
- `components/` — one component per UI piece (see file tree below), all reading/writing
  the Zustand stores so state stays in sync across the whole app.
- Theming: `app/globals.css` defines dark-mode CSS variables (exact hex values pulled from
  the attached screenshots) with a `.light` class override; `tailwind.config.ts` maps
  `bg-wa-*` utility classes to those variables, so `toggleTheme()` in the settings drawer
  instantly re-themes every screen with no per-component changes needed.

### Responsiveness
- **Desktop** (`md:` and up): classic split-pane — `LeftPanel` (400px) + `RightPanel` (flex-1).
- **Mobile**: `useChatStore().isMobileViewingChat` toggles which pane is visible; selecting
  a chat hides the list and shows the full-screen chat window with a back arrow
  (`ChatHeader`'s `ArrowLeft`) that calls `backToList()`.

### Component map
```
components/
├── Sidebar.tsx          narrow left icon rail (Chats/Calls/Status/Channels/Communities/Settings)
├── LeftPanel.tsx         switches between ChatList / CallsTab / StatusTab / ChannelsTab / CommunitiesTab
├── ChatList.tsx          search + FilterChips + list
├── ChatListItem.tsx      one row: avatar, name, snippet, ticks, unread badge
├── FilterChips.tsx       All / Unread / Favorites / Groups
├── ThreeDotMenu.tsx      New group / Starred / Select chats / Mark all read / App lock / Log out
├── RightPanel.tsx        switches between ChatWindow / EmptyState
├── EmptyState.tsx        "Voice and video calling..." placeholder + quick actions
├── ChatWindow.tsx        ChatHeader + message list + MessageInput
├── ChatHeader.tsx        back button, avatar, name, call/search/menu icons
├── MessageBubble.tsx     bubble with tail, alignment, timestamp, ticks
├── MessageInput.tsx      emoji / attach / textarea / mic-or-send
├── CallsTab.tsx          Favorites + call history with directional icons
├── StatusTab.tsx         My status + "Share statuses" empty state
├── ChannelsTab.tsx       Discover channels list with Follow buttons
├── CommunitiesTab.tsx    "Stay connected with a community" empty state
├── SettingsDrawer.tsx    slide-in from left: profile, theme toggle, menu, log out
├── NewChatDrawer.tsx     slide-in: search, New group/contact/community, contact list
├── MediaModal.tsx        Media / Docs / Links tabs
├── OTPForm.tsx           6-digit input, 60s resend cooldown
├── LoginForm.tsx         email entry → OTP step
└── Avatar.tsx            shared avatar with initials fallback + online dot
```

---

## 4. Production checklist
- [ ] Swap `JWT_SECRET` for a strong secret and rotate it if ever leaked.
- [ ] Put the Express API behind HTTPS (e.g. deploy to Render/Railway/Fly.io) and update
      `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` accordingly.
- [ ] Set `CORS_ORIGIN` to your real frontend domain.
- [ ] Add file storage (S3/Cloudinary) for real media uploads — `mediaUrl` fields are ready.
- [ ] Add a background job to prune expired/consumed `Otp` rows.
