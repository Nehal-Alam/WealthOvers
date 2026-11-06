import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// On serverless Vercel runtime and local dev, prevent long-lived connection exhaustion
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client =
  globalForDb.conn ??
  (connectionString
    ? postgres(connectionString, {
        prepare: false,
        max: 1,
        idle_timeout: 10,
        connect_timeout: 10,
      })
    : null);

if (process.env.NODE_ENV !== "production" && client) {
  globalForDb.conn = client;
}

export const db = client ? drizzle(client, { schema }) : null;

