import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/community/auth.server";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureVehiclesSchema, slugifyVehicle } from "./schema";
import { adminListVehicles, getEvDashboardStats, listBrands, listCategories } from "./queries";

function now() {
  return new Date().toISOString();
}

export const adminEvDashboard = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureVehiclesSchema();
    const { computeCompleteness } = await import("./completeness");
    const { getStaleFlags } = await import("./stale");
    const { listPendingUpdates, listSyncRuns } = await import("./sync");

    const vehicles = adminListVehicles(100);
    const withScore = vehicles.map((v) => {
      // Use list-row fields only — avoid loading full detail (heavy + fragile over RPC).
      const completeness = computeCompleteness({
        startingPrice: v.startingPrice,
        batteryKwh: v.batteryKwh,
        claimedRangeKm: v.claimedRangeKm,
        rangeTestCycle: v.rangeTestCycle,
        dcChargingKw: v.dcChargingKw,
        connector: "",
        motorPowerKw: v.motorPowerKw,
        seating: v.seating,
        lengthMm: null,
        safetyRating: "",
        vehicleWarrantyYears: null,
        batteryWarrantyYears: null,
        images: v.primaryImageUrl
          ? [{ url: v.primaryImageUrl, alt: v.primaryImageAlt ?? "", type: "hero", isPrimary: true }]
          : [],
        sourceName: "",
        lastVerified: v.lastVerified,
        priceSource: "",
      });
      return { ...v, completeness };
    });

    return {
      stats: getEvDashboardStats(),
      vehicles: withScore,
      brands: listBrands(),
      categories: listCategories(),
      stale: getStaleFlags(),
      pendingCount: listPendingUpdates(5).length,
      lastSyncRuns: listSyncRuns(5),
      apiConfigured: Boolean(
        process.env["EV_API_URL"]?.trim() || process.env["VEHICLE_API_URL"]?.trim(),
      ),
    };
  });

const vehicleInput = z.object({
  brandId: z.string().min(3),
  categoryId: z.string().min(3),
  name: z.string().min(2).max(200),
  modelName: z.string().max(120).optional(),
  shortDescription: z.string().max(400).optional(),
  description: z.string().max(5000).optional(),
  status: z
    .enum(["upcoming", "available", "discontinued", "temporarily_unavailable"])
    .default("available"),
  batteryKwh: z.coerce.number().positive().optional().nullable(),
  batteryChemistry: z.string().max(40).optional(),
  claimedRangeKm: z.coerce.number().positive().optional().nullable(),
  rangeTestCycle: z.string().max(40).optional(),
  motorPowerKw: z.coerce.number().nonnegative().optional().nullable(),
  torqueNm: z.coerce.number().nonnegative().optional().nullable(),
  topSpeedKmph: z.coerce.number().positive().optional().nullable(),
  dcChargingKw: z.coerce.number().positive().optional().nullable(),
  connector: z.string().max(80).optional(),
  seating: z.coerce.number().int().positive().optional().nullable(),
  startingPrice: z.coerce.number().nonnegative().optional().nullable(),
  priceSource: z.string().max(200).optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  published: z.boolean().optional(),
  sourceName: z.string().max(200).optional(),
});

