import { admin } from "./db.js";
import { config } from "./config.js";

export async function usageThisMonth(userId) {
  const { rows } = await admin.query(
    `select count(*)::int as n from usage_events
      where user_id = $1 and kind = 'application_filled' and at >= date_trunc('month', now())`, [userId]);
  return rows[0].n;
}

// True when the student's plan has room for one more prepared application this month.
export async function canPrepare(user) {
  if (user.plan !== "free") return true;
  return (await usageThisMonth(user.id)) < config.freeMonthlyApplications;
}

export async function recordUsage(userId, kind) {
  await admin.query("insert into usage_events (user_id, kind) values ($1,$2)", [userId, kind]);
}
