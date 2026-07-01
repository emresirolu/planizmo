# Security — secrets & data access

How Planizmo keeps API keys, client secrets, and connection strings out of the
browser and out of the repo, and how to add new providers safely.

## Where secrets live

Every secret is read **server-side only**, from the process environment:

| Secret | Read in | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Auth.js (`auth.ts`), `lib/health/crypto.ts` | Session/JWT + health-token encryption key |
| `AUTH_GOOGLE_ID` | Auth.js (Google provider) | OAuth **client id** — semi-public, but keep it in env, not code |
| `AUTH_GOOGLE_SECRET` | Auth.js (Google provider) | OAuth **client secret** — must never reach the browser |
| `DEEPSEEK_API_KEY` | `lib/assistant/deepseek.ts` | The file is `import "server-only"`; the key never leaves the server |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | `lib/db/index.ts`, `drizzle.config.ts` | Neon connection string(s) — server-only |
| `CRON_SECRET` | `app/api/cron/*` | Bearer token Vercel Cron sends to protect cron routes |
| `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY` | `lib/billing/paddle.ts`, webhook route | Server-only |
| `FITBIT_CLIENT_SECRET` | `lib/health/fitbit.ts` | Server-only |
| `AUTH_EMAIL_SERVER` | `auth.ts` (magic-link SMTP) | Server-only |

Locally these live in `.env.local` (git-ignored). In production they are set in
the Vercel project settings. The only committed env file is `.env.example`,
which contains **placeholders only**.

### Values that are intentionally public

`PADDLE_CLIENT_TOKEN`, `PADDLE_ENV`, and the Paddle price ids are *publishable*
client config (Paddle.js needs them in the browser). They are surfaced through
`paddleConfig()` in `lib/billing/paddle.ts`. This is by design and safe — do not
add server secrets (`PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`) to that function.

## Rules

1. **Never use `NEXT_PUBLIC_` for a secret.** Any variable with that prefix is
   inlined into the client bundle and shipped to every visitor. The repo has
   **zero** `NEXT_PUBLIC_` variables; keep it that way for anything sensitive.
2. **Never import a secret-reading module into a client component.** `lib/db`,
   `lib/assistant/deepseek`, `lib/billing/paddle`, and the rate limiter are all
   `import "server-only"`, so a client import fails the build instead of leaking.
3. **Call providers (DeepSeek, Paddle, Fitbit) only from route handlers, server
   actions, or `lib/*` server modules** — never from the browser.
4. **Derive `user_id` from the session, never from the request body.** All
   user-owned reads/writes go through `lib/db/scoped.ts`, whose `requireUserId()`
   is the single source of the id. A query physically cannot span users because
   the caller never supplies the id.

## How to rotate a key

1. Generate/obtain the new value from the provider (or `npx auth secret` for
   `AUTH_SECRET`; `openssl rand -base64 32` also works).
2. Update it in **Vercel → Project → Settings → Environment Variables** (and your
   local `.env.local`).
3. Redeploy so running instances pick up the new value.
4. Revoke the old value at the provider (Google Cloud Console, DeepSeek, Paddle,
   Neon, Fitbit).
5. Rotating `AUTH_SECRET` invalidates existing sessions — users sign in again.
   Rotating `DATABASE_URL` requires the new string to point at the same database.

## How to add a new API provider safely

1. Put the key in the environment (`.env.local` + Vercel). Add a **placeholder**
   line to `.env.example`. Do **not** prefix it with `NEXT_PUBLIC_`.
2. Create a wrapper in `lib/` that starts with `import "server-only";` and reads
   the key from `process.env` inside the function (not at module top-level, so a
   missing key at build time doesn't crash the build).
3. Expose it only through a route handler or server action that:
   - calls `requireUserId()` (or the route's auth check) first — return `401` if
     unauthenticated;
   - rate-limits AI/expensive calls via `allowRequest(userId)`;
   - validates and size-limits the request body (return `400` if too large);
   - catches errors and returns a **generic** message — never `error.stack` or
     the raw provider response (those can carry keys or internal config). Log the
     detail server-side only.
4. If the provider needs a *publishable* client token, surface just that token
   (never the secret) through a dedicated config function, mirroring
   `paddleConfig()`.

## How to test that secrets aren't exposed

```bash
# 1. No NEXT_PUBLIC secrets anywhere.
git grep -nE "NEXT_PUBLIC_[A-Z_]*(SECRET|KEY|TOKEN|PASSWORD|URL)"

# 2. No env files are tracked (only .env.example should appear).
git ls-files | grep -iE '\.env'

# 3. Secrets are only referenced in server files (lib/**, app/api/**, *.config.ts).
git grep -nE "DEEPSEEK_API_KEY|AUTH_GOOGLE_SECRET|AUTH_SECRET|DATABASE_URL"

# 4. Build, then confirm no secret value leaked into the client bundle.
npm run build
git grep -n "DEEPSEEK_API_KEY" .next/static 2>/dev/null   # must return nothing
```

A green run means: no `NEXT_PUBLIC_` secret, no committed `.env`, every secret
reference lives in a server module, and nothing sensitive is in the client bundle.
See also [`PRE_DEPLOY_SECURITY_CHECKLIST.md`](./PRE_DEPLOY_SECURITY_CHECKLIST.md).
