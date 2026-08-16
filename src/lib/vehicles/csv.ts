import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureVehiclesSchema, slugifyVehicle } from "./schema";
import type { ProviderVehicleDraft } from "./providers/types";
import { duplicateKey } from "./providers/types";

function ensurePendingTable() {
  ensureVehiclesSchema();
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS vehicle_pending_updates (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      duplicate_key TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      review_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );
  `);
}

export type CsvPreviewRow = {
  row: number;
  ok: boolean;
  errors: string[];
  draft: ProviderVehicleDraft | null;
};

const HEADER_MAP: Record<string, string> = {
  brand: "brandName",
  brand_name: "brandName",
  model: "modelName",
  model_name: "modelName",
  variant: "variantName",
  name: "name",
  category: "categoryHint",
  category_slug: "categoryHint",
  battery: "batteryKwh",
  battery_kwh: "batteryKwh",
  battery_capacity_kwh: "batteryKwh",
  chemistry: "batteryChemistry",
  range: "claimedRangeKm",
  claimed_range_km: "claimedRangeKm",
  test_cycle: "rangeTestCycle",
  range_test_cycle: "rangeTestCycle",
  motor_kw: "motorPowerKw",
  motor_power_kw: "motorPowerKw",
  torque: "torqueNm",
  torque_nm: "torqueNm",
  dc_kw: "dcChargingKw",
  dc_charging_power_kw: "dcChargingKw",
  connector: "connector",
  seating: "seating",
  price: "startingPrice",
  ex_showroom_price: "startingPrice",
  starting_price: "startingPrice",
  source: "sourceName",
  source_name: "sourceName",
  source_url: "sourceUrl",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

export function previewVehicleCsv(csvText: string, maxRows = 200): {
  headers: string[];
  rows: CsvPreviewRow[];
  validCount: number;
  errorCount: number;
} {
  const table = parseCsv(csvText);
  if (table.length < 2) {
    return { headers: [], rows: [], validCount: 0, errorCount: 0 };
  }
  const headers = table[0]!.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const mapped = headers.map((h) => HEADER_MAP[h] ?? h);
  const rows: CsvPreviewRow[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (let i = 1; i < table.length && i <= maxRows; i++) {
    const cells = table[i]!;
    const obj: Record<string, string> = {};
    mapped.forEach((key, idx) => {
      if (key) obj[key] = cells[idx] ?? "";
    });

    const errors: string[] = [];
    const brandName = obj["brandName"] || "";
    const modelName = obj["modelName"] || "";
    const name = obj["name"] || `${brandName} ${modelName}`.trim();
    if (!brandName) errors.push("Brand required");
    if (!name) errors.push("Name/model required");

    const num = (k: string) => {
      const v = obj[k];
      if (!v) return null;
      const n = Number(v.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    };

    const batteryKwh = num("batteryKwh");
    const claimedRangeKm = num("claimedRangeKm");
    const startingPrice = num("startingPrice");
    if (batteryKwh != null && batteryKwh <= 0) errors.push("Battery must be > 0");
    if (claimedRangeKm != null && claimedRangeKm <= 0) errors.push("Range must be > 0");
    if (startingPrice != null && startingPrice < 0) errors.push("Price invalid");
    if (startingPrice != null && startingPrice > 0 && !obj["sourceName"]) {
      errors.push("Price source required");
    }

    const draft: ProviderVehicleDraft | null =
      errors.length === 0
        ? (() => {
            const d: ProviderVehicleDraft = {
              brandName,
              modelName,
              name,
              batteryKwh,
              claimedRangeKm,
              motorPowerKw: num("motorPowerKw"),
              torqueNm: num("torqueNm"),
              dcChargingKw: num("dcChargingKw"),
              seating: num("seating"),
              startingPrice,
              sourceName: obj["sourceName"] || "CSV import",
            };
            if (obj["variantName"]) d.variantName = obj["variantName"];
            if (obj["categoryHint"]) d.categoryHint = obj["categoryHint"];
            if (obj["batteryChemistry"]) d.batteryChemistry = obj["batteryChemistry"];
            if (obj["rangeTestCycle"]) d.rangeTestCycle = obj["rangeTestCycle"];
            if (obj["connector"]) d.connector = obj["connector"];
            if (obj["sourceUrl"]) d.sourceUrl = obj["sourceUrl"];
            return d;
          })()
        : null;

    if (errors.length) errorCount += 1;
    else validCount += 1;

    rows.push({ row: i + 1, ok: errors.length === 0, errors, draft });
  }

  return { headers, rows, validCount, errorCount };
}

/** Import validated CSV rows as unpublished vehicles or pending updates. */
export function importVehicleCsv(
  csvText: string,
  mode: "create_unpublished" | "pending_only" = "pending_only",
) {
  ensurePendingTable();
  const db = getDb();
  const preview = previewVehicleCsv(csvText, 5000);
  const ts = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of preview.rows) {
    if (!row.ok || !row.draft) {
      skipped += 1;
      continue;
    }
    const d = row.draft;
    const key = duplicateKey(d);

    if (mode === "pending_only") {
      db.prepare(
        `INSERT INTO vehicle_pending_updates
          (id, vehicle_id, duplicate_key, payload_json, source, status, review_notes, created_at, reviewed_at)
         VALUES (?, NULL, ?, ?, 'CSV import', 'pending', '', ?, NULL)`,
      ).run(`pend-${newId().slice(0, 12)}`, key, JSON.stringify(d), ts);
      imported += 1;
      continue;
    }

    const brandSlug = slugifyVehicle(d.brandName);
    let brand = db
      .prepare(`SELECT id FROM vehicle_brands WHERE slug = ?`)
      .get(brandSlug) as { id: string } | undefined;
    if (!brand) {
      const id = `vbr-${newId().slice(0, 10)}`;
      db.prepare(
        `INSERT INTO vehicle_brands
          (id, name, slug, logo, country, website, description, seo_title, seo_description,
           status, created_at, updated_at)
         VALUES (?, ?, ?, '', 'India', '', '', '', '', 'active', ?, ?)`,
      ).run(id, d.brandName, brandSlug, ts, ts);
      brand = { id };
    }

    const catSlug = slugifyVehicle(d.categoryHint || "other-evs");
    let cat = db
      .prepare(`SELECT id FROM vehicle_categories WHERE slug = ?`)
      .get(catSlug) as { id: string } | undefined;
    if (!cat) {
      cat = db
        .prepare(`SELECT id FROM vehicle_categories WHERE slug = 'other-evs'`)
        .get() as { id: string } | undefined;
    }
    if (!cat) {
      errors.push(`Row ${row.row}: category missing`);
      skipped += 1;
      continue;
    }

    let slug = slugifyVehicle(d.name);
    if (db.prepare(`SELECT id FROM vehicles WHERE slug = ?`).get(slug)) {
      slug = `${slug}-${newId().slice(0, 4)}`;
    }
    const id = `veh-${newId().slice(0, 12)}`;
    db.prepare(
      `INSERT INTO vehicles
        (id, brand_id, category_id, vehicle_type, name, slug, model_name, variant_name,
         model_year, status, is_latest, is_featured, is_popular, short_description, description,
         seo_title, seo_description, seo_keywords, source_url, source_name, data_source,
         last_verified_at, published, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'available', 1, 0, 0, '', '', ?, ?, '', ?, ?, 'csv',
               NULL, 0, NULL, ?, ?)`,
    ).run(
      id,
      brand.id,
      cat.id,
      catSlug,
      d.name,
      slug,
      d.modelName,
      d.variantName ?? "",
      `${d.name} Price, Range, Battery & Specifications in India`,
      `Check ${d.name} specifications in India.`,
      d.sourceUrl ?? "",
      d.sourceName,
      ts,
      ts,
    );

    db.prepare(
      `INSERT INTO battery_specifications
        (id, vehicle_id, battery_capacity_kwh, usable_battery_capacity_kwh, battery_type,
         battery_chemistry, battery_warranty_years, battery_warranty_km, created_at, updated_at)
       VALUES (?, ?, ?, NULL, '', ?, NULL, NULL, ?, ?)`,
    ).run(
      `bat-${newId().slice(0, 10)}`,
      id,
      d.batteryKwh ?? null,
      d.batteryChemistry ?? "",
      ts,
      ts,
    );
    db.prepare(
      `INSERT INTO vehicle_performance
        (id, vehicle_id, motor_type, motor_power_kw, motor_power_bhp, torque_nm,
         top_speed_kmph, acceleration_0_100, drive_type, created_at, updated_at)
       VALUES (?, ?, '', ?, NULL, ?, NULL, '', '', ?, ?)`,
    ).run(
      `perf-${newId().slice(0, 10)}`,
      id,
      d.motorPowerKw ?? null,
      d.torqueNm ?? null,
      ts,
      ts,
    );
    db.prepare(
      `INSERT INTO vehicle_range
        (id, vehicle_id, claimed_range_km, range_test_cycle, city_range_km, highway_range_km,
         real_world_range_km, range_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'Imported via CSV — verify before publish.', ?, ?)`,
    ).run(
      `rng-${newId().slice(0, 10)}`,
      id,
      d.claimedRangeKm ?? null,
      d.rangeTestCycle ?? "",
      ts,
      ts,
    );
    db.prepare(
      `INSERT INTO charging_specifications
        (id, vehicle_id, ac_charging_power_kw, dc_charging_power_kw, ac_charging_time,
         dc_fast_charging_time, charging_connector, fast_charging_support, charging_notes,
         created_at, updated_at)
       VALUES (?, ?, NULL, ?, '', '', ?, ?, '', ?, ?)`,
    ).run(
      `chg-${newId().slice(0, 10)}`,
      id,
      d.dcChargingKw ?? null,
      d.connector ?? "",
      d.dcChargingKw ? 1 : 0,
      ts,
      ts,
    );
    db.prepare(
      `INSERT INTO vehicle_dimensions
        (id, vehicle_id, length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm,
         kerb_weight_kg, boot_space_litre, seating_capacity, doors, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`,
    ).run(`dim-${newId().slice(0, 10)}`, id, d.seating ?? null, ts, ts);

    if (d.startingPrice != null) {
      db.prepare(
        `INSERT INTO vehicle_prices
          (id, vehicle_id, price_type, min_price, max_price, ex_showroom_price, currency,
           city, state, source, source_url, verified_at, created_at, updated_at)
         VALUES (?, ?, 'starting', ?, NULL, ?, 'INR', '', '', ?, ?, NULL, ?, ?)`,
      ).run(
        `prc-${newId().slice(0, 10)}`,
        id,
        d.startingPrice,
        d.startingPrice,
        d.sourceName,
        d.sourceUrl ?? "",
        ts,
        ts,
      );
    }

    imported += 1;
  }

  // Ensure pending table exists when using pending_only
  try {
    db.exec(`SELECT 1 FROM vehicle_pending_updates LIMIT 1`);
  } catch {
    /* sync.ensureSyncTables via import path */
  }

  return { imported, skipped, errors, validCount: preview.validCount, errorCount: preview.errorCount };
}
