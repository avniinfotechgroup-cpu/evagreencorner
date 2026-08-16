import { getDb } from "@/lib/community/db";
import { ensureVehiclesSchema, formatInrLakh, formatVerifiedDate } from "./schema";

export type VehicleListItem = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  status: string;
  shortDescription: string;
  claimedRangeKm: number | null;
  rangeTestCycle: string;
  batteryKwh: number | null;
  motorPowerKw: number | null;
  dcChargingKw: number | null;
  seating: number | null;
  startingPrice: number | null;
  startingPriceLabel: string | null;
  lastVerified: string | null;
  lastVerifiedLabel: string | null;
  isFeatured: boolean;
  isPopular: boolean;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
};

export type VehicleDetail = VehicleListItem & {
  modelName: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  sourceName: string;
  sourceUrl: string;
  batteryChemistry: string;
  batteryWarrantyYears: number | null;
  batteryWarrantyKm: number | null;
  torqueNm: number | null;
  topSpeedKmph: number | null;
  acceleration0100: string;
  driveType: string;
  motorType: string;
  cityRangeKm: number | null;
  realWorldRangeKm: number | null;
  rangeNotes: string;
  acChargingKw: number | null;
  acChargingTime: string;
  dcChargingTime: string;
  connector: string;
  fastCharging: boolean;
  chargingNotes: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  groundClearanceMm: number | null;
  kerbWeightKg: number | null;
  bootLitre: number | null;
  doors: number | null;
  airbags: number | null;
  abs: boolean;
  esc: boolean;
  adas: boolean;
  safetyRating: string;
  safetyAgency: string;
  vehicleWarrantyYears: number | null;
  vehicleWarrantyKm: number | null;
  warrantyNotes: string;
  variants: Array<{
    id: string;
    name: string;
    slug: string;
    batteryKwh: number | null;
    rangeKm: number | null;
    motorPowerKw: number | null;
    exShowroomPrice: number | null;
    priceLabel: string | null;
    isDefault: boolean;
  }>;
  features: Array<{ category: string; name: string; value: string }>;
  faqs: Array<{ question: string; answer: string }>;
  images: Array<{
    url: string;
    alt: string;
    type: string;
    isPrimary: boolean;
  }>;
  priceSource: string;
};

type Row = Record<string, unknown>;

