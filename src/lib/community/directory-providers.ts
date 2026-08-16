import { getDb } from "./db";
import { newId } from "./crypto";

/** Menu-aligned EV service categories (+ legacy / green extras). */
export const DIRECTORY_CATEGORIES = [
  "ev_repair",
  "ev_store",
  "ev_battery",
  "ev_conversion",
  "charging_installation",
  "ev_workshop", // legacy → EV Repair
  "solar_installer",
  "recycler",
  "home_energy",
  "other",
] as const;

export type DirectoryCategory = (typeof DIRECTORY_CATEGORIES)[number];

/** Categories shown in main menu “EV services” — admin manage focuses here. */
export const EV_SERVICE_CATEGORIES = [
  { id: "ev_repair" as const, label: "EV Repair", legacyIds: ["ev_workshop"] },
  { id: "ev_store" as const, label: "EV Store", legacyIds: [] as string[] },
  { id: "ev_battery" as const, label: "EV Battery", legacyIds: [] as string[] },
  { id: "ev_conversion" as const, label: "EV Conversion", legacyIds: [] as string[] },
  {
    id: "charging_installation" as const,
    label: "Charging Installation",
    legacyIds: [] as string[],
  },
];

export type DirectoryProvider = {
  id: string;
  name: string;
  category: DirectoryCategory | string;
  city: string;
  state: string;
  area: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  lat: number | null;
  lng: number | null;
  verified: number;
  active: number;
  notes: string;
  seo_title: string;
  seo_keywords: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

export function categoryLabel(category: string) {
  switch (category) {
    case "ev_repair":
    case "ev_workshop":
      return "EV Repair";
    case "ev_store":
      return "EV Store";
    case "ev_battery":
      return "EV Battery";
    case "ev_conversion":
      return "EV Conversion";
    case "charging_installation":
      return "Charging Installation";
    case "solar_installer":
      return "Solar installer";
    case "recycler":
      return "Recycler";
    case "home_energy":
      return "Home energy";
    default:
      return "Other";
  }
}

export function normalizeDirectoryCategory(raw: string): DirectoryCategory {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, DirectoryCategory> = {
    ev_repair: "ev_repair",
    ev_workshop: "ev_repair",
    workshop: "ev_repair",
    repair: "ev_repair",
    ev_store: "ev_store",
    store: "ev_store",
    dealer: "ev_store",
    dealers: "ev_store",
    ev_battery: "ev_battery",
    battery: "ev_battery",
    batteries: "ev_battery",
    ev_conversion: "ev_conversion",
    conversion: "ev_conversion",
    charging_installation: "charging_installation",
    charging: "charging_installation",
    charger_installation: "charging_installation",
    ev_charging: "charging_installation",
    solar_installer: "solar_installer",
    solar: "solar_installer",
    recycler: "recycler",
    recycling: "recycler",
    home_energy: "home_energy",
    other: "other",
  };
  return aliases[key] ?? (DIRECTORY_CATEGORIES.includes(key as DirectoryCategory) ? (key as DirectoryCategory) : "other");
}

function categoryMatchIds(category: string): string[] {
  const normalized = normalizeDirectoryCategory(category);
  const ev = EV_SERVICE_CATEGORIES.find((c) => c.id === normalized);
  if (ev) return [ev.id, ...ev.legacyIds];
  if (normalized === "ev_repair") return ["ev_repair", "ev_workshop"];
  return [normalized];
}

/** Prevents ensure → seed → insert → ensure recursion while the table is still empty. */
let seedingDirectory = false;

export function ensureDirectoryProvidersTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS directory_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      pincode TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      lat REAL,
      lng REAL,
      verified INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dir_active ON directory_providers(active);
    CREATE INDEX IF NOT EXISTS idx_dir_city ON directory_providers(city);
    CREATE INDEX IF NOT EXISTS idx_dir_category ON directory_providers(category);
  `);

  migrateDirectoryColumns(db);

  if (seedingDirectory) return;

  const count = (
    db.prepare(`SELECT COUNT(*) as c FROM directory_providers`).get() as { c: number }
  ).c;
  if (count === 0) {
    seedingDirectory = true;
    try {
      seedDemoProviders();
    } finally {
      seedingDirectory = false;
    }
  }
}

function migrateDirectoryColumns(db: ReturnType<typeof getDb>) {
  const cols = db.prepare(`PRAGMA table_info(directory_providers)`).all() as Array<{
    name: string;
  }>;
  const names = new Set(cols.map((c) => c.name));
  const add = (col: string, ddl: string) => {
    if (!names.has(col)) db.exec(`ALTER TABLE directory_providers ADD COLUMN ${ddl}`);
  };
  add("seo_title", `seo_title TEXT NOT NULL DEFAULT ''`);
  add("seo_keywords", `seo_keywords TEXT NOT NULL DEFAULT ''`);
  add("seo_description", `seo_description TEXT NOT NULL DEFAULT ''`);

  // Normalize legacy category ids for admin EV menu alignment
  db.prepare(
    `UPDATE directory_providers SET category = 'ev_repair', updated_at = ?
     WHERE category = 'ev_workshop'`,
  ).run(new Date().toISOString());
}

function seedDemoProviders() {
  const samples: Array<{
    name: string;
    category: DirectoryCategory;
    city: string;
    state: string;
    area: string;
    phone: string;
    website: string;
    lat: number;
    lng: number;
    verified: boolean;
    seo_title: string;
    seo_keywords: string;
    seo_description: string;
  }> = [
    {
      name: "Noida EV Care Hub",
      category: "ev_repair",
      city: "Noida",
      state: "Uttar Pradesh",
      area: "Sector 62",
      phone: "+91 98765 43210",
      website: "",
      lat: 28.628,
      lng: 77.3649,
      verified: true,
      seo_title: "Noida EV Care Hub — EV Repair & Service",
      seo_keywords: "EV repair Noida, electric car service, EV workshop",
      seo_description:
        "Trusted EV repair workshop in Noida Sector 62 for cars and scooters. Book diagnosis and battery checks.",
    },
    {
      name: "Bengaluru ChargeFit Installers",
      category: "charging_installation",
      city: "Bengaluru",
      state: "Karnataka",
      area: "Whitefield",
      phone: "+91 98450 66778",
      website: "",
      lat: 12.9698,
      lng: 77.7499,
      verified: true,
      seo_title: "Home EV Charger Installation in Bengaluru",
      seo_keywords: "EV charger installation, home wallbox Bengaluru, CCS2 install",
      seo_description:
        "Professional home and workplace EV charging installation across Bengaluru with safety certification.",
    },
    {
      name: "Delhi EV Conversion Works",
      category: "ev_conversion",
      city: "New Delhi",
      state: "Delhi",
      area: "Okhla",
      phone: "+91 98111 22334",
      website: "",
      lat: 28.5355,
      lng: 77.2711,
      verified: true,
      seo_title: "Vehicle EV Conversion Services in Delhi",
      seo_keywords: "EV conversion Delhi, petrol to electric, retrofit EV",
      seo_description:
        "Convert ICE vehicles to electric with certified EV conversion kits and workshop support in Delhi NCR.",
    },
    {
      name: "Gurugram Battery Lab",
      category: "ev_battery",
      city: "Gurugram",
      state: "Haryana",
      area: "Udyog Vihar",
      phone: "+91 99000 11223",
      website: "",
      lat: 28.5021,
      lng: 77.0869,
      verified: false,
      seo_title: "EV Battery Repair & Pack Service Gurugram",
      seo_keywords: "EV battery repair, lithium pack, battery diagnostics",
      seo_description:
        "EV battery diagnostics, cell replacement and pack servicing for two- and four-wheelers in Gurugram.",
    },
    {
      name: "Mumbai Green EV Store",
      category: "ev_store",
      city: "Mumbai",
      state: "Maharashtra",
      area: "Andheri East",
      phone: "+91 98200 44556",
      website: "",
      lat: 19.1136,
      lng: 72.8697,
      verified: true,
      seo_title: "Electric Vehicles Store Mumbai — Cars & Scooters",
      seo_keywords: "EV store Mumbai, electric scooter dealer, buy EV",
      seo_description:
        "Browse and buy electric cars and scooters with test rides and dealer support in Mumbai.",
    },
  ];

  for (const s of samples) {
    insertDirectoryProvider({
      name: s.name,
      category: s.category,
      city: s.city,
      state: s.state,
      area: s.area,
      address: "",
      pincode: "",
      phone: s.phone,
      email: "",
      website: s.website,
      lat: s.lat,
      lng: s.lng,
      verified: s.verified,
      notes: "Seeded demo provider — replace via Admin.",
      seoTitle: s.seo_title,
      seoKeywords: s.seo_keywords,
      seoDescription: s.seo_description,
      active: true,
    });
  }
}

export function insertDirectoryProvider(input: {
  name: string;
  category: DirectoryCategory | string;
  city?: string;
  state?: string;
  area?: string;
  address?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  lat?: number | null;
  lng?: number | null;
  verified?: boolean;
  notes?: string;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
  active?: boolean;
}) {
  ensureDirectoryProvidersTable();
  const db = getDb();
  const id = `dir-${newId().slice(0, 12)}`;
  const now = new Date().toISOString();
  const category = normalizeDirectoryCategory(String(input.category));
  db.prepare(
    `INSERT INTO directory_providers
      (id, name, category, city, state, area, address, pincode, phone, email, website,
       lat, lng, verified, active, notes, seo_title, seo_keywords, seo_description,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name.trim(),
    category,
    input.city?.trim() || "",
    input.state?.trim() || "",
    input.area?.trim() || "",
    input.address?.trim() || "",
    input.pincode?.trim() || "",
    input.phone?.trim() || "",
    input.email?.trim() || "",
    input.website?.trim() || "",
    input.lat ?? null,
    input.lng ?? null,
    input.verified ? 1 : 0,
    input.active === false ? 0 : 1,
    input.notes?.trim() || "",
    input.seoTitle?.trim() || "",
    input.seoKeywords?.trim() || "",
    input.seoDescription?.trim() || "",
    now,
    now,
  );
  return id;
}

