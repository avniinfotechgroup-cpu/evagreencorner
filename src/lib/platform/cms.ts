import { getDb } from "@/lib/community/db";
import { SOLAR_LOCATIONS, type SolarLocation } from "@/data/solar";
import { VEHICLES, type VehicleProfile } from "@/data/routePlanner";
import { MANAGED_PAGE_SEO } from "@/lib/seo/page-registry";

/** Fallback module registry (avoids importing Vite env config in Node scripts). */
const MODULE_SEED: Array<{ id: string; title: string; href: string }> = [
  { id: "ev-finder", title: "EV Charging Finder", href: "/find-chargers" },
  { id: "route-planner", title: "EV Route Planner", href: "/route-planner" },
  { id: "aqi", title: "Air Quality (AQI)", href: "/air-quality" },
  { id: "carbon", title: "Carbon Footprint", href: "/carbon-calculator" },
  { id: "water", title: "Water Footprint", href: "/water-calculator" },
  { id: "solar", title: "Solar Calculator", href: "/solar-calculator" },
  { id: "directory", title: "Green Services Directory", href: "/directory" },
  { id: "ev-vehicles", title: "Indian EV Vehicles", href: "/ev" },
  { id: "leads", title: "Lead Marketplace", href: "/marketplace" },
  { id: "jobs", title: "Job and Internship", href: "/job-and-internship" },
  { id: "articles", title: "Environment Journal", href: "/journal" },
];

function moduleRegistry(): Array<{ id: string; title: string; href: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/config/platform") as typeof import("@/config/platform");
    return mod.PLATFORM_MODULES.map((m) => ({
      id: m.id,
      title: m.title,
      href: m.href,
    }));
  } catch {
    return MODULE_SEED;
  }
}

export type PageSeoRow = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  noindex: number;
  updated_at: string;
};

export type ModuleFlagRow = {
  module_id: string;
  enabled: number;
  updated_at: string;
};

let ensured = false;

