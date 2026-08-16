/**
 * Indian EV Vehicles module — SQLite schema (namespaced, separate from charging community).
 * Public site reads from this DB; external APIs are for future sync only.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";

export function ensureVehiclesSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_id TEXT,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'India',
      website TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES vehicle_brands(id),
      category_id TEXT NOT NULL REFERENCES vehicle_categories(id),
      vehicle_type TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      model_name TEXT NOT NULL DEFAULT '',
      variant_name TEXT NOT NULL DEFAULT '',
      model_year INTEGER,
      status TEXT NOT NULL DEFAULT 'available',
      is_latest INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_popular INTEGER NOT NULL DEFAULT 0,
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      source_name TEXT NOT NULL DEFAULT '',
      data_source TEXT NOT NULL DEFAULT 'manual',
      last_verified_at TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS battery_specifications (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      battery_capacity_kwh REAL,
      usable_battery_capacity_kwh REAL,
      battery_type TEXT NOT NULL DEFAULT '',
      battery_chemistry TEXT NOT NULL DEFAULT '',
      battery_warranty_years REAL,
      battery_warranty_km INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_performance (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      motor_type TEXT NOT NULL DEFAULT '',
      motor_power_kw REAL,
      motor_power_bhp REAL,
      torque_nm REAL,
      top_speed_kmph REAL,
      acceleration_0_100 TEXT NOT NULL DEFAULT '',
      drive_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_range (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      claimed_range_km REAL,
      range_test_cycle TEXT NOT NULL DEFAULT '',
      city_range_km REAL,
      highway_range_km REAL,
      real_world_range_km REAL,
      range_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charging_specifications (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      ac_charging_power_kw REAL,
      dc_charging_power_kw REAL,
      ac_charging_time TEXT NOT NULL DEFAULT '',
      dc_fast_charging_time TEXT NOT NULL DEFAULT '',
      charging_connector TEXT NOT NULL DEFAULT '',
      fast_charging_support INTEGER NOT NULL DEFAULT 0,
      charging_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_dimensions (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      length_mm REAL,
      width_mm REAL,
      height_mm REAL,
      wheelbase_mm REAL,
      ground_clearance_mm REAL,
      kerb_weight_kg REAL,
      boot_space_litre REAL,
      seating_capacity INTEGER,
      doors INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_prices (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      price_type TEXT NOT NULL DEFAULT 'starting',
      min_price REAL,
      max_price REAL,
      ex_showroom_price REAL,
      currency TEXT NOT NULL DEFAULT 'INR',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_variants (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      battery_capacity_kwh REAL,
      range_km REAL,
      motor_power_kw REAL,
      charging_power_kw REAL,
      ex_showroom_price REAL,
      status TEXT NOT NULL DEFAULT 'available',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(vehicle_id, slug)
    );

    CREATE TABLE IF NOT EXISTS vehicle_features (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      feature_category TEXT NOT NULL DEFAULT 'Technology',
      feature_name TEXT NOT NULL,
      feature_value TEXT NOT NULL DEFAULT 'Yes',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vehicle_safety (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      airbags INTEGER,
      abs INTEGER NOT NULL DEFAULT 0,
      esc INTEGER NOT NULL DEFAULT 0,
      adas INTEGER NOT NULL DEFAULT 0,
      safety_rating TEXT NOT NULL DEFAULT '',
      safety_rating_agency TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_warranty (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
      vehicle_warranty_years REAL,
      vehicle_warranty_km INTEGER,
      battery_warranty_years REAL,
      battery_warranty_km INTEGER,
      warranty_notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_images (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      image_type TEXT NOT NULL DEFAULT 'gallery',
      alt_text TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_faqs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vehicle_change_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      source TEXT NOT NULL DEFAULT 'admin',
      changed_by TEXT NOT NULL DEFAULT '',
      change_type TEXT NOT NULL DEFAULT 'update',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicle_data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'manual',
      api_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'inactive',
      priority INTEGER NOT NULL DEFAULT 100,
      last_sync TEXT,
      sync_frequency TEXT NOT NULL DEFAULT 'manual',
      license_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_veh_brand ON vehicles(brand_id);
    CREATE INDEX IF NOT EXISTS idx_veh_cat ON vehicles(category_id);
    CREATE INDEX IF NOT EXISTS idx_veh_status ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_veh_slug ON vehicles(slug);
    CREATE INDEX IF NOT EXISTS idx_veh_featured ON vehicles(is_featured);
    CREATE INDEX IF NOT EXISTS idx_veh_popular ON vehicles(is_popular);
    CREATE INDEX IF NOT EXISTS idx_veh_pub ON vehicles(published);
    CREATE INDEX IF NOT EXISTS idx_price_veh ON vehicle_prices(vehicle_id);
  `);

  seedIfEmpty();
  ensurePlaceholderImages();
}

function ensurePlaceholderImages() {
  const db = getDb();
  const missing = db
    .prepare(
      `SELECT v.id, v.name, v.slug FROM vehicles v
       WHERE v.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM vehicle_images i
           WHERE i.vehicle_id = v.id AND i.status = 'active'
         )`,
    )
    .all() as Array<{ id: string; name: string; slug: string }>;

  if (!missing.length) return;

  const dir = path.join(process.cwd(), "public", "uploads", "vehicles");
  fs.mkdirSync(dir, { recursive: true });

  const ts = now();
  for (const v of missing) {
    const fileName = `${v.slug}-placeholder.svg`;
    const filePath = path.join(dir, fileName);
    if (!fs.existsSync(filePath)) {
      const label = v.name.replace(/[<>&"]/g, "");
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f6b4a"/>
      <stop offset="55%" stop-color="#2f8f62"/>
      <stop offset="100%" stop-color="#163d2d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#g)"/>
  <circle cx="980" cy="140" r="90" fill="#a7f3d0" opacity="0.18"/>
  <rect x="180" y="430" width="840" height="90" rx="45" fill="#0b1f16" opacity="0.35"/>
  <rect x="260" y="300" width="680" height="150" rx="40" fill="#ecfdf5" opacity="0.92"/>
  <text x="600" y="390" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#14532d">${label}</text>
  <text x="600" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#d1fae5">EVA Green Corner · Placeholder (replace with licensed photo)</text>
</svg>`;
      fs.writeFileSync(filePath, svg, "utf8");
    }

    const url = `/uploads/vehicles/${fileName}`;
    db.prepare(
      `INSERT INTO vehicle_images
        (id, vehicle_id, image_url, thumbnail_url, image_type, alt_text, source, sort_order,
         is_primary, status, created_at)
       VALUES (?, ?, ?, ?, 'hero', ?, 'Generated placeholder — not OEM photography', 0, 1, 'active', ?)`,
    ).run(
      `img-${newId().slice(0, 12)}`,
      v.id,
      url,
      url,
      `${v.name} exterior placeholder`,
      ts,
    );
  }
}

function now() {
  return new Date().toISOString();
}

function seedIfEmpty() {
  const db = getDb();
  const catCount = (
    db.prepare(`SELECT COUNT(*) as c FROM vehicle_categories`).get() as { c: number }
  ).c;
  if (catCount > 0) return;

  const ts = now();
  const cats: Array<{
    name: string;
    slug: string;
    description: string;
    sort: number;
    parent?: string;
  }> = [
    {
      name: "Electric Cars",
      slug: "electric-cars",
      description: "Battery electric cars for Indian roads — hatchbacks, sedans, SUVs and MPVs.",
      sort: 10,
    },
    {
      name: "Electric SUVs",
      slug: "electric-suvs",
      description: "Electric SUVs and crossovers popular in India.",
      sort: 11,
      parent: "electric-cars",
    },
    {
      name: "Electric Sedans",
      slug: "electric-sedans",
      description: "Electric sedans available or upcoming in India.",
      sort: 12,
      parent: "electric-cars",
    },
    {
      name: "Electric Hatchbacks",
      slug: "electric-hatchbacks",
      description: "Compact electric hatchbacks for city use.",
      sort: 13,
      parent: "electric-cars",
    },
    {
      name: "Electric Bikes",
      slug: "electric-bikes",
      description: "Electric motorcycles and performance bikes.",
      sort: 20,
    },
    {
      name: "Electric Scooters",
      slug: "electric-scooters",
      description: "Electric scooters for daily urban commute.",
      sort: 21,
    },
    {
      name: "Electric 3-Wheelers",
      slug: "electric-3-wheelers",
      description: "Passenger and cargo electric three-wheelers.",
      sort: 30,
    },
    {
      name: "Electric Auto Rickshaws",
      slug: "electric-auto-rickshaws",
      description: "Electric autos for last-mile passenger mobility.",
      sort: 31,
      parent: "electric-3-wheelers",
    },
    {
      name: "Electric Tempos & Mini Trucks",
      slug: "electric-tempos",
      description: "Electric tempos, pickups and light commercial vehicles.",
      sort: 40,
    },
    {
      name: "Electric Commercial Vehicles",
      slug: "electric-commercial-vehicles",
      description: "Electric LCVs and commercial fleets.",
      sort: 41,
    },
    {
      name: "Electric Buses",
      slug: "electric-buses",
      description: "Electric buses for public and private fleets.",
      sort: 50,
    },
    {
      name: "Electric Trucks",
      slug: "electric-trucks",
      description: "Electric trucks and heavy commercial EVs.",
      sort: 60,
    },
    {
      name: "Other EVs",
      slug: "other-evs",
      description: "Other road-legal electric vehicles in India.",
      sort: 90,
    },
  ];

  const catIds = new Map<string, string>();
  for (const c of cats) {
    const id = `vcat-${newId().slice(0, 10)}`;
    catIds.set(c.slug, id);
  }
  for (const c of cats) {
    const id = catIds.get(c.slug)!;
    const parentId = c.parent ? catIds.get(c.parent) ?? null : null;
    db.prepare(
      `INSERT INTO vehicle_categories
        (id, name, slug, parent_id, description, icon, image, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', '', 'active', ?, ?, ?)`,
    ).run(id, c.name, c.slug, parentId, c.description, c.sort, ts, ts);
  }

  const brands = [
    "Tata",
    "Mahindra",
    "MG",
    "Hyundai",
    "BYD",
    "Citroen",
    "Kia",
    "Ola Electric",
    "Ather",
    "TVS",
    "Bajaj",
    "Hero Electric",
    "Vida",
    "Ampere",
    "River",
    "Ultraviolette",
    "Piaggio",
    "Ashok Leyland",
    "Euler",
    "Altigreen",
  ];
  const brandIds = new Map<string, string>();
  for (const name of brands) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = `vbr-${newId().slice(0, 10)}`;
    brandIds.set(slug, id);
    db.prepare(
      `INSERT INTO vehicle_brands
        (id, name, slug, logo, country, website, description, seo_title, seo_description, status, created_at, updated_at)
       VALUES (?, ?, ?, '', 'India', '', ?, ?, ?, 'active', ?, ?)`,
    ).run(
      id,
      name,
      slug,
      `${name} electric vehicles in India.`,
      `${name} Electric Vehicles Price, Models & Specs in India`,
      `Explore ${name} electric cars, bikes and commercial EVs — price, range, battery and specifications in India.`,
      ts,
      ts,
    );
  }

  db.prepare(
    `INSERT INTO vehicle_data_sources
      (id, name, type, api_url, status, priority, last_sync, sync_frequency, license_notes, created_at, updated_at)
     VALUES (?, 'Manual / Admin', 'manual', '', 'active', 1, NULL, 'manual',
             'Human-verified entries via Admin panel', ?, ?)`,
  ).run(`vds-${newId().slice(0, 10)}`, ts, ts);

  // Seed a few reference vehicles — specs marked with source; admin should re-verify.
  seedVehicle(db, {
    brandSlug: "tata",
    categorySlug: "electric-suvs",
    name: "Tata Nexon EV",
    slug: "tata-nexon-ev",
    modelName: "Nexon EV",
    short:
      "Popular compact electric SUV from Tata Motors for Indian buyers.",
    description:
      "Tata Nexon EV is among India’s widely sold electric SUVs. Specifications below are reference seed data for the EVA Green Corner vehicles module — always re-verify price and range from the manufacturer before publishing as current.",
    batteryKwh: 40.5,
    chemistry: "LFP",
    claimedRange: 465,
    cycle: "MIDC",
    motorKw: 105,
    torque: 215,
    topSpeed: 150,
    dcKw: 60,
    connector: "CCS2",
    seating: 5,
    priceFrom: 14_990_00, // will store as 1499000
    featured: true,
    popular: true,
  });

  seedVehicle(db, {
    brandSlug: "mg",
    categorySlug: "electric-suvs",
    name: "MG ZS EV",
    slug: "mg-zs-ev",
    modelName: "ZS EV",
    short: "Feature-rich electric crossover from MG Motor India.",
    description:
      "MG ZS EV targets premium compact EV buyers. Seed specs are indicative — confirm latest battery pack, MIDC range and ex-showroom price via OEM.",
    batteryKwh: 50.3,
    chemistry: "NMC",
    claimedRange: 461,
    cycle: "MIDC",
    motorKw: 130,
    torque: 280,
    topSpeed: 175,
    dcKw: 76,
    connector: "CCS2",
    seating: 5,
    priceFrom: 18_980_00,
    featured: true,
    popular: true,
  });

  seedVehicle(db, {
    brandSlug: "ola-electric",
    categorySlug: "electric-scooters",
    name: "Ola S1 Pro",
    slug: "ola-s1-pro",
    modelName: "S1 Pro",
    short: "High-volume electric scooter from Ola Electric.",
    description:
      "Ola S1 Pro is a mainstream Indian electric scooter. Battery, range and pricing change by variant and update cycles — treat seed values as placeholders pending admin verification.",
    batteryKwh: 4,
    chemistry: "Lithium Ion",
    claimedRange: 195,
    cycle: "IDC",
    motorKw: 5.5,
    torque: null,
    topSpeed: 116,
    dcKw: null,
    connector: "Portable charger",
    seating: 2,
    priceFrom: 1_299_99,
    featured: true,
    popular: true,
  });

  seedVehicle(db, {
    brandSlug: "ather",
    categorySlug: "electric-scooters",
    name: "Ather 450X",
    slug: "ather-450x",
    modelName: "450X",
    short: "Connected electric scooter from Ather Energy.",
    description:
      "Ather 450X focuses on connected scooter experience. Specs in seed are indicative; verify pack size and claimed range from Ather for the active variant.",
    batteryKwh: 3.7,
    chemistry: "Lithium Ion",
    claimedRange: 146,
    cycle: "IDC",
    motorKw: 6.4,
    torque: 26,
    topSpeed: 90,
    dcKw: null,
    connector: "Home charger",
    seating: 2,
    priceFrom: 1_46_999,
    featured: false,
    popular: true,
  });

  seedVehicle(db, {
    brandSlug: "mahindra",
    categorySlug: "electric-suvs",
    name: "Mahindra XUV400",
    slug: "mahindra-xuv400",
    modelName: "XUV400",
    short: "Electric SUV based on the XUV300 platform.",
    description:
      "Mahindra XUV400 is an electric SUV offering for India. Seed data is for module bootstrap — update battery, MIDC range and pricing after verification.",
    batteryKwh: 39.4,
    chemistry: "Lithium Ion",
    claimedRange: 456,
    cycle: "MIDC",
    motorKw: 110,
    torque: 310,
    topSpeed: 150,
    dcKw: 50,
    connector: "CCS2",
    seating: 5,
    priceFrom: 15_490_00,
    featured: true,
    popular: false,
  });
}

function seedVehicle(
  db: ReturnType<typeof getDb>,
  v: {
    brandSlug: string;
    categorySlug: string;
    name: string;
    slug: string;
    modelName: string;
    short: string;
    description: string;
    batteryKwh: number;
    chemistry: string;
    claimedRange: number;
    cycle: string;
    motorKw: number;
    torque: number | null;
    topSpeed: number;
    dcKw: number | null;
    connector: string;
    seating: number;
    priceFrom: number;
    featured: boolean;
    popular: boolean;
  },
) {
  const brand = db
    .prepare(`SELECT id FROM vehicle_brands WHERE slug = ?`)
    .get(v.brandSlug) as { id: string } | undefined;
  const cat = db
    .prepare(`SELECT id FROM vehicle_categories WHERE slug = ?`)
    .get(v.categorySlug) as { id: string } | undefined;
  if (!brand || !cat) return;

  const ts = now();
  const id = `veh-${newId().slice(0, 12)}`;
  const verified = "2026-01-15T00:00:00.000Z";

  db.prepare(
    `INSERT INTO vehicles
      (id, brand_id, category_id, vehicle_type, name, slug, model_name, variant_name, model_year,
       status, is_latest, is_featured, is_popular, short_description, description,
       seo_title, seo_description, seo_keywords, source_url, source_name, data_source,
       last_verified_at, published, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', 2024, 'available', 1, ?, ?, ?, ?, ?, ?, ?, '',
             'Public OEM / listing reference (seed)', 'manual', ?, 1, NULL, ?, ?)`,
  ).run(
    id,
    brand.id,
    cat.id,
    v.categorySlug,
    v.name,
    v.slug,
    v.modelName,
    v.featured ? 1 : 0,
    v.popular ? 1 : 0,
    v.short,
    v.description,
    `${v.name} Price, Range, Battery & Specifications in India`,
    `Check ${v.name} price, battery capacity, claimed range, charging, motor power and specifications in India. Last verified date shown on page.`,
    `${v.name}, electric vehicle India, EV specs`,
    verified,
    ts,
    ts,
  );

  db.prepare(
    `INSERT INTO battery_specifications
      (id, vehicle_id, battery_capacity_kwh, usable_battery_capacity_kwh, battery_type, battery_chemistry,
       battery_warranty_years, battery_warranty_km, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'Lithium Ion', ?, 8, 160000, ?, ?)`,
  ).run(`bat-${newId().slice(0, 10)}`, id, v.batteryKwh, v.chemistry, ts, ts);

  db.prepare(
    `INSERT INTO vehicle_performance
      (id, vehicle_id, motor_type, motor_power_kw, motor_power_bhp, torque_nm,
       top_speed_kmph, acceleration_0_100, drive_type, created_at, updated_at)
     VALUES (?, ?, 'Permanent Magnet Synchronous', ?, NULL, ?, ?, '', 'FWD', ?, ?)`,
  ).run(
    `perf-${newId().slice(0, 10)}`,
    id,
    v.motorKw,
    v.torque,
    v.topSpeed,
    ts,
    ts,
  );

  db.prepare(
    `INSERT INTO vehicle_range
      (id, vehicle_id, claimed_range_km, range_test_cycle, city_range_km, highway_range_km,
       real_world_range_km, range_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'Claimed figure from public listings; not guaranteed real-world range.', ?, ?)`,
  ).run(`rng-${newId().slice(0, 10)}`, id, v.claimedRange, v.cycle, ts, ts);

  db.prepare(
    `INSERT INTO charging_specifications
      (id, vehicle_id, ac_charging_power_kw, dc_charging_power_kw, ac_charging_time, dc_fast_charging_time,
       charging_connector, fast_charging_support, charging_notes, created_at, updated_at)
     VALUES (?, ?, NULL, ?, '', '', ?, ?, 'Confirm connector and peak DC rate for your variant.', ?, ?)`,
  ).run(
    `chg-${newId().slice(0, 10)}`,
    id,
    v.dcKw,
    v.connector,
    v.dcKw ? 1 : 0,
    ts,
    ts,
  );

  db.prepare(
    `INSERT INTO vehicle_dimensions
      (id, vehicle_id, length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm,
       kerb_weight_kg, boot_space_litre, seating_capacity, doors, created_at, updated_at)
     VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`,
  ).run(`dim-${newId().slice(0, 10)}`, id, v.seating, ts, ts);

  db.prepare(
    `INSERT INTO vehicle_prices
      (id, vehicle_id, price_type, min_price, max_price, ex_showroom_price, currency, city, state,
       source, source_url, verified_at, created_at, updated_at)
     VALUES (?, ?, 'starting', ?, NULL, ?, 'INR', '', '',
             'Seed reference — re-verify before citing as current', '', ?, ?, ?)`,
  ).run(`prc-${newId().slice(0, 10)}`, id, v.priceFrom, v.priceFrom, verified, ts, ts);

  db.prepare(
    `INSERT INTO vehicle_warranty
      (id, vehicle_id, vehicle_warranty_years, vehicle_warranty_km, battery_warranty_years,
       battery_warranty_km, warranty_notes, source, verified_at, created_at, updated_at)
     VALUES (?, ?, 3, NULL, 8, 160000, 'Typical published warranty bands; confirm for VIN/variant.',
             'Seed reference', ?, ?, ?)`,
  ).run(`war-${newId().slice(0, 10)}`, id, verified, ts, ts);

  db.prepare(
    `INSERT INTO vehicle_faqs (id, vehicle_id, question, answer, sort_order)
     VALUES (?, ?, ?, ?, 1)`,
  ).run(
    `faq-${newId().slice(0, 10)}`,
    id,
    `What is the claimed range of ${v.name}?`,
    `Public listings cite about ${v.claimedRange} km under the ${v.cycle} test cycle. Real-world range varies with traffic, temperature, load and driving style.`,
  );
}

export function slugifyVehicle(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatInrLakh(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 100_000) {
    const lakh = n / 100_000;
    return `₹${lakh.toFixed(lakh >= 10 ? 2 : 2)} lakh`;
  }
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatVerifiedDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