export function updateDirectoryProviderSeo(
  id: string,
  seo: { seoTitle?: string; seoKeywords?: string; seoDescription?: string },
) {
  ensureDirectoryProvidersTable();
  getDb()
    .prepare(
      `UPDATE directory_providers
       SET seo_title = COALESCE(?, seo_title),
           seo_keywords = COALESCE(?, seo_keywords),
           seo_description = COALESCE(?, seo_description),
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      seo.seoTitle ?? null,
      seo.seoKeywords ?? null,
      seo.seoDescription ?? null,
      new Date().toISOString(),
      id,
    );
}

export function listDirectoryProviders(limit = 300): DirectoryProvider[] {
  ensureDirectoryProvidersTable();
  return getDb()
    .prepare(
      `SELECT * FROM directory_providers ORDER BY verified DESC, name ASC LIMIT ?`,
    )
    .all(limit) as DirectoryProvider[];
}

export function searchDirectoryProviders(opts: {
  q?: string;
  category?: string;
  city?: string;
  limit?: number;
}): DirectoryProvider[] {
  ensureDirectoryProvidersTable();
  const limit = opts.limit ?? 100;
  const q = opts.q?.trim().toLowerCase() || "";
  const category = opts.category?.trim() || "";
  const city = opts.city?.trim().toLowerCase() || "";

  let sql = `SELECT * FROM directory_providers WHERE active = 1`;
  const params: Array<string | number> = [];

  if (category && category !== "all") {
    const ids = categoryMatchIds(category);
    sql += ` AND category IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }
  if (city) {
    sql += ` AND (lower(city) LIKE ? OR lower(area) LIKE ? OR lower(state) LIKE ?)`;
    const like = `%${city}%`;
    params.push(like, like, like);
  }
  if (q) {
    sql += ` AND (lower(name) LIKE ? OR lower(city) LIKE ? OR lower(area) LIKE ? OR lower(notes) LIKE ? OR lower(seo_keywords) LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  sql += ` ORDER BY verified DESC, name ASC LIMIT ?`;
  params.push(limit);

  return getDb().prepare(sql).all(...params) as DirectoryProvider[];
}

export function setDirectoryProviderActive(id: string, active: boolean) {
  ensureDirectoryProvidersTable();
  getDb()
    .prepare(`UPDATE directory_providers SET active = ?, updated_at = ? WHERE id = ?`)
    .run(active ? 1 : 0, new Date().toISOString(), id);
}

export function deleteDirectoryProvider(id: string) {
  ensureDirectoryProvidersTable();
  getDb().prepare(`DELETE FROM directory_providers WHERE id = ?`).run(id);
}

export function deleteDirectoryProvidersBulk(ids: string[]) {
  ensureDirectoryProvidersTable();
  if (!ids.length) return 0;
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM directory_providers WHERE id = ?`);
  let deleted = 0;
  for (const id of ids) {
    const res = stmt.run(id);
    deleted += Number(res.changes || 0);
  }
  return deleted;
}

export function countByEvCategory() {
  ensureDirectoryProvidersTable();
  const rows = getDb()
    .prepare(
      `SELECT category, COUNT(*) as c FROM directory_providers GROUP BY category`,
    )
    .all() as Array<{ category: string; c: number }>;
  const map = new Map(rows.map((r) => [r.category, r.c]));
  return EV_SERVICE_CATEGORIES.map((c) => {
    const legacy = c.legacyIds.reduce((n, id) => n + (map.get(id) ?? 0), 0);
    return {
      id: c.id,
      label: c.label,
      count: (map.get(c.id) ?? 0) + legacy,
    };
  });
}
