import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  // Not fatal at module load: `next build` imports this module (to collect page
  // data) without running any query, and the build environment may not expose
  // DATABASE_URL. We warn and fall back to a placeholder so the real Drizzle
  // client is still constructed (the Auth.js adapter inspects it at build) —
  // the real connection string is read from the environment at request time.
  console.warn(
    "[db] DATABASE_URL is not set; using a placeholder. Queries will fail until it is provided.",
  );
}

const sql = neon(url ?? "postgresql://placeholder:placeholder@localhost/placeholder");

export const db = drizzle(sql, { schema });

export type DB = typeof db;
