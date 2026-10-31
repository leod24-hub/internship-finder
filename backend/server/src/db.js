import pg from "pg";
import { config } from "./config.js";

// Server-role pool: accounts, sessions, shared postings, the job queue. Bypasses RLS, so never
// run a query here on behalf of a student without filtering by their user_id.
export const admin = new pg.Pool({ connectionString: config.adminDatabaseUrl, max: 10 });

// Student pool: connects as a role without BYPASSRLS. asUser() sets app.user_id for one
// transaction, so every policy in schema.sql / 002 limits the queries to that student's rows.
const app = new pg.Pool({ connectionString: config.appDatabaseUrl, max: 10 });

export async function asUser(userId, fn) {
  const client = await app.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function closePools() {
  await Promise.all([admin.end(), app.end()]);
}
