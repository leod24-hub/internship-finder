// Settings come from the environment, with local-development defaults.
// A .env file next to package.json is loaded if present (see .env.example).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO = path.resolve(ROOT, "..", "..");

const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const env = process.env;
const port = Number(env.PORT || 8787);

export const config = {
  port,
  publicUrl: env.PUBLIC_URL || `http://localhost:${port}`,
  dbName: env.DB_NAME || "autointerns_dev",
  // Owner connection: runs migrations and server-only writes (accounts, postings, jobs). Bypasses RLS.
  adminDatabaseUrl: env.DATABASE_URL || `postgres:///${env.DB_NAME || "autointerns_dev"}?host=/tmp`,
  // Student-scoped connection: every query runs with app.user_id set, so RLS limits it to one student.
  appDbUser: env.APP_DB_USER || "autointerns_app",
  appDbPassword: env.APP_DB_PASSWORD || "autointerns_dev",
  appDatabaseUrl: env.APP_DATABASE_URL || "",
  // Encrypts phone and address at rest (pgcrypto). Set a long random value outside local development.
  encryptionKey: env.APP_ENCRYPTION_KEY || "local-dev-only-change-me",
  storageDir: path.resolve(ROOT, env.STORAGE_DIR || "storage"),
  sessionDays: Number(env.SESSION_DAYS || 30),
  freeMonthlyApplications: Number(env.FREE_MONTHLY_APPLICATIONS || 3),
  // Lets students add posting links on localhost (the built-in test job site). Off in production.
  allowLocalLinks: env.ALLOW_LOCAL_LINKS ? env.ALLOW_LOCAL_LINKS === "1" : env.NODE_ENV !== "production",
  claudeModel: env.CLAUDE_MODEL || "claude-opus-5-5",
  headless: env.WORKER_HEADLESS !== "0",
};

if (!config.appDatabaseUrl) {
  const u = new URL(config.adminDatabaseUrl.replace(/^postgres:\/\/\//, "postgres://localhost/"));
  const host = u.searchParams.get("host");
  config.appDatabaseUrl = `postgres://${config.appDbUser}:${encodeURIComponent(config.appDbPassword)}@${host ? "localhost" : u.host}${u.pathname}${host ? `?host=${host}` : ""}`;
}

export const isProduction = env.NODE_ENV === "production";
if (isProduction && config.encryptionKey === "local-dev-only-change-me") {
  throw new Error("Set APP_ENCRYPTION_KEY before running in production.");
}
