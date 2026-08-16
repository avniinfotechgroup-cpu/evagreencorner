import { getDb } from "@/lib/community/db";
import {
  DEFAULT_SITE_SCRIPTS,
  normalizeSiteScripts,
  type SiteScriptsSettings,
} from "./site-scripts.shared";

export type { SiteScriptsSettings } from "./site-scripts.shared";
export {
  DEFAULT_SITE_SCRIPTS,
  normalizeSiteScripts,
  parseCustomJsonLd,
  validateSiteScriptIds,
} from "./site-scripts.shared";

const ROW_ID = "site";

export function ensureSiteScriptsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_scripts (
      id TEXT PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const row = db.prepare(`SELECT id FROM site_scripts WHERE id = ?`).get(ROW_ID) as
    | { id: string }
    | undefined;
  if (!row) {
    const now = new Date().toISOString();
    const seed = { ...DEFAULT_SITE_SCRIPTS, updatedAt: now };
    db.prepare(
      `INSERT INTO site_scripts (id, settings_json, updated_at) VALUES (?, ?, ?)`,
    ).run(ROW_ID, JSON.stringify(seed), now);
  }
  return db;
}

function parseSettings(raw: string | null | undefined): SiteScriptsSettings {
  if (!raw?.trim()) return { ...DEFAULT_SITE_SCRIPTS };
  try {
    return normalizeSiteScripts(JSON.parse(raw) as Partial<SiteScriptsSettings>);
  } catch {
    return { ...DEFAULT_SITE_SCRIPTS };
  }
}

export function getSiteScripts(): SiteScriptsSettings {
  const db = ensureSiteScriptsTable();
  const row = db
    .prepare(`SELECT settings_json, updated_at FROM site_scripts WHERE id = ?`)
    .get(ROW_ID) as { settings_json: string; updated_at: string } | undefined;
  if (!row) return { ...DEFAULT_SITE_SCRIPTS };

  // Env fallbacks when CMS fields empty (useful for local/prod without admin fill)
  const fromDb = parseSettings(row.settings_json);
  const envGa = (process.env["VITE_GA_MEASUREMENT_ID"] || process.env["GA_MEASUREMENT_ID"] || "")
    .trim()
    .toUpperCase();
  const envGtm = (process.env["VITE_GTM_CONTAINER_ID"] || process.env["GTM_CONTAINER_ID"] || "")
    .trim()
    .toUpperCase();

  return {
    ...fromDb,
    gaMeasurementId: fromDb.gaMeasurementId || envGa,
    gtmContainerId: fromDb.gtmContainerId || envGtm,
    updatedAt: row.updated_at || fromDb.updatedAt,
  };
}

export function upsertSiteScripts(
  input: Partial<SiteScriptsSettings>,
): SiteScriptsSettings {
  const db = ensureSiteScriptsTable();
  const now = new Date().toISOString();
  const settings = normalizeSiteScripts({ ...input, updatedAt: now });
  db.prepare(
    `INSERT INTO site_scripts (id, settings_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       settings_json = excluded.settings_json,
       updated_at = excluded.updated_at`,
  ).run(ROW_ID, JSON.stringify(settings), now);
  return settings;
}