export function ensurePlatformCms() {
  if (ensured) return getDb();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_seo (
      path TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '',
      noindex INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS module_flags (
      module_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS solar_location_overrides (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '',
      discom TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      sun_hours REAL NOT NULL,
      tariff REAL NOT NULL,
      cost_per_kw REAL NOT NULL,
      grid_co2 REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS route_vehicle_overrides (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      segment TEXT NOT NULL DEFAULT '',
      battery_kwh REAL NOT NULL,
      range_km REAL NOT NULL,
      connector TEXT NOT NULL DEFAULT 'CCS2',
      battery_swap INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  seedIfEmpty(db);
  ensureManagedPagesSeo(db);
  ensured = true;
  return db;
}

function seedIfEmpty(db: ReturnType<typeof getDb>) {
  const seoCount = (
    db.prepare(`SELECT COUNT(*) as c FROM page_seo`).get() as { c: number }
  ).c;
  if (seoCount === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO page_seo (path, title, description, keywords, noindex, updated_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    );
    const seeds: Array<[string, string, string]> = [
      [
        "/",
        "EVA Green Corner — EV Charging Map, Route Planner & Green Tools India",
        "Find live EV charging stations, plan charge stops, check AQI, and use solar, carbon and water tools across India.",
      ],
      [
        "/find-chargers",
        "Find EV Charging Stations Near You | EVA Green Corner",
        "Search live EV charging stations by city, pincode or GPS across India.",
      ],
      [
        "/route-planner",
        "EV Route Planner — charge stops, cost & time | EVA Green Corner",
        "Plan electric car trips with required charging stops based on your vehicle battery and start charge.",
      ],
      [
        "/solar-calculator",
        "Rooftop Solar Calculator — size, savings & payback | EVA Green Corner",
        "Estimate rooftop solar using India DISCOM tariff benchmarks and PVGIS sun hours.",
      ],
      [
        "/directory",
        "Green Services Directory | EVA Green Corner",
        "Find EV workshops, solar installers, recyclers and green service providers.",
      ],
      [
        "/air-quality",
        "Air Quality (AQI) | EVA Green Corner",
        "Check Indian National AQI by neighbourhood with pollutant breakdown and health advice.",
      ],
      [
        "/carbon-calculator",
        "Carbon Footprint Calculator | EVA Green Corner",
        "Estimate household and travel CO₂e and compare with a typical Indian household.",
      ],
      [
        "/water-calculator",
        "Water Footprint Calculator | EVA Green Corner",
        "Estimate direct and virtual water use across home and diet.",
      ],
      [
        "/ev",
        "Electric Vehicles in India — Price, Range & Specs | EVA Green Corner",
        "Browse electric cars, scooters and commercial EVs with specs and pricing references.",
      ],
      [
        "/marketplace",
        "Green Lead Marketplace | EVA Green Corner",
        "Connect verified green demand with local service providers.",
      ],
      [
        "/job-and-internship",
        "Job and Internship | EVA Green Corner",
        "Climate careers, renewables roles and internships in India.",
      ],
      [
        "/journal",
        "Environment Journal | EVA Green Corner",
        "Research-backed guides, explainers and policy tracking.",
      ],
    ];
    for (const [path, title, description] of seeds) {
      insert.run(path, title, description, "", now);
    }
  }

  const modCount = (
    db.prepare(`SELECT COUNT(*) as c FROM module_flags`).get() as { c: number }
  ).c;
  if (modCount === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO module_flags (module_id, enabled, updated_at) VALUES (?, 1, ?)`,
    );
    for (const m of moduleRegistry()) {
      insert.run(m.id, now);
    }
  }

  const solarCount = (
    db.prepare(`SELECT COUNT(*) as c FROM solar_location_overrides`).get() as { c: number }
  ).c;
  if (solarCount === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO solar_location_overrides
        (slug, name, state, discom, lat, lng, sun_hours, tariff, cost_per_kw, grid_co2, notes, active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    for (const l of SOLAR_LOCATIONS) {
      insert.run(
        l.slug,
        l.name,
        l.state,
        l.discom,
        l.lat,
        l.lng,
        l.sunHours,
        l.tariff,
        l.costPerKw,
        l.gridCo2,
        l.notes ?? "",
        now,
      );
    }
  }

  const vehCount = (
    db.prepare(`SELECT COUNT(*) as c FROM route_vehicle_overrides`).get() as { c: number }
  ).c;
  if (vehCount === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO route_vehicle_overrides
        (id, name, brand, segment, battery_kwh, range_km, connector, battery_swap, active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    VEHICLES.forEach((v, i) => {
      insert.run(
        v.id,
        v.name,
        v.brand ?? "",
        v.segment ?? "",
        v.batteryKwh,
        v.rangeKm,
        v.connector,
        v.batterySwap ? 1 : 0,
        i,
        now,
      );
    });
  }
}

function ensureManagedPagesSeo(db: ReturnType<typeof getDb>) {
  const now = new Date().toISOString();
  // Migrate legacy /jobs SEO row to new path
  db.prepare(
    `UPDATE page_seo SET path = '/job-and-internship', updated_at = ?
     WHERE path = '/jobs'
       AND NOT EXISTS (SELECT 1 FROM page_seo WHERE path = '/job-and-internship')`,
  ).run(now);
  db.prepare(`DELETE FROM page_seo WHERE path = '/jobs'`).run();

  const insert = db.prepare(
    `INSERT OR IGNORE INTO page_seo (path, title, description, keywords, noindex, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const p of MANAGED_PAGE_SEO) {
    insert.run(
      p.path,
      p.title,
      p.description,
      p.keywords ?? "",
      p.noindex ? 1 : 0,
      now,
    );
  }
}

export function listPageSeo(): PageSeoRow[] {
  const db = ensurePlatformCms();
  return db
    .prepare(`SELECT * FROM page_seo ORDER BY path ASC`)
    .all() as PageSeoRow[];
}

export function getPageSeo(path: string): PageSeoRow | null {
  const db = ensurePlatformCms();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const row = db
    .prepare(`SELECT * FROM page_seo WHERE path = ?`)
    .get(normalized) as PageSeoRow | undefined;
  return row ?? null;
}

export function deletePageSeo(path: string) {
  const db = ensurePlatformCms();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  db.prepare(`DELETE FROM page_seo WHERE path = ?`).run(normalized);
}

export function upsertPageSeo(input: {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  noindex?: boolean;
}) {
  const db = ensurePlatformCms();
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  db.prepare(
    `INSERT INTO page_seo (path, title, description, keywords, noindex, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       keywords = excluded.keywords,
       noindex = excluded.noindex,
       updated_at = excluded.updated_at`,
  ).run(
    path,
    input.title.trim(),
    input.description.trim(),
    input.keywords?.trim() ?? "",
    input.noindex ? 1 : 0,
    new Date().toISOString(),
  );
}

export function listModuleFlags(): Array<ModuleFlagRow & { title: string; href: string }> {
  const db = ensurePlatformCms();
  const rows = db.prepare(`SELECT * FROM module_flags`).all() as ModuleFlagRow[];
  const byId = new Map(rows.map((r) => [r.module_id, r]));
  return moduleRegistry().map((m) => {
    const row = byId.get(m.id);
    return {
      module_id: m.id,
      enabled: row?.enabled ?? 1,
      updated_at: row?.updated_at ?? "",
      title: m.title,
      href: m.href,
    };
  });
}

export function setModuleEnabled(moduleId: string, enabled: boolean) {
  const db = ensurePlatformCms();
  db.prepare(
    `INSERT INTO module_flags (module_id, enabled, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(module_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
  ).run(moduleId, enabled ? 1 : 0, new Date().toISOString());
}

export function listSolarLocationsCms(): SolarLocation[] {
  const db = ensurePlatformCms();
  const rows = db
    .prepare(
      `SELECT * FROM solar_location_overrides WHERE active = 1 ORDER BY name ASC`,
    )
    .all() as Array<{
    slug: string;
    name: string;
    state: string;
    discom: string;
    lat: number;
    lng: number;
    sun_hours: number;
    tariff: number;
    cost_per_kw: number;
    grid_co2: number;
    notes: string;
  }>;
  if (!rows.length) return SOLAR_LOCATIONS;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    state: r.state,
    discom: r.discom,
    lat: r.lat,
    lng: r.lng,
    sunHours: r.sun_hours,
    tariff: r.tariff,
    costPerKw: r.cost_per_kw,
    gridCo2: r.grid_co2,
    notes: r.notes || undefined,
  }));
}

export function upsertSolarLocationCms(loc: SolarLocation & { active?: boolean }) {
  const db = ensurePlatformCms();
  db.prepare(
    `INSERT INTO solar_location_overrides
      (slug, name, state, discom, lat, lng, sun_hours, tariff, cost_per_kw, grid_co2, notes, active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       name = excluded.name,
       state = excluded.state,
       discom = excluded.discom,
       lat = excluded.lat,
       lng = excluded.lng,
       sun_hours = excluded.sun_hours,
       tariff = excluded.tariff,
       cost_per_kw = excluded.cost_per_kw,
       grid_co2 = excluded.grid_co2,
       notes = excluded.notes,
       active = excluded.active,
       updated_at = excluded.updated_at`,
  ).run(
    loc.slug,
    loc.name,
    loc.state,
    loc.discom,
    loc.lat,
    loc.lng,
    loc.sunHours,
    loc.tariff,
    loc.costPerKw,
    loc.gridCo2,
    loc.notes ?? "",
    loc.active === false ? 0 : 1,
    new Date().toISOString(),
  );
}

export function listRouteVehiclesCms(): VehicleProfile[] {
  const db = ensurePlatformCms();
  const rows = db
    .prepare(
      `SELECT * FROM route_vehicle_overrides WHERE active = 1 ORDER BY sort_order ASC, name ASC`,
    )
    .all() as Array<{
    id: string;
    name: string;
    brand: string;
    segment: string;
    battery_kwh: number;
    range_km: number;
    connector: string;
    battery_swap: number;
  }>;
  if (!rows.length) return VEHICLES;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand || undefined,
    segment: r.segment || undefined,
    batteryKwh: r.battery_kwh,
    rangeKm: r.range_km,
    connector: r.connector,
    batterySwap: Boolean(r.battery_swap),
  }));
}

export function upsertRouteVehicleCms(
  v: VehicleProfile & { active?: boolean; sortOrder?: number },
) {
  const db = ensurePlatformCms();
  db.prepare(
    `INSERT INTO route_vehicle_overrides
      (id, name, brand, segment, battery_kwh, range_km, connector, battery_swap, active, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       segment = excluded.segment,
       battery_kwh = excluded.battery_kwh,
       range_km = excluded.range_km,
       connector = excluded.connector,
       battery_swap = excluded.battery_swap,
       active = excluded.active,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  ).run(
    v.id,
    v.name,
    v.brand ?? "",
    v.segment ?? "",
    v.batteryKwh,
    v.rangeKm,
    v.connector,
    v.batterySwap ? 1 : 0,
    v.active === false ? 0 : 1,
    v.sortOrder ?? 0,
    new Date().toISOString(),
  );
}
