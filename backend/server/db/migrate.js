// Creates the local database, applies migrations in order, creates the student-scoped role, and seeds
// reference data. Safe to run repeatedly. `--reset` drops and recreates the database first.
//   npm run migrate        npm run migrate:reset
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import pg from "pg";
import { config, ROOT, REPO } from "../src/config.js";

const SCHEMA = path.join(REPO, "backend", "schema");
const MIGRATIONS = [
  ["000_local_auth_shim", path.join(ROOT, "db", "000_local_auth_shim.sql")],
  ["001_schema", path.join(SCHEMA, "schema.sql")],
  ["002_taxonomy_and_rls", path.join(SCHEMA, "migrations", "002_taxonomy_and_rls.sql")],
  ["003_server", path.join(ROOT, "db", "003_server.sql")],
];

const reset = process.argv.includes("--reset");

async function ensureDatabase() {
  const maint = new pg.Client({ connectionString: config.adminDatabaseUrl.replace(`/${config.dbName}`, "/postgres") });
  await maint.connect();
  if (reset) {
    await maint.query(`drop database if exists ${pg.escapeIdentifier(config.dbName)} with (force)`);
    console.log(`Dropped ${config.dbName}`);
  }
  const { rowCount } = await maint.query("select 1 from pg_database where datname = $1", [config.dbName]);
  if (!rowCount) {
    await maint.query(`create database ${pg.escapeIdentifier(config.dbName)}`);
    console.log(`Created ${config.dbName}`);
  }
  await maint.end();
}

async function applyMigrations(db) {
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  for (const [name, file] of MIGRATIONS) {
    const done = await db.query("select 1 from schema_migrations where name = $1", [name]);
    if (done.rowCount) continue;
    await db.query("begin");
    try {
      await db.query(fs.readFileSync(file, "utf8"));
      await db.query("insert into schema_migrations (name) values ($1)", [name]);
      await db.query("commit");
      console.log(`Applied ${name}`);
    } catch (e) {
      await db.query("rollback");
      throw new Error(`${name} failed: ${e.message}`);
    }
  }
}

async function ensureAppRole(db) {
  const role = pg.escapeIdentifier(config.appDbUser);
  const exists = await db.query("select 1 from pg_roles where rolname = $1", [config.appDbUser]);
  const verb = exists.rowCount ? "alter" : "create";
  await db.query(`${verb} role ${role} login nobypassrls password ${pg.escapeLiteral(config.appDbPassword)}`);
  await db.query(`grant usage on schema public, auth to ${role}`);
  await db.query(`grant execute on all functions in schema auth to ${role}`);
  // Student-owned data: read and write, limited to the student's own rows by RLS.
  await db.query(`grant select, insert, update, delete on profiles, applications, approvals, user_interests to ${role}`);
  // Reference data and server-written tables: read only.
  await db.query(`grant select on users, categories, posting_categories, postings, schools, majors, usage_events, jobs, purchases to ${role}`);
  await db.query(`grant usage on all sequences in schema public to ${role}`);
}

function loadFrontEndData() {
  const src = fs.readFileSync(path.join(REPO, "frontend", "site", "js", "data.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox);
  return sandbox.window.LAN;
}

async function seed(db) {
  const cats = await db.query("select count(*)::int as n from categories");
  if (!cats.rows[0].n) {
    await db.query(fs.readFileSync(path.join(SCHEMA, "seed_categories.sql"), "utf8"));
    console.log("Seeded categories");
  }
  const LAN = loadFrontEndData();
  await db.query("insert into majors (name) select unnest($1::text[]) on conflict (name) do nothing", [LAN.majors]);
  await db.query("insert into schools (name) select unnest($1::text[]) on conflict (name) do nothing", [LAN.schools]);

  // Demo postings. Each links to the built-in test job site so the full fill, review and submit
  // cycle can run locally without touching a real employer.
  for (const p of LAN.postings) {
    const id = `demo-${p.id}`;
    const deadline = new Date(Date.now() + p.deadlineIn * 864e5).toISOString().slice(0, 10);
    await db.query(
      `insert into postings (id, company, role, location, mode, category, deadline, link, ats, source, opportunity_type, paid, term)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'demo',$10,$11,'Summer 2027')
       on conflict (id) do update set deadline = excluded.deadline, link = excluded.link`,
      [id, p.company, p.role, p.location, p.mode, p.category, deadline, `${config.publicUrl}/mock-ats/jobs/${id}`,
        "test form", p.type === "Co-op" ? "co_op" : "internship", p.pay === "Unpaid" ? "no" : "yes"]);
    await db.query(
      `insert into posting_categories (posting_id, category_id)
       select $1, id from categories where name = $2 and parent_id is null on conflict do nothing`, [id, p.category]);
  }
  console.log(`Seeded ${LAN.majors.length} majors, ${LAN.schools.length} schools, ${LAN.postings.length} demo postings`);
}

await ensureDatabase();
const db = new pg.Client({ connectionString: config.adminDatabaseUrl });
await db.connect();
try {
  await applyMigrations(db);
  await ensureAppRole(db);
  await seed(db);
  console.log("Database ready.");
} finally {
  await db.end();
}
