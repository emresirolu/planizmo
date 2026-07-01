import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  profiles,
} from "@/lib/db/schema";
import { DEFAULT_ACCENT, DEFAULT_THEME } from "@/lib/theme/themes";
import { ensureReferralCode } from "@/lib/referrals/allocate";

const providers: NextAuthConfig["providers"] = [
  // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
  Google,
];

// Email (magic link) sign-in is optional: only enabled when SMTP is configured.
if (process.env.AUTH_EMAIL_SERVER && process.env.AUTH_EMAIL_FROM) {
  providers.push(
    Nodemailer({
      server: process.env.AUTH_EMAIL_SERVER,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    // On first sign-in (adapter creates the user) create a matching profile row.
    async createUser({ user }) {
      if (!user.id) return;
      await db
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: user.name ?? null,
          theme: DEFAULT_THEME,
          accentColor: DEFAULT_ACCENT,
        })
        .onConflictDoNothing();
      // Give every new profile a referral code (best-effort — never block sign-up).
      try {
        await ensureReferralCode(user.id);
      } catch {
        /* backfilled lazily on first Settings visit if this fails */
      }
    },
  },
});
