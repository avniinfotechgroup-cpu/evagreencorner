import { getDb } from "@/lib/community/db";
import {
  DEFAULT_HOME_CONTENT,
  normalizeHomeContent,
  type HomeContent,
} from "./home-content.shared";

export type { HomeContent, HomeFaq, HomePopularArea } from "./home-content.shared";
export { DEFAULT_HOME_CONTENT, normalizeHomeContent } from "./home-content.shared";

const HOME_ROW_ID = "home";

function parseContent(raw: string | null | undefined): HomeContent {
  if (!raw?.trim()) {
    return {
      ...DEFAULT_HOME_CONTENT,
      popularAreas: [...DEFAULT_HOME_CONTENT.popularAreas],
      faqs: [...DEFAULT_HOME_CONTENT.faqs],
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<HomeContent>;
    return normalizeHomeContent(parsed);
  } catch {
    return {
      ...DEFAULT_HOME_CONTENT,
      popularAreas: [...DEFAULT_HOME_CONTENT.popularAreas],
      faqs: [...DEFAULT_HOME_CONTENT.faqs],
    };
  }
}

export function ensureHomePageTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS home_page (
      id TEXT PRIMARY KEY,
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const row = db.prepare(`SELECT id FROM home_page WHERE id = ?`).get(HOME_ROW_ID) as
    | { id: string }
    | undefined;
  if (!row) {
    const now = new Date().toISOString();
    const content = { ...DEFAULT_HOME_CONTENT, updatedAt: now };
    db.prepare(
      `INSERT INTO home_page (id, content_json, updated_at) VALUES (?, ?, ?)`,
    ).run(HOME_ROW_ID, JSON.stringify(content), now);
  }
  return db;
}

export function getHomeContent(): HomeContent {
  const db = ensureHomePageTable();
  const row = db
    .prepare(`SELECT content_json, updated_at FROM home_page WHERE id = ?`)
    .get(HOME_ROW_ID) as { content_json: string; updated_at: string } | undefined;
  if (!row) {
    return {
      ...DEFAULT_HOME_CONTENT,
      popularAreas: [...DEFAULT_HOME_CONTENT.popularAreas],
      faqs: [...DEFAULT_HOME_CONTENT.faqs],
    };
  }
  const content = parseContent(row.content_json);
  return { ...content, updatedAt: row.updated_at || content.updatedAt };
}

export function upsertHomeContent(input: Partial<HomeContent>): HomeContent {
  const db = ensureHomePageTable();
  const now = new Date().toISOString();
  const content = normalizeHomeContent({ ...input, updatedAt: now });
  db.prepare(
    `INSERT INTO home_page (id, content_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       content_json = excluded.content_json,
       updated_at = excluded.updated_at`,
  ).run(HOME_ROW_ID, JSON.stringify(content), now);
  return content;
}

export function resetHomeContent(): HomeContent {
  return upsertHomeContent({
    ...DEFAULT_HOME_CONTENT,
    popularAreas: [...DEFAULT_HOME_CONTENT.popularAreas],
    faqs: [...DEFAULT_HOME_CONTENT.faqs],
  });
}
