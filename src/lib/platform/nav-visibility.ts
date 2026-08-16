import { getDb } from "@/lib/community/db";

export type NavMenuId = "ev-services" | "green-services";

export type NavCategoryDef = {
  id: string;
  label: string;
};

export const NAV_MENUS: Array<{
  id: NavMenuId;
  label: string;
  description: string;
  categories: NavCategoryDef[];
}> = [
  {
    id: "ev-services",
    label: "EV services",
    description: "Public menu dropdown for EV repair, store, battery, conversion & charging.",
    categories: [
      { id: "ev_repair", label: "EV Repair" },
      { id: "ev_store", label: "EV Store" },
      { id: "ev_battery", label: "EV Battery" },
      { id: "ev_conversion", label: "EV Conversion" },
      { id: "charging_installation", label: "Charging Installation" },
    ],
  },
  {
    id: "green-services",
    label: "Green services",
    description: "Public menu dropdown for solar, recycling, waste, water, ESG & green building.",
    categories: [
      { id: "solar", label: "Solar" },
      { id: "recycling-pickup", label: "Recycling" },
      { id: "waste-management", label: "Waste Management" },
      { id: "water-solutions", label: "Water Management" },
      { id: "energy-audit", label: "Energy Efficiency" },
      { id: "green-consulting", label: "Carbon & ESG" },
      { id: "green-building", label: "Green Building" },
    ],
  },
];

export type NavVisibilityState = {
  menus: Record<NavMenuId, boolean>;
  categories: Record<NavMenuId, Record<string, boolean>>;
};

let ensured = false;

function menuKey(id: NavMenuId) {
  return `menu:${id}`;
}

function catKey(menuId: NavMenuId, catId: string) {
  return `cat:${menuId}:${catId}`;
}

export function ensureNavVisibility() {
  if (ensured) return getDb();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS nav_visibility (
      flag_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const upsert = db.prepare(
    `INSERT OR IGNORE INTO nav_visibility (flag_key, enabled, updated_at) VALUES (?, ?, ?)`,
  );

  // Menus hidden by default until admin enables them
  for (const menu of NAV_MENUS) {
    upsert.run(menuKey(menu.id), 0, now);
    for (const cat of menu.categories) {
      // Categories enabled by default so turning the menu on shows all unless toggled off
      upsert.run(catKey(menu.id, cat.id), 1, now);
    }
  }

  ensured = true;
  return db;
}

function isEnabled(key: string, fallback: boolean): boolean {
  const db = ensureNavVisibility();
  const row = db
    .prepare(`SELECT enabled FROM nav_visibility WHERE flag_key = ?`)
    .get(key) as { enabled: number } | undefined;
  if (!row) return fallback;
  return Boolean(row.enabled);
}

export function getNavVisibility(): NavVisibilityState {
  ensureNavVisibility();
  const menus = {} as Record<NavMenuId, boolean>;
  const categories = {} as Record<NavMenuId, Record<string, boolean>>;

  for (const menu of NAV_MENUS) {
    menus[menu.id] = isEnabled(menuKey(menu.id), false);
    categories[menu.id] = {};
    for (const cat of menu.categories) {
      categories[menu.id]![cat.id] = isEnabled(catKey(menu.id, cat.id), true);
    }
  }

  return { menus, categories };
}

export function setNavMenuEnabled(menuId: NavMenuId, enabled: boolean) {
  ensureNavVisibility();
  getDb()
    .prepare(
      `INSERT INTO nav_visibility (flag_key, enabled, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(flag_key) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    )
    .run(menuKey(menuId), enabled ? 1 : 0, new Date().toISOString());
}

export function setNavCategoryEnabled(
  menuId: NavMenuId,
  categoryId: string,
  enabled: boolean,
) {
  ensureNavVisibility();
  const menu = NAV_MENUS.find((m) => m.id === menuId);
  if (!menu?.categories.some((c) => c.id === categoryId)) {
    throw new Error("Unknown category");
  }
  getDb()
    .prepare(
      `INSERT INTO nav_visibility (flag_key, enabled, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(flag_key) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    )
    .run(catKey(menuId, categoryId), enabled ? 1 : 0, new Date().toISOString());
}

export function listNavVisibilityAdmin() {
  const state = getNavVisibility();
  return NAV_MENUS.map((menu) => ({
    id: menu.id,
    label: menu.label,
    description: menu.description,
    enabled: state.menus[menu.id],
    categories: menu.categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      enabled: state.categories[menu.id]?.[cat.id] ?? true,
    })),
  }));
}
