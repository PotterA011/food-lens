import express from "express";
import crypto from "node:crypto";
import { query, hasDb } from "./db.mjs";

const COOKIE_NAME = "hl_sess";
const OAUTH_STATE_COOKIE = "hl_oauth_state";
const SESSION_TTL_DAYS = 30;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function sign(value, secret) {
  const mac = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
  return `${value}.${mac}`;
}

function unsign(signed, secret) {
  if (!signed) return null;
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return null;
  }
  return value;
}

function setCookie(res, name, value, { maxAgeSeconds, clear } = {}) {
  const parts = [`${name}=${clear ? "" : encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  if (clear) {
    parts.push("Max-Age=0");
  } else if (maxAgeSeconds) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  res.append("Set-Cookie", parts.join("; "));
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

function authRedirectUri() {
  const base = process.env.PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/auth/google/callback`;
}

export async function createSession(userId) {
  const id = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);
  await query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [id, userId, expiresAt],
  );
  return { id, expiresAt };
}

export async function destroySession(sessionId) {
  await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

export async function getUserBySession(sessionId) {
  if (!sessionId) return null;
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.picture_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export function authMiddleware() {
  return async (req, _res, next) => {
    req.user = null;
    req.sessionId = null;
    if (!hasDb()) return next();
    const secret = getSecret();
    if (!secret) return next();
    const cookies = parseCookies(req.headers.cookie);
    const signed = cookies[COOKIE_NAME];
    const sessionId = unsign(signed, secret);
    if (!sessionId) return next();
    try {
      const user = await getUserBySession(sessionId);
      if (user) {
        req.user = user;
        req.sessionId = sessionId;
      }
    } catch (err) {
      console.warn("[auth] session lookup failed", err.message);
    }
    next();
  };
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

export function mountAuthRoutes(app) {
  const router = express.Router();

  router.get("/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const secret = getSecret();
    const redirectUri = authRedirectUri();
    if (!hasDb()) {
      console.warn("[auth] DATABASE_URL is not configured; Google auth is disabled");
      return res.status(503).json({ error: "db_unavailable" });
    }
    if (!clientId || !secret || !redirectUri) {
      return res.status(500).json({ error: "oauth_not_configured" });
    }
    const state = crypto.randomBytes(16).toString("base64url");
    setCookie(res, OAUTH_STATE_COOKIE, sign(state, secret), {
      maxAgeSeconds: 600,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  router.get("/auth/google/callback", async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const secret = getSecret();
    const redirectUri = authRedirectUri();
    if (!hasDb()) {
      console.warn("[auth] DATABASE_URL is not configured; Google auth callback cannot create a session");
      return res.status(503).send("db_unavailable");
    }
    if (!clientId || !clientSecret || !secret || !redirectUri) {
      return res.status(500).send("oauth_not_configured");
    }

    const cookies = parseCookies(req.headers.cookie);
    const expectedState = unsign(cookies[OAUTH_STATE_COOKIE], secret);
    setCookie(res, OAUTH_STATE_COOKIE, "", { clear: true });
    const { code, state, error } = req.query;
    if (error) return res.status(400).send(`oauth_error: ${error}`);
    if (!code || !state || state !== expectedState) {
      return res.status(400).send("oauth_state_mismatch");
    }

    let tokenJson;
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!tokenRes.ok) {
        const detail = await tokenRes.text().catch(() => "");
        console.warn("[auth] token exchange failed", detail.slice(0, 200));
        return res.status(502).send("oauth_token_exchange_failed");
      }
      tokenJson = await tokenRes.json();
    } catch (err) {
      console.warn("[auth] token exchange error", err.message);
      return res.status(502).send("oauth_network_error");
    }

    const accessToken = tokenJson.access_token;
    if (!accessToken) return res.status(502).send("oauth_no_access_token");

    let profile;
    try {
      const profileRes = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!profileRes.ok) {
        return res.status(502).send("oauth_userinfo_failed");
      }
      profile = await profileRes.json();
    } catch (err) {
      console.warn("[auth] userinfo error", err.message);
      return res.status(502).send("oauth_userinfo_error");
    }

    const sub = profile.sub;
    if (!sub) return res.status(502).send("oauth_no_sub");

    let userId;
    try {
      const { rows } = await query(
        `INSERT INTO users (google_sub, email, name, picture_url)
              VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_sub) DO UPDATE
            SET email = EXCLUDED.email,
                name = EXCLUDED.name,
                picture_url = EXCLUDED.picture_url
         RETURNING id`,
        [sub, profile.email ?? null, profile.name ?? null, profile.picture ?? null],
      );
      userId = rows[0].id;
    } catch (err) {
      console.error("[auth] user upsert failed", err);
      return res.status(500).send("user_upsert_failed");
    }

    let sessionId;
    try {
      const session = await createSession(userId);
      sessionId = session.id;
    } catch (err) {
      console.error("[auth] session create failed", err);
      return res.status(500).send("session_create_failed");
    }

    setCookie(res, COOKIE_NAME, sign(sessionId, secret), {
      maxAgeSeconds: SESSION_TTL_DAYS * 24 * 3600,
    });
    res.redirect("/");
  });

  router.post("/auth/logout", async (req, res) => {
    if (req.sessionId) {
      try {
        await destroySession(req.sessionId);
      } catch (err) {
        console.warn("[auth] logout delete failed", err.message);
      }
    }
    setCookie(res, COOKIE_NAME, "", { clear: true });
    res.json({ ok: true });
  });

  router.get("/api/me", (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: req.user });
  });

  app.use(router);
}
