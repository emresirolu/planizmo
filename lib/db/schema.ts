import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  date,
  uuid,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ============================================================
 * Auth.js (NextAuth v5) adapter tables
 * ==========================================================*/

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ============================================================
 * Enums
 * ==========================================================*/

export const planEnum = pgEnum("plan", ["free", "pro"]);
export const widgetTypeEnum = pgEnum("widget_type", [
  "habit",
  "counter",
  "mood",
  "health",
  "reading",
]);
export const scheduleEnum = pgEnum("schedule", [
  "daily",
  "weekdays",
  "times_per_week",
]);
export const widgetSizeEnum = pgEnum("widget_size", ["1x1", "2x1"]);
export const widgetSourceEnum = pgEnum("widget_source", ["manual", "fitbit"]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "fitbit",
  "google_health",
]);

/* ============================================================
 * Application tables — every table carries user_id -> users.id
 * ==========================================================*/

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("UTC"),
  theme: text("theme").notNull().default("cloud"),
  accentColor: text("accent_color").notNull().default("#4F6BED"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const widgets = pgTable("widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: widgetTypeEnum("type").notNull(),
  title: text("title").notNull(),
  icon: text("icon"),
  color: text("color"),
  schedule: scheduleEnum("schedule").notNull().default("daily"),
  target: integer("target"),
  unit: text("unit"),
  position: integer("position").notNull().default(0),
  size: widgetSizeEnum("size").notNull().default("1x1"),
  source: widgetSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const logs = pgTable(
  "logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    widgetId: uuid("widget_id")
      .notNull()
      .references(() => widgets.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: numeric("value"),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("logs_widget_date_unq").on(t.widgetId, t.date)],
);

export const streaks = pgTable("streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  widgetId: uuid("widget_id")
    .notNull()
    .references(() => widgets.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  strength: numeric("strength").notNull().default("0"),
  lastCompletedDate: date("last_completed_date"),
  freezesAvailable: integer("freezes_available").notNull().default(0),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  parsedJson: jsonb("parsed_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  paddleSubscriptionId: text("paddle_subscription_id"),
  status: text("status"),
  plan: planEnum("plan").notNull().default("free"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
});

export const layouts = pgTable("layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  layoutJson: jsonb("layout_json"),
});
