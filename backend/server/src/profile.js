// Reads and writes a student's profile. Phone and address are encrypted with pgcrypto.
import { config } from "./config.js";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// "May 2028", "5/2028", "2028-05" -> "2028-05-01"
export function parseGradDate(text) {
  const s = String(text || "").trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const i = MONTHS.findIndex(x => x.startsWith(m[1].slice(0, 3)));
    if (i >= 0) return `${m[2]}-${String(i + 1).padStart(2, "0")}-01`;
  }
  m = s.match(/^(\d{1,2})\s*[/-]\s*(\d{4})$/) || s.match(/^(\d{4})-(\d{1,2})/);
  if (m) {
    const [y, mo] = m[1].length === 4 ? [m[1], m[2]] : [m[2], m[1]];
    if (+mo >= 1 && +mo <= 12) return `${y}-${String(mo).padStart(2, "0")}-01`;
  }
  m = s.match(/^(\d{4})$/);
  if (m) return `${m[1]}-05-01`;
  return undefined; // not understood
}

export function formatGradDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const name = MONTHS[date.getUTCMonth()];
  return `${name[0].toUpperCase()}${name.slice(1)} ${date.getUTCFullYear()}`;
}

// The profile as the pages and the worker use it.
export async function loadProfile(client, userId) {
  const { rows } = await client.query(
    `select p.*, u.email, u.plan, u.timezone,
            case when p.phone_enc is null then null else pgp_sym_decrypt(p.phone_enc, $2) end as phone,
            case when p.address_enc is null then null else pgp_sym_decrypt(p.address_enc, $2) end as address_json
       from users u left join profiles p on p.user_id = u.id where u.id = $1`, [userId, config.encryptionKey]);
  const p = rows[0];
  if (!p) return null;
  let address = {};
  try { address = p.address_json ? JSON.parse(p.address_json) : {}; } catch { address = {}; }
  const t = p.targets || {};
  const interests = await client.query(
    `select c.name, c.parent_id, parent.name as parent_name, i.priority
       from user_interests i join categories c on c.id = i.category_id
       left join categories parent on parent.id = c.parent_id
      where i.user_id = $1 order by c.sort_order`, [userId]);
  return {
    email: p.email,
    plan: p.plan,
    timezone: p.timezone,
    name: p.legal_name || "",
    preferredName: p.preferred_name || "",
    phone: p.phone || "",
    address,
    school: p.school || "",
    major: p.major || "",
    minor: p.minor || "",
    degree: p.degree || "",
    classYear: p.class_year || "",
    grad: formatGradDate(p.grad_date),
    gpa: p.gpa == null ? "" : String(Number(p.gpa)),
    auth: p.work_auth || "",
    needsSponsorship: p.needs_sponsorship,
    li: p.linkedin || "",
    site: p.website || "",
    eeoDecline: !p.eeo_opt_in,
    types: t.types || ["Internship"],
    modes: p.preferred_modes?.length ? p.preferred_modes : ["remote", "hybrid", "onsite"],
    where: (p.preferred_locations || []).join(", "),
    term: t.term || "Summer 2027",
    pay: t.pay || "any",
    fieldDetails: p.category_data || {},
    resumeName: p.resume_filename || "",
    hasResumeText: Boolean(p.resume_text),
    resumeText: p.resume_text || "",
    resumePath: p.resume_url || "",
    fields: interests.rows.filter(r => !r.parent_id).map(r => ({ name: r.name, top: r.priority === 1 })),
    subfields: interests.rows.filter(r => r.parent_id).map(r => ({ parent: r.parent_name, name: r.name })),
  };
}

const clean = (v, max = 300) => (v == null ? null : String(v).trim().slice(0, max) || null);

// Validates a profile update from the onboarding page. Returns { values } or { error }.
export function readProfileInput(body) {
  const b = body || {};
  const grad = parseGradDate(b.grad);
  if (grad === undefined) return { error: 'Enter your graduation date like "May 2028".' };
  let gpa = null;
  if (b.gpa !== undefined && String(b.gpa).trim() !== "") {
    gpa = Number(b.gpa);
    if (!Number.isFinite(gpa) || gpa < 0 || gpa > 5) return { error: "Enter your GPA as a number, like 3.6." };
  }
  const classYear = ["freshman", "sophomore", "junior", "senior", "grad"].includes(b.classYear) ? b.classYear : null;
  const auth = clean(b.auth, 120);
  const list = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean).slice(0, 20);
  const address = {
    street: clean(b.address?.street, 200) || "", city: clean(b.address?.city, 100) || "",
    state: clean(b.address?.state, 60) || "", zip: clean(b.address?.zip, 20) || "", country: clean(b.address?.country, 60) || "United States",
  };
  return {
    values: {
      legal_name: clean(b.name, 120), preferred_name: clean(b.preferredName, 60),
      phone: clean(b.phone, 40), address: JSON.stringify(address),
      school: clean(b.school, 200), major: clean(b.major, 120), minor: clean(b.minor, 120), degree: clean(b.degree, 80),
      class_year: classYear, grad_date: grad, gpa,
      work_auth: auth, needs_sponsorship: auth ? /need sponsorship|will need/i.test(auth) : null,
      linkedin: clean(b.li, 300), website: clean(b.site, 300),
      eeo_opt_in: b.eeoDecline === false,
      preferred_modes: list(b.modes).filter(m => ["remote", "hybrid", "onsite"].includes(m)),
      preferred_locations: list(b.where),
      targets: JSON.stringify({ types: list(b.types), term: clean(b.term, 40) || "Summer 2027", pay: clean(b.pay, 20) || "any" }),
      category_data: JSON.stringify(b.fieldDetails && typeof b.fieldDetails === "object" ? b.fieldDetails : {}),
    },
  };
}

export async function saveProfile(client, userId, v) {
  await client.query(
    `insert into profiles (user_id) values ($1) on conflict (user_id) do nothing`, [userId]);
  await client.query(
    `update profiles set
        legal_name = $2, preferred_name = $3,
        phone_enc = case when $4::text is null then null else pgp_sym_encrypt($4::text, $5) end,
        address_enc = pgp_sym_encrypt($6::text, $5),
        school = $7, major = $8, minor = $9, degree = $10, class_year = $11, grad_date = $12, gpa = $13,
        work_auth = $14, needs_sponsorship = $15, linkedin = $16, website = $17, eeo_opt_in = $18,
        preferred_modes = $19, preferred_locations = $20, targets = $21::jsonb, category_data = $22::jsonb,
        updated_at = now()
      where user_id = $1`,
    [userId, v.legal_name, v.preferred_name, v.phone, config.encryptionKey, v.address, v.school, v.major, v.minor, v.degree,
      v.class_year, v.grad_date, v.gpa, v.work_auth, v.needs_sponsorship, v.linkedin, v.website, v.eeo_opt_in,
      v.preferred_modes, v.preferred_locations, v.targets, v.category_data]);
}