function ensure() {
  ensureVehiclesSchema();
  return getDb();
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

function str(r: Row, key: string, fallback = ""): string {
  const v = r[key];
  if (v == null) return fallback;
  return String(v);
}

function mapListRow(r: Row): VehicleListItem {
  const startingPrice = num(r["min_price"] ?? r["ex_showroom_price"]);
  const lastVerified =
    (r["last_verified_at"] as string) || (r["price_verified"] as string) || null;
  return {
    id: str(r, "id"),
    name: str(r, "name"),
    slug: str(r, "slug"),
    brandName: str(r, "brand_name"),
    brandSlug: str(r, "brand_slug"),
    categoryName: str(r, "category_name"),
    categorySlug: str(r, "category_slug"),
    status: str(r, "status"),
    shortDescription: str(r, "short_description"),
    claimedRangeKm: num(r["claimed_range_km"]),
    rangeTestCycle: str(r, "range_test_cycle"),
    batteryKwh: num(r["battery_capacity_kwh"]),
    motorPowerKw: num(r["motor_power_kw"]),
    dcChargingKw: num(r["dc_charging_power_kw"]),
    seating: num(r["seating_capacity"]),
    startingPrice,
    startingPriceLabel: formatInrLakh(startingPrice),
    lastVerified,
    lastVerifiedLabel: formatVerifiedDate(lastVerified),
    isFeatured: Boolean(r["is_featured"]),
    isPopular: Boolean(r["is_popular"]),
    primaryImageUrl: r["primary_image_url"] ? str(r, "primary_image_url") : null,
    primaryImageAlt: r["primary_image_alt"] ? str(r, "primary_image_alt") : null,
  };
}

const LIST_SELECT = `
  SELECT
    v.id, v.name, v.slug, v.status, v.short_description, v.last_verified_at,
    v.is_featured, v.is_popular,
    b.name AS brand_name, b.slug AS brand_slug,
    c.name AS category_name, c.slug AS category_slug,
    bat.battery_capacity_kwh,
    perf.motor_power_kw,
    rng.claimed_range_km, rng.range_test_cycle,
    chg.dc_charging_power_kw,
    dim.seating_capacity,
    (
      SELECT MIN(COALESCE(p.min_price, p.ex_showroom_price))
      FROM vehicle_prices p WHERE p.vehicle_id = v.id
    ) AS min_price,
    (
      SELECT p.verified_at FROM vehicle_prices p
      WHERE p.vehicle_id = v.id ORDER BY p.verified_at DESC LIMIT 1
    ) AS price_verified,
    (
      SELECT i.image_url FROM vehicle_images i
      WHERE i.vehicle_id = v.id AND i.status = 'active'
      ORDER BY i.is_primary DESC, i.sort_order ASC LIMIT 1
    ) AS primary_image_url,
    (
      SELECT i.alt_text FROM vehicle_images i
      WHERE i.vehicle_id = v.id AND i.status = 'active'
      ORDER BY i.is_primary DESC, i.sort_order ASC LIMIT 1
    ) AS primary_image_alt
  FROM vehicles v
  JOIN vehicle_brands b ON b.id = v.brand_id
  JOIN vehicle_categories c ON c.id = v.category_id
  LEFT JOIN battery_specifications bat ON bat.vehicle_id = v.id
  LEFT JOIN vehicle_performance perf ON perf.vehicle_id = v.id
  LEFT JOIN vehicle_range rng ON rng.vehicle_id = v.id
  LEFT JOIN charging_specifications chg ON chg.vehicle_id = v.id
  LEFT JOIN vehicle_dimensions dim ON dim.vehicle_id = v.id
`;

export function listCategories(opts?: { topLevelOnly?: boolean }) {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT id, name, slug, parent_id, description, sort_order,
        (SELECT COUNT(*) FROM vehicles v
           WHERE v.category_id = vehicle_categories.id
             AND v.published = 1 AND v.deleted_at IS NULL) AS vehicle_count
       FROM vehicle_categories
       WHERE status = 'active'
       ${opts?.topLevelOnly ? "AND parent_id IS NULL" : ""}
       ORDER BY sort_order ASC, name ASC`,
    )
    .all() as Row[];
  return rows.map((r) => ({
    id: str(r, "id"),
    name: str(r, "name"),
    slug: str(r, "slug"),
    parentId: r["parent_id"] ? str(r, "parent_id") : null,
    description: str(r, "description"),
    sortOrder: Number(r["sort_order"] ?? 0),
    vehicleCount: Number(r["vehicle_count"] ?? 0),
  }));
}

export function getCategoryBySlug(slug: string) {
  const db = ensure();
  const r = db
    .prepare(
      `SELECT id, name, slug, parent_id, description FROM vehicle_categories
       WHERE slug = ? AND status = 'active'`,
    )
    .get(slug) as Row | undefined;
  if (!r) return null;
  return {
    id: str(r, "id"),
    name: str(r, "name"),
    slug: str(r, "slug"),
    parentId: r["parent_id"] ? str(r, "parent_id") : null,
    description: str(r, "description"),
  };
}

export function listBrands() {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT id, name, slug, description,
        (SELECT COUNT(*) FROM vehicles v
           WHERE v.brand_id = vehicle_brands.id
             AND v.published = 1 AND v.deleted_at IS NULL) AS vehicle_count
       FROM vehicle_brands WHERE status = 'active'
       ORDER BY name ASC`,
    )
    .all() as Row[];
  return rows.map((r) => ({
    id: str(r, "id"),
    name: str(r, "name"),
    slug: str(r, "slug"),
    description: str(r, "description"),
    vehicleCount: Number(r["vehicle_count"] ?? 0),
  }));
}

