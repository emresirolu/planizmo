# Planizmo

A personal life-dashboard web app. This repository currently implements the
foundation — **Milestone 1 (scaffold + database)** and **Milestone 2 (auth,
app shell, themes)**. Widgets, streaks, AI, payments and PWA are not built yet.

## Stack

- **Next.js (App Router) + TypeScript** — deployed on Vercel
- **Neon serverless Postgres** via `@neondatabase/serverless`
- **Drizzle ORM** for schema, migrations and queries
- **Auth.js (NextAuth v5)** — Google provider (+ optional email magic link),
  Drizzle adapter, database sessions persisted in Neon
- **Tailwind CSS v4** driven by CSS custom properties (design tokens)

Authorization is enforced in the **app layer**, not the database. There is no
RLS: every user-owned read/write goes through `lib/db/scoped.ts`, which derives
the `user_id` filter from the authenticated session — the client never supplies
an id.

## Environment variables

Create `.env.local` (Vercel CLI may have already created it with `DATABASE_URL`).
See [`.env.example`](./.env.example) for the full template.

| Variable             | Required | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`       | ✅       | Neon Postgres connection string                          |
| `AUTH_SECRET`        | ✅       | Auth.js session secret (`npx auth secret`)               |
| `AUTH_GOOGLE_ID`     | ✅       | Google OAuth client id                                   |
| `AUTH_GOOGLE_SECRET` | ✅       | Google OAuth client secret                               |
| `AUTH_EMAIL_SERVER`  | optional | SMTP URL — enables email magic-link sign-in when set     |
| `AUTH_EMAIL_FROM`    | optional | From address for magic-link emails                       |

Google OAuth redirect URIs to register:

- `http://localhost:3000/api/auth/callback/google` (local)
- `https://<your-domain>/api/auth/callback/google` (production / preview)

## Getting started

```bash
npm install

# generate the SQL migration from the Drizzle schema
npm run db:generate

# apply it to Neon
npm run db:migrate

# run the app
npm run dev
```

Open http://localhost:3000. You'll be sent to the sign-in page; "Continue with
Google" creates your user, a matching `profiles` row, and a database session in
Neon, then lands you on the dashboard shell.

## Database migrations

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm run db:generate` | Generate a SQL migration in `./drizzle` from the schema |
| `npm run db:migrate`  | Apply pending migrations to Neon                        |
| `npm run db:push`     | Push the schema directly (no migration files)           |
| `npm run db:studio`   | Open Drizzle Studio                                     |

The schema (`lib/db/schema.ts`) defines the Auth.js adapter tables (`users`,
`accounts`, `sessions`, `verification_token`) plus the application tables:
`profiles`, `widgets`, `logs`, `streaks`, `goals`, `integrations`,
`subscriptions`, `layouts`. Every application table carries `user_id`
referencing `users.id`.

## Themes

Five themes — **cloud, noir, peach, matcha, mono** — are CSS-variable token sets
in `app/globals.css`, applied via `data-theme` on `<html>`. The accent color is
independent and applied as an inline `--accent`. Both are read server-side from
the user's profile so they render without a flash on first paint and follow the
user across devices. Switching in Settings is optimistic (instant) and persisted
to Neon.

## Deployment

The repo is connected to Vercel for auto-deploy. Pushing to `main` (or opening a
PR) produces a deployment. Ensure `DATABASE_URL`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in the Vercel project, and that
the production callback URL is registered in Google Cloud.
