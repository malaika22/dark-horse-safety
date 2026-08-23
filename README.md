# Dark Horse Safety

Turborepo monorepo — admin dashboard and API.

## Structure (Turborepo standard)

```
apps/                 # Deployable applications only
  api/                # NestJS API (@dark-horse-safety/api)
  dashboard/          # Admin web — Dark Horse Force

packages/             # Shared libraries (consumed by apps)
  ui/                 # React components
  theme/              # Design tokens + Tailwind theme CSS
  types/              # Shared domain / API types
  api-client/         # HTTP client
  assets/             # Brand logo + shared media

tooling/              # Shared configs (not app logic)
  typescript-config/  # Base / Next / React-library tsconfigs
  eslint-config/      # Shared ESLint flat configs
```

**Rules**
- Apps never import from other apps — shared code goes in `packages/`
- Config lives in `tooling/`, not duplicated per app
- No nested workspace globs (`packages/**`) — only `apps/*`, `packages/*`, `tooling/*`

Logo: `packages/assets/brand/logo.png` → served as `/brand/logo.png` in dashboard `public/`.

## Theme

| Token | Value | Use |
|-------|-------|-----|
| `background` | `#161618` | Page / login shell |
| `surface` | `#1C1C1E` | Auth cards |
| `border` | `#222222` | Card / divider borders |
| `surface-muted` / `surface-strong` | `#2A2A2A` / `#333333` | Inputs / secondary buttons |
| `primary` | `#FFFFFF` | Primary CTA (black label) |
| `accent` / `error` | `#E31C23` / `#FF4D4D` | Brand / field errors |
| `foreground-muted` / `foreground-subtle` | `#959597` | Labels, hints, secondary gray text |

Typography uses **SF Pro** globally via `@dark-horse-safety/theme`.

```css
@import "tailwindcss";
@import "@dark-horse-safety/theme/styles.css";
@source "../../../packages/ui/src";
```

## Scripts

```bash
npm install
npm run dev              # all via Turbo
npm run build
npm run lint
npm run typecheck
```

| App | Dev URL |
|-----|---------|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3002 |

```bash
npm run dev:dashboard
npm run dev:api
```

## Backend auth (NestJS + Postgres)

```bash
# 1) Start Postgres
npm run db:up
# If Docker Desktop is broken on Windows, use:
# npm run db:embedded   # Postgres on localhost:5433

# 2) Migrate + seed (from apps/api)
cp .env.example apps/api/.env   # if needed
npm install
npm run db:migrate
npm run db:seed
npm run dev:api
```

Seed admin: `admin@darkhorseops.com` / `Password123!`

> Local Windows note: if port `5432` is already used by another Postgres, Docker / embedded DB uses **`5433`**. Match `DATABASE_URL` in `apps/api/.env`.


### Auth API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/login` | Email + password |
| `POST` | `/auth/google` | Google ID token (GIS) |
| `GET` | `/auth/google` | Google OAuth redirect start |
| `GET` | `/auth/google/callback` | OAuth callback → dashboard |
| `GET` | `/auth/me` | Current user (Bearer JWT) |
| `POST` | `/auth/forgot-password` | Send reset email |
| `POST` | `/auth/resend-reset` | Resend reset email |
| `POST` | `/auth/reset-password` | Set new password with token |
| `GET` | `/auth/invite/:token` | Preview invite |
| `POST` | `/auth/invite/accept` | Activate account |
| `POST` | `/auth/invite/request` | Ask admin for invite |
| `POST` | `/auth/invite/resend` | Resend invite email |
| `GET` | `/health` | Health check |

Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `apps/api/.env`. Dashboard: `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/dashboard/.env.local`.

**Google login (dashboard):** uses Google Identity Services **popup** (no redirect). In [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials) → your Web client → **Authorized JavaScript origins** add:

- `http://localhost:3000`

(Redirect URI mismatch no longer applies to the login button. Optional redirect flow still uses `http://localhost:3002/auth/google/callback` if you open that API URL directly.)

**Swagger:** http://localhost:3002/docs

### Email (Resend)

[Resend](https://resend.com) free tier: **3,000 emails/month**.

| Email type | Sent to | From env |
|------------|---------|----------|
| Password reset / resend reset | **User's email** (form input) | `RESEND_API_KEY` |
| Invite / resend invite | **User's email** (form input) | `RESEND_API_KEY` |
| Invite request notification | **Admin** `laiba2618@gmail.com` | `ADMIN_EMAIL` |

**Why emails don't reach users:** With `onboarding@resend.dev`, Resend only delivers to your signup email (`ADMIN_EMAIL`). Other addresses (e.g. `gulaboo26@gmail.com`) are blocked until you either verify **darkhorseops.com** on Resend or configure **SMTP** below.

Setup:

1. Sign up at https://resend.com  
2. **API Keys → Create API Key** → `apps/api/.env` as `RESEND_API_KEY`  
3. Set `ADMIN_EMAIL=laiba2618@gmail.com`  
4. **To deliver to any user now (dev):** add Gmail SMTP in `apps/api/.env`:
   - Enable 2FA on Gmail → create an [App Password](https://myaccount.google.com/apppasswords)
   - Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (see `.env.example`)
5. **Production:** verify `darkhorseops.com` at https://resend.com/domains, then set  
   `MAIL_FROM="Dark Horse Safety <noreply@darkhorseops.com>"`

The API tries Resend first; if sandbox blocks delivery, it automatically retries via SMTP when configured.

## Auth routes (dashboard)

Auth screens use the centered **AuthShell** (no sidebar). After login, users land on the authenticated **AppShell** (sidebar + header + `/auth/me` session).

| Route | Screen |
|-------|--------|
| `/` | Login + Google + validation states |
| `/account-locked` | Too many failed attempts |
| `/dashboard` | Authenticated control center (sidebar layout) |
| `/home` | Redirects to `/dashboard` |
| `/reset-password` | Request reset link |
| `/reset-password/check-inbox` | Email sent confirmation |
| `/reset-password/set-new` | Set new password |
| `/password-updated` | Success |
| `/invite/accept` | Activate account from invite |
| `/invite/expired` | Expired invite |
| `/invite/request` | Request new invite |
| `/invite/resent` | Invite resent success |

## Feature layout (dashboard)

```
apps/dashboard/features/auth/
```
