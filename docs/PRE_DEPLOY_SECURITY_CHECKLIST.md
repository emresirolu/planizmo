# Pre-deploy security checklist

Run through this before every push/deploy. Most steps are one command; the whole
pass takes a couple of minutes. See [`SECURITY.md`](./SECURITY.md) for the why.

## 1. Build is clean

```bash
npm run build
```

Must succeed. `server-only` modules imported from a client component fail here —
that failure is a leak caught early, not a nuisance.

## 2. No `NEXT_PUBLIC_` secrets

```bash
git grep -nE "NEXT_PUBLIC_[A-Z_]*(SECRET|KEY|TOKEN|PASSWORD|URL)"
```

Expected: **no matches.** Anything with `NEXT_PUBLIC_` ships to the browser.

## 3. No `.env` files committed

```bash
git ls-files | grep -iE '\.env'
```

Expected: **only `.env.example`.** If a real `.env*` shows up, remove it from the
index (`git rm --cached <file>`) and rotate anything that was exposed.

## 4. Secrets not in the client bundle

```bash
git grep -n "DEEPSEEK_API_KEY\|AUTH_GOOGLE_SECRET\|AUTH_SECRET" .next/static 2>/dev/null
```

Expected: **no matches** (run after `npm run build`).

## 5. AI routes are server-only

- `lib/assistant/deepseek.ts` starts with `import "server-only";`.
- DeepSeek is called only from `app/api/**` and server `lib/**` modules — never
  from a `"use client"` component.

```bash
git grep -nl "deepseek" -- 'components/**' 'app/**/*.tsx'   # expect: nothing
```

## 6. Auth checks on private routes

Every private route returns **401** when unauthenticated. Confirm each of these
calls `requireUserId()` (or `auth()` + a 401 guard) before doing work:

`operator`, `think`, `review`, `insights`, `assistant`, `plan-week`,
`calendar/plan`, `goals/breakdown`, `gym/coach`, `ai-setup`, `account/export`,
and the `resetDaybookAction` / `deleteAccountAction` server actions (scoped via
`requireUserId()`).

```bash
# Quick audit — every route file below should reference requireUserId or auth().
git grep -nL "requireUserId\|auth()" -- 'app/api/{operator,think,review,insights,assistant,plan-week,calendar,goals,gym,ai-setup,account}/**/route.ts'
```

Cron routes (`app/api/cron/*`) are protected by `CRON_SECRET`, and the Paddle
webhook by `PADDLE_WEBHOOK_SECRET` (signature-verified) — not by user auth.

## 7. User-ownership enforced

- No route reads `user_id` from the request body.
- All user-owned reads/writes go through `lib/db/scoped.ts` (which injects the
  session user id). Feature code must not `import { db }` directly to touch
  user-owned rows.

```bash
git grep -nE "body\.(user_?[Ii]d)|req\.\w+\.user_?[Ii]d" -- 'app/**' 'lib/**'  # expect: nothing
```

## 8. Rate limits in place

Every AI route calls `allowRequest(userId)` and returns **429** when over budget
(20 req/hour/user, with a burst guard — see `lib/assistant/ratelimit.ts`).

```bash
git grep -nL "allowRequest" -- 'app/api/{operator,think,review,insights,assistant,plan-week,calendar,goals,gym,ai-setup}/**/route.ts'
```

## 9. Request size limits

Prompt/body caps reject oversized input with a **400** (e.g. talk-to-log 600,
think 2000, plan-week brain dump 4000, ai-setup description 200). Review uses
**summarized** metrics, not raw logs.

## 10. Error handling doesn't leak internals

No route returns `error.stack`, `error.message` from a provider, or raw provider
JSON. Failures return a generic message; details are logged server-side only.

```bash
git grep -nE "error\.stack|\.message\s*\}\)" -- 'app/**' 'lib/**'   # review any hits
```

## 11. Privacy & terms pages exist

`app/privacy/` and `app/terms/` are present and linked from the footer / account
screen.

---

**If any step fails:** fix it before deploying. If a secret was exposed at any
point (committed, logged, or shipped to the client), rotate it — see
[`SECURITY.md` → How to rotate a key](./SECURITY.md#how-to-rotate-a-key).
