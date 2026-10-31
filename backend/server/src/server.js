// AutoInterns API server. Serves the API under /api, the front-end pages, and (outside production)
// the local test job site under /mock-ats.
//   npm start            then open http://localhost:8787
import express from "express";
import Layer from "express/lib/router/layer.js";
import path from "node:path";
import { config, REPO, isProduction } from "./config.js";
import { loadUser, sameOrigin } from "./auth.js";
import { account } from "./routes/account.js";
import { profile } from "./routes/profile.js";
import { postings } from "./routes/postings.js";
import { applications } from "./routes/applications.js";
import { mockAts } from "../mock-ats/mock-ats.js";

// Express 4 doesn't pass rejected promises from async handlers to the error handler. This does.
const handle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (req, res, next) {
  if (this.handle.length > 3) return handle.call(this, req, res, next);
  try {
    const out = this.handle(req, res, next);
    if (out && typeof out.catch === "function") out.catch(next);
  } catch (e) { next(e); }
};

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use((_req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" });
  next();
});

app.use("/api", express.json({ limit: "200kb" }), loadUser, sameOrigin, account, profile, postings, applications);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

if (!isProduction) app.use("/mock-ats", mockAts);

const frontend = path.join(REPO, "frontend");
app.get("/", (_req, res) => res.redirect("/autointerns/index.html"));
app.use(express.static(frontend, { extensions: ["html"] }));

app.use((err, req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "That file is too large. The limit is 5 MB." });
  console.error(`${req.method} ${req.path}`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong on our side. Try again in a minute." });
});

app.listen(config.port, () => {
  console.log(`AutoInterns running at ${config.publicUrl}`);
  console.log(`  Sign up:  ${config.publicUrl}/site/login.html`);
  if (!isProduction) console.log(`  Test job site: ${config.publicUrl}/mock-ats/jobs/demo-p0`);
});
