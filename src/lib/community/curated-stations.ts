import { haversineKm } from "@/lib/ev/haversine";
import type { EvStation } from "@/lib/ev/types";
import { getDb } from "./db";
import { newId } from "./crypto";

export type CuratedStationRow = {
  id: string;
  name: string;
  operator: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  connectors: string;
  max_power_kw: number | null;
  price_per_kwh: number | null;
  total_points: number;
  open_24: number;
  opening_hours: string | null;
  phone: string | null;
  website: string | null;
  battery_swap: number;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export function ensureCuratedStationsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS curated_stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      pincode TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      connectors TEXT NOT NULL DEFAULT 'CCS2',
      max_power_kw REAL,
      price_per_kwh REAL,
      total_points INTEGER NOT NULL DEFAULT 1,
      open_24 INTEGER NOT NULL DEFAULT 1,
      opening_hours TEXT,
      phone TEXT,
      website TEXT,
      battery_swap INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_curated_active ON curated_stations(active);
    CREATE INDEX IF NOT EXISTS idx_curated_geo ON curated_stations(lat, lng);
  `);

  // Safe migrations for older community.sqlite files
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // column already exists
  }
}

function parseConnectors(raw: string): string[] {
  return raw
    .split(/[,|;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function curatedRowToEvStation(
  row: CuratedStationRow,
  originLat?: number,
  originLng?: number,
): EvStation {
  const connectors = parseConnectors(row.connectors || "CCS2");
  const distanceKm =
    typeof originLat === "number" && typeof originLng === "number"
      ? Math.round(haversineKm(originLat, originLng, row.lat, row.lng) * 10) / 10
      : 0;

  const fullAddress = [row.address, row.area, row.city, row.state, row.pincode]
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    source: "curated",
    sourceId: row.id.replace(/^adm-/, ""),
    name: row.name,
    operator: row.operator || "Curated",
    serviceType: row.battery_swap ? "battery_swap" : "plug_in",
    batterySwap: Boolean(row.battery_swap),
    address: row.address || fullAddress || row.name,
    area: row.area,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    fullAddress: fullAddress || row.address || row.name,
    addressFromGeocode: false,
    lat: row.lat,
    lng: row.lng,
    distanceKm,
    connectors,
    maxPowerKw: row.max_power_kw,
    pricePerKwh: row.price_per_kwh,
    pricingNote: row.notes,
    total: Math.max(1, row.total_points || 1),
    chargingPointsKnown: true,
    open24: Boolean(row.open_24),
    openingHours: row.open_24 ? "24/7" : row.opening_hours,
    website: row.website,
    phone: row.phone,
    availability: "UNKNOWN",
    rushLevel: "UNKNOWN",
    rushNote: "Community-verified availability may appear after reviews.",
    vehicleAccess: {
      cars: "unknown",
      twoWheelers: "unknown",
      threeWheelers: "unknown",
      buses: "unknown",
      trucks: "unknown",
    },
    fuelCoLocation: {
      petrol: "unknown",
      diesel: "unknown",
      cng: "unknown",
      fuelStationName: null,
      note: null,
    },
    access: "public",
    lastUpdated: row.updated_at,
  };
}

export function fetchCuratedNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): EvStation[] {
  ensureCuratedStationsTable();
  const db = getDb();
  // Bounding box prefilter (~1 deg lat ≈ 111 km)
  const d = Math.min(Math.max(radiusKm, 1), 50) / 100;
  const rows = db
    .prepare(
      `SELECT * FROM curated_stations
       WHERE active = 1
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
       LIMIT 500`,
    )
    .all(lat - d, lat + d, lng - d, lng + d) as CuratedStationRow[];

  return rows
    .map((r) => curatedRowToEvStation(r, lat, lng))
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function fetchCuratedById(id: string): EvStation | null {
  if (!id.startsWith("adm-")) return null;
  ensureCuratedStationsTable();
  const row = getDb().prepare(`SELECT * FROM curated_stations WHERE id = ?`).get(id) as
    | CuratedStationRow
    | undefined;
  if (!row || !row.active) return null;
  return curatedRowToEvStation(row);
}

export function listCuratedStations(limit = 200) {
  ensureCuratedStationsTable();
  return getDb()
    .prepare(
      `SELECT * FROM curated_stations ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(limit) as CuratedStationRow[];
}

export function insertCuratedStation(input: {
  name: string;
  operator?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat: number;
  lng: number;
  connectors?: string;
  maxPowerKw?: number | null;
  pricePerKwh?: number | null;
  totalPoints?: number;
  open24?: boolean;
  openingHours?: string | null;
  phone?: string | null;
  website?: string | null;
  batterySwap?: boolean;
  notes?: string | null;
}) {
  ensureCuratedStationsTable();
  const id = newId("adm");
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO curated_stations (
        id, name, operator, address, area, city, state, pincode,
        lat, lng, connectors, max_power_kw, price_per_kwh, total_points,
        open_24, opening_hours, phone, website, battery_swap, notes,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      (input.operator || "").trim(),
      (input.address || "").trim(),
      (input.area || "").trim(),
      (input.city || "").trim(),
      (input.state || "").trim(),
      (input.pincode || "").trim(),
      input.lat,
      input.lng,
      (input.connectors || "CCS2").trim(),
      input.maxPowerKw ?? null,
      input.pricePerKwh ?? null,
      input.totalPoints ?? 1,
      input.open24 === false ? 0 : 1,
      input.openingHours ?? null,
      input.phone ?? null,
      input.website ?? null,
      input.batterySwap ? 1 : 0,
      input.notes ?? null,
      now,
      now,
    );
  return id;
}

export function deleteCuratedStation(id: string) {
  ensureCuratedStationsTable();
  getDb().prepare(`DELETE FROM curated_stations WHERE id = ?`).run(id);
}

export function deleteCuratedStationsBulk(ids: string[]) {
  ensureCuratedStationsTable();
  if (!ids.length) return 0;
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM curated_stations WHERE id = ?`);
  let deleted = 0;
  for (const id of ids) {
    const res = stmt.run(id);
    deleted += Number(res.changes || 0);
  }
  return deleted;
}

export function setCuratedActive(id: string, active: boolean) {
  ensureCuratedStationsTable();
  getDb()
    .prepare(`UPDATE curated_stations SET active = ?, updated_at = ? WHERE id = ?`)
    .run(active ? 1 : 0, new Date().toISOString(), id);
}
