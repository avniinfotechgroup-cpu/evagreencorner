import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword, newId } from "./crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "community.sqlite");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reviews");

let db: DatabaseSync | null = null;

export function getUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      station_name TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      working TEXT NOT NULL CHECK(working IN ('yes','no','partial')),
      cleanliness INTEGER NOT NULL CHECK(cleanliness BETWEEN 1 AND 5),
      wait_minutes INTEGER,
      connectors_ok INTEGER NOT NULL DEFAULT 1,
      comment TEXT NOT NULL,
      credits_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, station_id)
    );

    CREATE TABLE IF NOT EXISTS review_photos (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS redeem_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credits INTEGER NOT NULL,
      cash_inr INTEGER NOT NULL,
      upi_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS station_scores (
      station_id TEXT PRIMARY KEY,
      trust_score REAL NOT NULL,
      review_count INTEGER NOT NULL,
      avg_rating REAL NOT NULL,
      working_rate REAL NOT NULL,
      ml_score REAL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_station ON reviews(station_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // already exists
  }

  seedAdminUser(db);
  return db;
}

function seedAdminUser(database: DatabaseSync) {
  const email = (process.env["ADMIN_EMAIL"] || "admin@evagreencorner.com").trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"] || "Admin@123";
  const existing = database.prepare(`SELECT id, is_admin FROM users WHERE email = ?`).get(email) as
    | { id: string; is_admin: number }
    | undefined;

  if (existing) {
    if (!existing.is_admin) {
      database.prepare(`UPDATE users SET is_admin = 1 WHERE id = ?`).run(existing.id);
    }
    return;
  }

  const id = newId("usr");
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, credits, created_at, is_admin)
       VALUES (?, ?, ?, ?, 0, ?, 1)`,
    )
    .run(id, "Admin", email, hashPassword(password), now);
}

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  credits: number;
  created_at: string;
  is_admin?: number;
};

export type ReviewRow = {
  id: string;
  station_id: string;
  station_name: string;
  user_id: string;
  rating: number;
  working: "yes" | "no" | "partial";
  cleanliness: number;
  wait_minutes: number | null;
  connectors_ok: number;
  comment: string;
  credits_earned: number;
  created_at: string;
};
