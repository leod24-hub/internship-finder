// Local email + password accounts with server-side sessions.
// Passwords are hashed with scrypt; the session cookie holds a random token whose sha256 is stored.
import crypto from "node:crypto";
import { promisify } from "node:util";
import { admin } from "./db.js";
import { config, isProduction } from "./config.js";

const scrypt = promisify(crypto.scrypt);
const COOKIE = "ai_session";

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, "base64"), 64);
  const expected = Buffer.from(hash, "base64");
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");

export async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.sessionDays * 864e5);
  await admin.query("insert into sessions (token_hash, user_id, expires_at) values ($1,$2,$3)", [sha256(token), userId, expires]);
  res.setHeader("Set-Cookie", cookie(token, config.sessionDays * 86400));
}

export async function endSession(req, res) {
  const token = readCookie(req);
  if (token) await admin.query("delete from sessions where token_hash = $1", [sha256(token)]);
  res.setHeader("Set-Cookie", cookie("", 0));
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction ? "; Secure" : ""}`;
}

function readCookie(req) {
  const header = req.headers.cookie || "";
  const m = header.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

// Attaches req.user when the session is valid. Use requireUser on routes that need it.
export async function loadUser(req, _res, next) {
  try {
    const token = readCookie(req);
    if (token) {
      const { rows } = await admin.query(
        `select u.id, u.email, u.plan from sessions s join users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now()`, [sha256(token)]);
      if (rows[0]) req.user = rows[0];
    }
    next();
  } catch (e) { next(e); }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Log in to continue." });
  next();
}

// Blocks cross-site form posts: state-changing requests must come from this site's own pages.
export function sameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== new URL(config.publicUrl).origin && origin !== `http://${req.headers.host}`) {
    return res.status(403).json({ error: "This request didn't come from the AutoInterns site." });
  }
  next();
}

// A small in-memory limiter for login and sign-up attempts.
const attempts = new Map();
export function limitAttempts(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(t => now - t < 15 * 60e3);
  if (recent.length >= 20) return res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
  recent.push(now);
  attempts.set(key, recent);
  next();
}