export type VehicleSearchParams = {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  minRange?: number;
  sort?: "latest" | "popular" | "price-low" | "price-high" | "range-high";
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
};

export function searchVehicles(params: VehicleSearchParams = {}) {
  const db = ensure();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: string[] = [`v.published = 1`, `v.deleted_at IS NULL`];
  const args: Array<string | number> = [];

  if (params.q?.trim()) {
    where.push(
      `(v.name LIKE ? OR v.model_name LIKE ? OR b.name LIKE ? OR c.name LIKE ?)`,
    );
    const like = `%${params.q.trim()}%`;
    args.push(like, like, like, like);
  }
  if (params.categorySlug) {
    where.push(
      `(c.slug = ? OR c.parent_id = (SELECT id FROM vehicle_categories WHERE slug = ? LIMIT 1))`,
    );
    args.push(params.categorySlug, params.categorySlug);
  }
  if (params.brandSlug) {
    where.push(`b.slug = ?`);
    args.push(params.brandSlug);
  }
  if (params.status) {
    where.push(`v.status = ?`);
    args.push(params.status);
  }
  if (params.featuredOnly) {
    where.push(`v.is_featured = 1`);
  }
  if (params.minRange != null) {
    where.push(`COALESCE(rng.claimed_range_km, 0) >= ?`);
    args.push(params.minRange);
  }

  let order = `v.updated_at DESC`;
  switch (params.sort) {
    case "popular":
      order = `v.is_popular DESC, v.is_featured DESC, v.updated_at DESC`;
      break;
    case "price-low":
      order = `(min_price IS NULL), min_price ASC`;
      break;
    case "price-high":
      order = `(min_price IS NULL), min_price DESC`;
      break;
    case "range-high":
      order = `(rng.claimed_range_km IS NULL), rng.claimed_range_km DESC`;
      break;
    case "latest":
    default:
      order = `v.updated_at DESC`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as c FROM vehicles v
       JOIN vehicle_brands b ON b.id = v.brand_id
       JOIN vehicle_categories c ON c.id = v.category_id
       LEFT JOIN vehicle_range rng ON rng.vehicle_id = v.id
       ${whereSql}`,
    )
    .get(...args) as { c: number };

  const rows = db
    .prepare(
      `${LIST_SELECT}
       ${whereSql}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as Row[];

  let items = rows.map(mapListRow);
  if (params.minPrice != null) {
    items = items.filter(
      (i) => i.startingPrice != null && i.startingPrice >= params.minPrice!,
    );
  }
  if (params.maxPrice != null) {
    items = items.filter(
      (i) => i.startingPrice != null && i.startingPrice <= params.maxPrice!,
    );
  }

  return {
    items,
    meta: {
      page,
      limit,
      total: countRow.c,
      totalPages: Math.max(1, Math.ceil(countRow.c / limit)),
    },
  };
}

export function getVehicleBySlug(
  slug: string,
  opts?: { includeUnpublished?: boolean },
): VehicleDetail | null {
  const db = ensure();
  const pubClause = opts?.includeUnpublished
    ? `v.deleted_at IS NULL`
    : `v.published = 1 AND v.deleted_at IS NULL`;
  const r = db
    .prepare(
      `${LIST_SELECT}
       WHERE v.slug = ? AND ${pubClause}`,
    )
    .get(slug) as Row | undefined;
  if (!r) return null;

  const base = mapListRow(r);
  const id = base.id;

  const bat = db
    .prepare(`SELECT * FROM battery_specifications WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const perf = db
    .prepare(`SELECT * FROM vehicle_performance WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const rng = db
    .prepare(`SELECT * FROM vehicle_range WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const chg = db
    .prepare(`SELECT * FROM charging_specifications WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const dim = db
    .prepare(`SELECT * FROM vehicle_dimensions WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const safety = db
    .prepare(`SELECT * FROM vehicle_safety WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const war = db
    .prepare(`SELECT * FROM vehicle_warranty WHERE vehicle_id = ?`)
    .get(id) as Row | undefined;
  const price = db
    .prepare(
      `SELECT * FROM vehicle_prices WHERE vehicle_id = ? ORDER BY verified_at DESC LIMIT 1`,
    )
    .get(id) as Row | undefined;

  const full = db
    .prepare(
      `SELECT model_name, description, seo_title, seo_description, source_name, source_url
       FROM vehicles WHERE id = ?`,
    )
    .get(id) as Row;

  const variants = (
    db
      .prepare(
        `SELECT id, name, slug, battery_capacity_kwh, range_km, motor_power_kw,
                ex_showroom_price, is_default
         FROM vehicle_variants WHERE vehicle_id = ? ORDER BY is_default DESC, name ASC`,
      )
      .all(id) as Row[]
  ).map((v) => ({
    id: str(v, "id"),
    name: str(v, "name"),
    slug: str(v, "slug"),
    batteryKwh: num(v["battery_capacity_kwh"]),
    rangeKm: num(v["range_km"]),
    motorPowerKw: num(v["motor_power_kw"]),
    exShowroomPrice: num(v["ex_showroom_price"]),
    priceLabel: formatInrLakh(num(v["ex_showroom_price"])),
    isDefault: Boolean(v["is_default"]),
  }));

  const features = (
    db
      .prepare(
        `SELECT feature_category, feature_name, feature_value
         FROM vehicle_features WHERE vehicle_id = ? ORDER BY sort_order, feature_category`,
      )
      .all(id) as Row[]
  ).map((f) => ({
    category: str(f, "feature_category"),
    name: str(f, "feature_name"),
    value: str(f, "feature_value"),
  }));

  const faqs = (
    db
      .prepare(
        `SELECT question, answer FROM vehicle_faqs WHERE vehicle_id = ? ORDER BY sort_order`,
      )
      .all(id) as Row[]
  ).map((f) => ({
    question: str(f, "question"),
    answer: str(f, "answer"),
  }));

  const images = (
    db
      .prepare(
        `SELECT image_url, alt_text, image_type, is_primary FROM vehicle_images
         WHERE vehicle_id = ? AND status = 'active' ORDER BY is_primary DESC, sort_order`,
      )
      .all(id) as Row[]
  ).map((img) => ({
    url: str(img, "image_url"),
    alt: str(img, "alt_text", base.name),
    type: str(img, "image_type"),
    isPrimary: Boolean(img["is_primary"]),
  }));

  return {
    ...base,
    modelName: str(full, "model_name"),
    description: str(full, "description"),
    seoTitle: str(full, "seo_title"),
    seoDescription: str(full, "seo_description"),
    sourceName: str(full, "source_name"),
    sourceUrl: str(full, "source_url"),
    batteryChemistry: bat ? str(bat, "battery_chemistry") : "",
    batteryWarrantyYears: bat ? num(bat["battery_warranty_years"]) : null,
    batteryWarrantyKm: bat ? num(bat["battery_warranty_km"]) : null,
    torqueNm: perf ? num(perf["torque_nm"]) : null,
    topSpeedKmph: perf ? num(perf["top_speed_kmph"]) : null,
    acceleration0100: perf ? str(perf, "acceleration_0_100") : "",
    driveType: perf ? str(perf, "drive_type") : "",
    motorType: perf ? str(perf, "motor_type") : "",
    cityRangeKm: rng ? num(rng["city_range_km"]) : null,
    realWorldRangeKm: rng ? num(rng["real_world_range_km"]) : null,
    rangeNotes: rng ? str(rng, "range_notes") : "",
    acChargingKw: chg ? num(chg["ac_charging_power_kw"]) : null,
    acChargingTime: chg ? str(chg, "ac_charging_time") : "",
    dcChargingTime: chg ? str(chg, "dc_fast_charging_time") : "",
    connector: chg ? str(chg, "charging_connector") : "",
    fastCharging: chg ? Boolean(chg["fast_charging_support"]) : false,
    chargingNotes: chg ? str(chg, "charging_notes") : "",
    lengthMm: dim ? num(dim["length_mm"]) : null,
    widthMm: dim ? num(dim["width_mm"]) : null,
    heightMm: dim ? num(dim["height_mm"]) : null,
    groundClearanceMm: dim ? num(dim["ground_clearance_mm"]) : null,
    kerbWeightKg: dim ? num(dim["kerb_weight_kg"]) : null,
    bootLitre: dim ? num(dim["boot_space_litre"]) : null,
    doors: dim ? num(dim["doors"]) : null,
    airbags: safety ? num(safety["airbags"]) : null,
    abs: safety ? Boolean(safety["abs"]) : false,
    esc: safety ? Boolean(safety["esc"]) : false,
    adas: safety ? Boolean(safety["adas"]) : false,
    safetyRating: safety ? str(safety, "safety_rating") : "",
    safetyAgency: safety ? str(safety, "safety_rating_agency") : "",
    vehicleWarrantyYears: war ? num(war["vehicle_warranty_years"]) : null,
    vehicleWarrantyKm: war ? num(war["vehicle_warranty_km"]) : null,
    warrantyNotes: war ? str(war, "warranty_notes") : "",
    variants,
    features,
    faqs,
    images,
    priceSource: price ? str(price, "source") : "",
  };
}

export function getSimilarVehicles(vehicleId: string, limit = 4) {
  const db = ensure();
  const self = db
    .prepare(`SELECT category_id, brand_id FROM vehicles WHERE id = ?`)
    .get(vehicleId) as { category_id: string; brand_id: string } | undefined;
  if (!self) return [];

  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE v.published = 1 AND v.deleted_at IS NULL AND v.id != ?
         AND (v.category_id = ? OR v.brand_id = ?)
       ORDER BY v.is_popular DESC, v.updated_at DESC
       LIMIT ?`,
    )
    .all(vehicleId, self.category_id, self.brand_id, limit) as Row[];
  return rows.map(mapListRow);
}

export function getEvDashboardStats() {
  const db = ensure();
  const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;

  return {
    totalVehicles: one(`SELECT COUNT(*) as c FROM vehicles WHERE deleted_at IS NULL`),
    publishedVehicles: one(
      `SELECT COUNT(*) as c FROM vehicles WHERE published = 1 AND deleted_at IS NULL`,
    ),
    available: one(
      `SELECT COUNT(*) as c FROM vehicles WHERE status = 'available' AND deleted_at IS NULL`,
    ),
    upcoming: one(
      `SELECT COUNT(*) as c FROM vehicles WHERE status = 'upcoming' AND deleted_at IS NULL`,
    ),
    discontinued: one(
      `SELECT COUNT(*) as c FROM vehicles WHERE status = 'discontinued' AND deleted_at IS NULL`,
    ),
    brands: one(`SELECT COUNT(*) as c FROM vehicle_brands WHERE status = 'active'`),
    categories: one(
      `SELECT COUNT(*) as c FROM vehicle_categories WHERE status = 'active'`,
    ),
  };
}

export function adminListVehicles(limit = 200) {
  const db = ensure();
  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE v.deleted_at IS NULL
       ORDER BY v.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as Row[];

  const pub = db
    .prepare(`SELECT id, published FROM vehicles WHERE deleted_at IS NULL`)
    .all() as Array<{ id: string; published: number }>;
  const pubMap = new Map(pub.map((p) => [p.id, Boolean(p.published)]));

  return rows.map((r) => ({
    ...mapListRow(r),
    published: pubMap.get(str(r, "id")) ?? true,
  }));
}

export function getVehiclesForCompare(slugs: string[]) {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].slice(0, 4);
  const vehicles = unique
    .map((slug) => getVehicleBySlug(slug))
    .filter((v): v is VehicleDetail => Boolean(v));
  return { vehicles, requested: unique };
}

export function listVehiclesForPicker(limit = 80) {
  return searchVehicles({ sort: "popular", limit }).items.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    brandName: v.brandName,
    categorySlug: v.categorySlug,
    brandSlug: v.brandSlug,
  }));
}
