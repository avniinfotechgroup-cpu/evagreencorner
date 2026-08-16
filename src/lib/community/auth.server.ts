import { getDb, type UserRow } from "./db";
import {
  hashPassword as hashPasswordCrypto,
  newId as newIdCrypto,
  newSessionToken as newSessionTokenCrypto,
  verifyPassword as verifyPasswordCrypto,
} from "./crypto";

const SESSION_DAYS = 30;

export function newId(prefix = "") {
  return newIdCrypto(prefix);
}

export function hashPassword(password: string): string {
  return hashPasswordCrypto(password);
}

export function verifyPassword(password: string, stored: string): boolean {
  return verifyPasswordCrypto(password, stored);
}

export function newSessionToken(): string {
  return newSessionTokenCrypto();
}

export function publicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    credits: row.credits,
    createdAt: row.created_at,
    isAdmin: Boolean(row.is_admin),
  };
}

export function resolveUserByToken(token: string | undefined | null) {
  if (!token) return null;
  const db = getDb();
  const session = db
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
    .get(token) as { user_id: string; expires_at: string } | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(session.user_id) as
    | UserRow
    | undefined;
  return user ? publicUser(user) : null;
}

export function requireAdmin(token: string | undefined | null) {
  const user = resolveUserByToken(token);
  if (!user?.isAdmin) {
    throw new Error("Admin access required. Login with an admin account.");
  }
  return user;
}

export function createSession(userId: string) {
  const db = getDb();
  const token = newSessionToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
  ).run(token, userId, expires.toISOString(), now.toISOString());
  return token;
}

export function ensureAuthProviderColumn() {
  try {
    getDb().exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email'`);
  } catch {
    // exists
  }
}
