// Reading a posting from a link a student pastes: which application system it uses, and its title.
import dns from "node:dns/promises";
import net from "node:net";
import { config } from "./config.js";

const ATS = [
  [/greenhouse\.io$/, "greenhouse"], [/lever\.co$/, "lever"], [/myworkdayjobs\.com$|workday\.com$/, "workday"],
  [/icims\.com$/, "icims"], [/smartrecruiters\.com$/, "smartrecruiters"], [/ashbyhq\.com$/, "ashby"],
  [/successfactors\.(com|eu)$|sapsf\.com$/, "successfactors"], [/taleo\.net$|oraclecloud\.com$/, "oracle"],
  [/joinhandshake\.com$/, "handshake"], [/linkedin\.com$/, "linkedin"], [/indeed\.com$/, "indeed"],
  [/ultipro\.com$|ukg\.com$/, "ukg"], [/adp\.com$/, "adp"], [/eightfold\.ai$/, "eightfold"],
];
// Sites where students must sign in or where automation isn't allowed. We prepare answers; the student submits.
export const HANDS_OFF = new Set(["workday", "icims", "successfactors", "oracle", "handshake", "linkedin", "indeed", "ukg", "adp", "eightfold"]);

export function detectAts(url) {
  const host = new URL(url).hostname;
  if (url.includes("/mock-ats/")) return "test form";
  return (ATS.find(([re]) => re.test(host)) || [null, "company site"])[1];
}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) return ip === "::1" || /^f[cd]|^fe80/i.test(ip) || ip.startsWith("::ffff:127.");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// Validates a pasted link. Returns a URL or throws an Error with a message for the student.
export async function checkLink(raw) {
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error("That doesn't look like a link. Copy the full address of the posting."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use a link that starts with http or https.");
  const { address } = await dns.lookup(url.hostname).catch(() => ({ address: null }));
  if (!address) throw new Error("We couldn't find that site. Check the link and try again.");
  if (isPrivateIp(address) && !config.allowLocalLinks) throw new Error("That link points to a private network address.");
  return url;
}

// Best-effort title and company from the posting page. Never throws.
export async function readPosting(url) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 AutoInterns" } });
    const html = (await res.text()).slice(0, 400000);
    const meta = name => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)`, "i")) || [])[1];
    const title = (meta("og:title") || (html.match(/<title[^>]*>([^<]+)/i) || [])[1] || "").trim();
    const site = (meta("og:site_name") || "").trim();
    const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
    let role = decode(title), company = decode(site);
    const split = role.match(/^(.+?)\s+(?:at|@|-|–|\|)\s+(.+?)$/);
    if (split) { role = split[1]; company = company || split[2]; }
    return { role: role.slice(0, 160), company: company.slice(0, 120) };
  } catch {
    return { role: "", company: "" };
  }
}
