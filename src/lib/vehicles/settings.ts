/**
 * Lightweight module settings for the EV vehicles module.
 * Kept separate from sync.ts so stale jobs don't create import cycles.
 */
import { getDb } from "@/lib/community/db";
import { ensureVehiclesSchema } from "./schema";

function now() {
  return new Date().toISOString();
}

function ensureSettingsTable() {
  ensureVehiclesSchema();
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS vehicle_module_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function getSetting(key: string, fallback: string) {
  ensureSettingsTable();
  const row = getDb()
    .prepare(`SELECT value FROM vehicle_module_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  ensureSettingsTable();
  getDb()
    .prepare(
      `INSERT INTO vehicle_module_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, now());
}
