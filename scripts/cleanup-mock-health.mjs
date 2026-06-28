/**
 * One-off cleanup: remove fabricated (mock) health data from real accounts.
 *
 * Deletes the auto-created mock Sleep/Steps health widgets (source != 'fitbit')
 * from every NON-demo account — which cascades their fabricated logs/streaks.
 * Real-provider data (widgets.source = 'fitbit') and the demo account are left
 * untouched. Idempotent / re-runnable.
 *
 *   DEMO_EMAIL=planizmo.demo@gmail.com node scripts/cleanup-mock-health.mjs
 *
 * Targets DATABASE_URL from the environment (export the prod URL to clean prod).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const DEMO_EMAIL = process.env.DEMO_EMAIL || null;

let demoId = null;
if (DEMO_EMAIL) {
  const [u] = await sql`select id from users where email=${DEMO_EMAIL}`;
  demoId = u?.id ?? null;
  console.log("demo account:", DEMO_EMAIL, demoId ? "(excluded)" : "(not found — nothing excluded)");
} else {
  console.log("DEMO_EMAIL not set — no account excluded (all mock health removed).");
}

const deleted = await sql`
  delete from widgets
  where type = 'health'
    and coalesce(source, 'manual') <> 'fitbit'
    and (lower(title) in ('sleep', 'steps') or unit in ('hours', 'steps'))
    and (${demoId}::text is null or user_id <> ${demoId})
  returning id`;

console.log(`✓ removed ${deleted.length} fabricated health widget(s) (logs cascaded). Real-provider + demo data untouched.`);
