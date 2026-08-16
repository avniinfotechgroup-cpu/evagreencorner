import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { UserRow } from "./db";

/**
 * Client-safe server function wrappers.
 * Heavy Node imports stay inside handlers via dynamic import so /login SSR does not crash.
 */

export const loginWithEmailOnly = createServerFn({ method: "POST" })
  .validator((input) => z.object({ email: z.string().email().max(120) }).parse(input))
  .handler(async ({ data }) => {
    const dbMod = await import("./db");
    const auth = await import("./auth.server");
    const { generateTempPassword, sendLoginCredentialsEmail } = await import("./mail");
    const { getAppBaseUrl } = await import("./oauth");

    auth.ensureAuthProviderColumn();
    const db = dbMod.getDb();
    const email = data.email.trim().toLowerCase();
    const password = generateTempPassword(10);
    const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
      | UserRow
      | undefined;

    let user: UserRow;
    let isNew = false;

    if (existing) {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
        auth.hashPassword(password),
        existing.id,
      );
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id) as UserRow;
    } else {
      isNew = true;
      const id = auth.newId("usr");
      const now = new Date().toISOString();
      const name = email.split("@")[0] || "Driver";
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, credits, created_at, is_admin, auth_provider)
         VALUES (?, ?, ?, ?, 0, ?, 0, 'email')`,
      ).run(id, name, email, auth.hashPassword(password), now);
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow;
    }

    const mail = await sendLoginCredentialsEmail({
      to: email,
      name: user.name,
      password,
      isNew,
      appUrl: getAppBaseUrl(),
    });

    const token = auth.createSession(user.id);
    return {
      token,
      user: auth.publicUser(user),
      isNew,
      emailSent: mail.sent,
      mailMode: mail.mode,
      mailHint: mail.preview,
      message: mail.sent
        ? isNew
          ? "Account created. Login details sent to your email. You are signed in."
          : "Login details sent to your email. You are signed in."
        : isNew
          ? "Account created and you are signed in. Email SMTP not configured — check server logs for password."
          : "You are signed in. Email SMTP not configured — check server logs for password.",
    };
  });

export const getAuthProviders = createServerFn({ method: "GET" }).handler(async () => {
  const { getOAuthStatus } = await import("./oauth");
  return {
    ...getOAuthStatus(),
    emailOnly: true,
    passwordLogin: true,
  };
});

export const getOAuthStartUrl = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        provider: z.enum(["google", "microsoft"]),
        redirect: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getOAuthAuthorizeUrl } = await import("./oauth");
    const url = getOAuthAuthorizeUrl(
      data.provider,
      data.redirect && data.redirect.startsWith("/") ? data.redirect : "/rewards",
    );
    return { url };
  });

export const completeOAuthLogin = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        code: z.string().min(1),
        state: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const dbMod = await import("./db");
    const auth = await import("./auth.server");
    const { generateTempPassword } = await import("./mail");
    const { exchangeOAuthCode, parseOAuthState } = await import("./oauth");

    const { provider, redirect } = parseOAuthState(data.state);
    const profile = await exchangeOAuthCode(provider, data.code);

    auth.ensureAuthProviderColumn();
    const db = dbMod.getDb();
    const email = profile.email.trim().toLowerCase();
    let user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
      | UserRow
      | undefined;

    if (user) {
      try {
        db.prepare(
          `UPDATE users SET auth_provider = ?, name = COALESCE(NULLIF(name,''), ?) WHERE id = ?`,
        ).run(provider, profile.name, user.id);
      } catch {
        // ignore
      }
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
    } else {
      const id = auth.newId("usr");
      const now = new Date().toISOString();
      const password = generateTempPassword(16);
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, credits, created_at, is_admin, auth_provider)
         VALUES (?, ?, ?, ?, 0, ?, 0, ?)`,
      ).run(
        id,
        profile.name.trim() || email.split("@")[0],
        email,
        auth.hashPassword(password),
        now,
        provider,
      );
      user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow;
    }

    const token = auth.createSession(user.id);
    return {
      token,
      user: auth.publicUser(user),
      redirect,
      message: `Signed in with ${provider}.`,
    };
  });

export const registerUser = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        name: z.string().min(2).max(80),
        email: z.string().email().max(120),
        password: z.string().min(6).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const dbMod = await import("./db");
    const auth = await import("./auth.server");
    const db = dbMod.getDb();
    const email = data.email.trim().toLowerCase();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      throw new Error("This email is already registered. Please log in.");
    }
    const id = auth.newId("usr");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, credits, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    ).run(id, data.name.trim(), email, auth.hashPassword(data.password), now);

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow;
    const token = auth.createSession(id);
    return { token, user: auth.publicUser(user) };
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const dbMod = await import("./db");
    const auth = await import("./auth.server");
    const db = dbMod.getDb();
    const email = data.email.trim().toLowerCase();
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
      | UserRow
      | undefined;
    if (!user || !auth.verifyPassword(data.password, user.password_hash)) {
      throw new Error("Invalid email or password.");
    }
    const token = auth.createSession(user.id);
    return { token, user: auth.publicUser(user) };
  });

export const logoutUser = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("./db");
    getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(data.token);
    return { ok: true as const };
  });

export const getSessionUser = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().optional() }).parse(input))
  .handler(async ({ data }) => {
    const { resolveUserByToken } = await import("./auth.server");
    return { user: resolveUserByToken(data.token) };
  });