export const adminAddVehicle = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), vehicle: vehicleInput }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureVehiclesSchema();
    const db = getDb();
    const v = data.vehicle;
    const ts = now();
    const id = `veh-${newId().slice(0, 12)}`;
    let slug = slugifyVehicle(v.name);
    const clash = db.prepare(`SELECT id FROM vehicles WHERE slug = ?`).get(slug);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

    if (v.batteryKwh != null && v.batteryKwh <= 0) {
      throw new Error("Battery capacity must be greater than 0.");
    }
    if (v.claimedRangeKm != null && v.claimedRangeKm <= 0) {
      throw new Error("Range must be specified in kilometres (> 0).");
    }
    if (v.startingPrice != null && v.startingPrice > 0 && !v.priceSource?.trim()) {
      throw new Error("Price source is required when entering a verified price.");
    }

    db.prepare(
      `INSERT INTO vehicles
        (id, brand_id, category_id, vehicle_type, name, slug, model_name, variant_name,
         model_year, status, is_latest, is_featured, is_popular, short_description, description,
         seo_title, seo_description, seo_keywords, source_url, source_name, data_source,
         last_verified_at, published, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, ?, '', NULL, ?, 1, ?, ?, ?, ?, ?, ?, '', '', ?, 'manual',
               ?, ?, NULL, ?, ?)`,
    ).run(
      id,
      v.brandId,
      v.categoryId,
      v.name,
      slug,
      v.modelName ?? "",
      v.status,
      v.isFeatured ? 1 : 0,
      v.isPopular ? 1 : 0,
      v.shortDescription ?? "",
      v.description ?? "",
      `${v.name} Price, Range, Battery & Specifications in India`,
      `Check ${v.name} price, battery capacity, claimed range, charging, motor power and specifications in India.`,
      v.sourceName ?? "Admin verified",
      ts,
      v.published === false ? 0 : 1,
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
      v.batteryKwh ?? null,
      v.batteryChemistry ?? "",
      ts,
      ts,
    );

    db.prepare(
      `INSERT INTO vehicle_performance
        (id, vehicle_id, motor_type, motor_power_kw, motor_power_bhp, torque_nm,
         top_speed_kmph, acceleration_0_100, drive_type, created_at, updated_at)
       VALUES (?, ?, '', ?, NULL, ?, ?, '', '', ?, ?)`,
    ).run(
      `perf-${newId().slice(0, 10)}`,
      id,
      v.motorPowerKw ?? null,
      v.torqueNm ?? null,
      v.topSpeedKmph ?? null,
      ts,
      ts,
    );

    db.prepare(
      `INSERT INTO vehicle_range
        (id, vehicle_id, claimed_range_km, range_test_cycle, city_range_km, highway_range_km,
         real_world_range_km, range_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, '', ?, ?)`,
    ).run(
      `rng-${newId().slice(0, 10)}`,
      id,
      v.claimedRangeKm ?? null,
      v.rangeTestCycle ?? "",
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
      v.dcChargingKw ?? null,
      v.connector ?? "",
      v.dcChargingKw ? 1 : 0,
      ts,
      ts,
    );

    db.prepare(
      `INSERT INTO vehicle_dimensions
        (id, vehicle_id, length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm,
         kerb_weight_kg, boot_space_litre, seating_capacity, doors, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`,
    ).run(`dim-${newId().slice(0, 10)}`, id, v.seating ?? null, ts, ts);

    if (v.startingPrice != null && v.startingPrice >= 0) {
      db.prepare(
        `INSERT INTO vehicle_prices
          (id, vehicle_id, price_type, min_price, max_price, ex_showroom_price, currency,
           city, state, source, source_url, verified_at, created_at, updated_at)
         VALUES (?, ?, 'starting', ?, NULL, ?, 'INR', '', '', ?, '', ?, ?, ?)`,
      ).run(
        `prc-${newId().slice(0, 10)}`,
        id,
        v.startingPrice,
        v.startingPrice,
        v.priceSource ?? "Admin",
        ts,
        ts,
        ts,
      );
    }

    db.prepare(
      `INSERT INTO vehicle_change_logs
        (id, vehicle_id, field_name, old_value, new_value, source, changed_by, change_type, created_at)
       VALUES (?, ?, 'vehicle', NULL, ?, 'admin', 'admin', 'create', ?)`,
    ).run(`log-${newId().slice(0, 10)}`, id, v.name, ts);

    return { id, slug };
  });

export const adminToggleVehiclePublish = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(3),
        published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureVehiclesSchema();
    const db = getDb();
    db.prepare(`UPDATE vehicles SET published = ?, updated_at = ? WHERE id = ?`).run(
      data.published ? 1 : 0,
      now(),
      data.id,
    );
    return { ok: true as const };
  });

export const adminSoftDeleteVehicle = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureVehiclesSchema();
    const db = getDb();
    const ts = now();
    db.prepare(
      `UPDATE vehicles SET deleted_at = ?, published = 0, updated_at = ? WHERE id = ?`,
    ).run(ts, ts, data.id);
    db.prepare(
      `INSERT INTO vehicle_change_logs
        (id, vehicle_id, field_name, old_value, new_value, source, changed_by, change_type, created_at)
       VALUES (?, ?, 'deleted_at', NULL, ?, 'admin', 'admin', 'soft_delete', ?)`,
    ).run(`log-${newId().slice(0, 10)}`, data.id, ts, ts);
    return { ok: true as const };
  });

