/**
 * Seed a believable, immediately-explorable demo account. Idempotent: clears the
 * target user's data and rebuilds it deterministically.
 *
 *   node scripts/seed-demo.mjs            # seeds DEMO_EMAIL, else the first user
 *
 * Targets DATABASE_URL from the environment (.env.local for dev). To seed
 * production, run with the production DATABASE_URL exported.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const DEMO_EMAIL = process.env.DEMO_EMAIL || null;

const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const mondayOf = (d) => { const t = new Date(d + "T00:00:00Z"); const dow = (t.getUTCDay() + 6) % 7; return addDays(d, -dow); };
const weekdayName = (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(d + "T00:00:00Z").getUTCDay()];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const r01 = (k) => hash(k) / 4294967296;

const today = new Date().toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();

// ---- resolve target user ----
let user;
if (DEMO_EMAIL) {
  [user] = await sql`select id from users where email=${DEMO_EMAIL}`;
  if (!user) [user] = await sql`insert into users (id,email,name) values (gen_random_uuid()::text,${DEMO_EMAIL},'Demo') returning id`;
} else {
  [user] = await sql`select id from users order by 1 limit 1`;
  if (!user) [user] = await sql`insert into users (id,email,name) values (gen_random_uuid()::text,'demo@planizmo.app','Demo') returning id`;
}
const uid = user.id;
console.log("Seeding demo data for user:", uid);

// ---- idempotent reset ----
await sql`delete from assistant_messages where user_id=${uid}`;
await sql`delete from week_plans where user_id=${uid}`;
await sql`delete from goals where user_id=${uid}`;
await sql`delete from widgets where user_id=${uid}`; // cascades logs/checklist/streaks/time_blocks/tasks

// ---- profile (Pro so every feature is explorable) ----
await sql`insert into profiles (user_id, display_name, timezone, theme, accent_color, plan, view_mode)
  values (${uid},'Alondra','America/Los_Angeles','cloud','#4F6BED','pro','flow')
  on conflict (user_id) do update set display_name='Alondra', theme='cloud', accent_color='#4F6BED', plan='pro'`;

// ---- widgets ----
async function widget(type, title, icon, schedule, target, unit, size, pos) {
  const [w] = await sql`insert into widgets (user_id,type,title,icon,schedule,target,unit,size,source,position)
    values (${uid},${type},${title},${icon},${schedule},${target},${unit},${size},'manual',${pos}) returning id`;
  return w.id;
}
const water = await widget("counter", "Water", "water", "daily", 8, "glasses", "1x1", 0);
const gym = await widget("habit", "Gym", "gym", "times_per_week", 4, null, "1x1", 1);
const sleep = await widget("health", "Sleep", "sleep", "daily", 8, "hours", "2x1", 2);
const steps = await widget("health", "Steps", "steps", "daily", 8000, "steps", "2x1", 3);
const reading = await widget("reading", "Reading", "reading", "daily", 20, "pages", "1x1", 4);
const mood = await widget("mood", "Mood", "mood", "daily", null, null, "1x1", 5);
const routine = await widget("checklist", "Morning routine", "checklist", "daily", null, null, "2x2", 6);
const tasksW = await widget("tasks", "Tasks", "tasks", "daily", null, null, "2x2", 7);

// ---- checklist items ----
const items = [];
for (const [i, label] of ["Make bed", "Stretch", "Journal", "No phone first hour"].entries()) {
  const [it] = await sql`insert into checklist_items (user_id,widget_id,label,position) values (${uid},${routine},${label},${i}) returning id`;
  items.push(it.id);
}

// ---- ~60 days of deterministic logs ----
async function log(widgetId, date, value, completed) {
  await sql`insert into logs (user_id,widget_id,date,value,completed) values (${uid},${widgetId},${date},${value == null ? null : String(value)},${completed})
    on conflict (widget_id,date) do update set value=${value == null ? null : String(value)}, completed=${completed}`;
}
for (let k = 0; k < 60; k++) {
  const d = addDays(today, -k);
  const w = 5 + Math.round(r01(uid + d + "w") * 4); // 5..9 glasses
  await log(water, d, w, w >= 8);
  const sh = Math.round((6 + r01(uid + d + "s") * 2.5) * 10) / 10;
  await log(sleep, d, sh, sh >= 8);
  const st = Math.round((5000 + r01(uid + d + "p") * 7000) / 10) * 10;
  await log(steps, d, st, st >= 8000);
  const pg = Math.round(r01(uid + d + "r") * 28);
  await log(reading, d, pg, pg >= 20);
  if (r01(uid + d + "m") > 0.15) await log(mood, d, 2 + Math.round(r01(uid + d + "mv") * 3), true);
  if (r01(uid + d + "g") > 0.45) await log(gym, d, null, true); // ~ a few sessions a week
  // checklist: most days most items ticked
  for (const it of items) {
    if (r01(uid + d + it) > 0.3) {
      await sql`insert into checklist_logs (user_id,widget_id,item_id,date,completed) values (${uid},${routine},${it},${d},true)
        on conflict (item_id,date) do update set completed=true`;
    }
  }
}

// ---- tasks with due dates ----
const taskRows = [
  ["Email the dentist", addDays(today, -1)],
  ["Finish landing page copy", today],
  ["Grocery run", today],
  ["Book flights", addDays(today, 3)],
  ["Review quarterly budget", addDays(today, 6)],
];
for (const [i, [title, due]] of taskRows.entries()) {
  await sql`insert into tasks (user_id,widget_id,title,due_date,completed,position) values (${uid},${tasksW},${title},${due},false,${i})`;
}

// ---- goals ----
const goalRows = [
  ["Launch Phoenix v1", "rocket", "Finalize landing page copy", 75],
  ["Build strength consistently", "gym", "Upper-body workout today", 60],
  ["Save for Italy trip", "bank", "Review the monthly budget", 40],
];
for (const [i, [title, icon, next, pct]] of goalRows.entries()) {
  await sql`insert into goals (user_id,title,icon,next_step,progress_pct,status,position) values (${uid},${title},${icon},${next},${pct},'active',${i})`;
}

// ---- an approved weekly plan (current week) ----
const wkStart = mondayOf(today);
const planDays = Array.from({ length: 7 }, (_, i) => {
  const date = addDays(wkStart, i);
  const isWeekday = i < 5;
  const dayItems = [
    { id: uuid(), kind: "habit", title: "Water", ref_widget_id: water, due_date: null, rationale: "Stay hydrated." },
    ...(isWeekday ? [{ id: uuid(), kind: "habit", title: "Reading", ref_widget_id: reading, due_date: null, rationale: "20 pages keeps the streak." }] : []),
    ...(i === 1 || i === 3 || i === 5 ? [{ id: uuid(), kind: "habit", title: "Gym", ref_widget_id: gym, due_date: null, rationale: "Toward your weekly goal." }] : []),
  ];
  return { date, weekday: weekdayName(date), summary: dayItems.length ? `${dayItems.length} to keep the rhythm.` : "A lighter day.", items: dayItems };
});
await sql`insert into week_plans (user_id,week_start,brain_dump_text,plan_json,status,approved_at)
  values (${uid},${wkStart},${"gym 3x, ship landing page, read nightly"},${JSON.stringify({ week_start: wkStart, days: planDays })}::jsonb,'approved',now())`;

// ---- rail chat history + today's summary ----
const chat = [
  ["assistant", { op: "summary", date: today }, "Morning, Alondra. You've moved every day this week and your sleep is trending up — a focus-heavy morning suits you. Today: a short gym session puts you one away from your weekly goal."],
  ["user", { op: "chat", date: today }, "Can you plan my day around a workout and two focus blocks?"],
  ["assistant", { op: "chat", date: today }, "Done — deep work first this morning, client follow-ups after lunch, and your workout at 3pm when the day opens up. That also nudges Launch Phoenix forward."],
  ["user", { op: "chat", date: today }, "Add high-protein groceries to a list."],
  ["assistant", { op: "chat", date: today }, "Added chicken breast, Greek yogurt, eggs, spinach and oats to your grocery list."],
];
for (const [role, ctx, content] of chat) {
  await sql`insert into assistant_messages (user_id,role,content,context_json) values (${uid},${role},${content},${JSON.stringify(ctx)}::jsonb)`;
}

console.log("✓ demo seed complete — widgets, ~60d logs, sleep/steps, approved week plan, goals, chat.");