export const adminAddBrand = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        name: z.string().min(2).max(120),
        description: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureVehiclesSchema();
    const db = getDb();
    const ts = now();
    const slug = slugifyVehicle(data.name);
    const existing = db.prepare(`SELECT id FROM vehicle_brands WHERE slug = ?`).get(slug);
    if (existing) throw new Error("Brand already exists.");
    const id = `vbr-${newId().slice(0, 10)}`;
    db.prepare(
      `INSERT INTO vehicle_brands
        (id, name, slug, logo, country, website, description, seo_title, seo_description,
         status, created_at, updated_at)
       VALUES (?, ?, ?, '', 'India', '', ?, ?, ?, 'active', ?, ?)`,
    ).run(
      id,
      data.name,
      slug,
      data.description ?? `${data.name} electric vehicles in India.`,
      `${data.name} Electric Vehicles Price, Models & Specs in India`,
      `Explore ${data.name} electric vehicles — price, range, battery and specifications in India.`,
      ts,
      ts,
    );
    return { id, slug };
  });

export const adminPreviewEvCsv = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ token: z.string().min(10), csv: z.string().min(10).max(2_000_000) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { previewVehicleCsv } = await import("./csv");
    const preview = previewVehicleCsv(data.csv);
    return {
      headers: preview.headers,
      validCount: preview.validCount,
      errorCount: preview.errorCount,
      rows: preview.rows.map((r) => ({
        row: r.row,
        ok: r.ok,
        errors: r.errors,
        name: r.draft?.name ?? "",
      })),
    };
  });

export const adminImportEvCsv = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        csv: z.string().min(10).max(2_000_000),
        mode: z.enum(["create_unpublished", "pending_only"]).default("pending_only"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { importVehicleCsv } = await import("./csv");
    return importVehicleCsv(data.csv, data.mode);
  });

export const adminRunEvSync = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { runVehicleSync } = await import("./sync");
    const results = await runVehicleSync();
    const configured = Boolean(
      process.env["EV_API_URL"]?.trim() || process.env["VEHICLE_API_URL"]?.trim(),
    );
    return {
      results,
      configured,
      hint: configured
        ? null
        : "No EV_API_URL / VEHICLE_API_URL set — sync ran but fetched 0 remote vehicles. Add keys in .env to pull OEM feeds.",
    };
  });

export const adminRunEvJobs = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { runEvMaintenanceJobs } = await import("./stale");
    return runEvMaintenanceJobs();
  });

export const adminListPendingEv = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { listPendingUpdates, listSyncRuns } = await import("./sync");
    const { getStaleFlags } = await import("./stale");
    return {
      pending: listPendingUpdates(40).map((p) => ({
        id: p.id,
        vehicleId: p.vehicleId,
        duplicateKey: p.duplicateKey,
        name: p.payload.name,
        brandName: p.payload.brandName,
        source: p.source,
        status: p.status,
        createdAt: p.createdAt,
      })),
      syncRuns: listSyncRuns(15).map((r) => ({
        id: r.id,
        providerId: r.provider_id,
        status: r.status,
        fetched: r.fetched,
        pending: r.pending,
        matched: r.matched,
        errorSummary: r.error_summary,
        createdAt: r.created_at,
      })),
      stale: getStaleFlags(),
    };
  });

export const adminReviewPendingEv = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(3),
        status: z.enum(["approved", "rejected"]),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { setPendingStatus } = await import("./sync");
    setPendingStatus(data.id, data.status, data.notes ?? "");
    return { ok: true as const };
  });

export const adminUploadVehicleImage = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        vehicleId: z.string().min(3),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64: z.string().min(32).max(8_000_000),
        altText: z.string().min(3).max(200),
        imageType: z.string().max(40).optional(),
        isPrimary: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { saveVehicleImage } = await import("./images");
    const params: {
      vehicleId: string;
      mimeType: string;
      base64: string;
      altText: string;
      imageType?: string;
      isPrimary?: boolean;
    } = {
      vehicleId: data.vehicleId,
      mimeType: data.mimeType,
      base64: data.base64,
      altText: data.altText,
    };
    if (data.imageType) params.imageType = data.imageType;
    if (data.isPrimary != null) params.isPrimary = data.isPrimary;
    return saveVehicleImage(params);
  });

export const adminRefreshEvSitemap = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { writeEvSitemapFile } = await import("./sitemap");
    return writeEvSitemapFile();
  });
