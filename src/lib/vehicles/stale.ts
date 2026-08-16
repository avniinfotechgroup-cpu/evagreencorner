import { getDb } from "@/lib/community/db";
import { ensureVehiclesSchema } from "./schema";
import { getSetting } from "./settings";

export type StaleFlags = {
  priceStaleDays: number;
  specsStaleDays: number;
  priceNeedsVerification: number;
  specsNeedVerification: number;
  brokenImageCandidates: number;
  staleVehicles: Array<{
    id: string;
    name: string;
    slug: string;
    reason: "price" | "specs" | "both";
    lastVerified: string | null;
  }>;
};

export function getStaleFlags(): StaleFlags {
  ensureVehiclesSchema();
  const db = getDb();
  const priceDays = Number(getSetting("stale_price_days", "30")) || 30;
  const specsDays = Number(getSetting("stale_specs_days", "90")) || 90;

  const cutoffPrice = new Date(Date.now() - priceDays * 86400000).toISOString();
  const cutoffSpecs = new Date(Date.now() - specsDays * 86400000).toISOString();

  const rows = db
    .prepare(
      `SELECT v.id, v.name, v.slug, v.last_verified_at,
        (SELECT p.verified_at FROM vehicle_prices p
          WHERE p.vehicle_id = v.id ORDER BY p.verified_at DESC LIMIT 1) AS price_verified
       FROM vehicles v
       WHERE v.deleted_at IS NULL AND v.published = 1`,
    )
    .all() as Array<{
    id: string;
    name: string;
    slug: string;
    last_verified_at: string | null;
    price_verified: string | null;
  }>;

  const staleVehicles: StaleFlags["staleVehicles"] = [];
  let priceNeedsVerification = 0;
  let specsNeedVerification = 0;

  for (const r of rows) {
    const priceOk = r.price_verified && r.price_verified >= cutoffPrice;
    const specsOk = r.last_verified_at && r.last_verified_at >= cutoffSpecs;
    if (priceOk && specsOk) continue;

    let reason: "price" | "specs" | "both" = "specs";
    if (!priceOk && !specsOk) {
      reason = "both";
      priceNeedsVerification += 1;
      specsNeedVerification += 1;
    } else if (!priceOk) {
      reason = "price";
      priceNeedsVerification += 1;
    } else {
      reason = "specs";
      specsNeedVerification += 1;
    }

    staleVehicles.push({
      id: r.id,
      name: r.name,
      slug: r.slug,
      reason,
      lastVerified: r.last_verified_at || r.price_verified,
    });
  }

  const brokenImageCandidates = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM vehicles v
         WHERE v.deleted_at IS NULL AND v.published = 1
           AND NOT EXISTS (
             SELECT 1 FROM vehicle_images i
             WHERE i.vehicle_id = v.id AND i.status = 'active'
           )`,
      )
      .get() as { c: number }
  ).c;

  return {
    priceStaleDays: priceDays,
    specsStaleDays: specsDays,
    priceNeedsVerification,
    specsNeedVerification,
    brokenImageCandidates,
    staleVehicles: staleVehicles.slice(0, 40),
  };
}

/** Daily/weekly job entrypoint (callable from admin or external cron). */
export async function runEvMaintenanceJobs() {
  const { runVehicleSync } = await import("./sync");
  const syncEnabled = (process.env["EV_SYNC_ENABLED"] || "false").toLowerCase() === "true";
  const sync = syncEnabled ? await runVehicleSync() : [];
  const stale = getStaleFlags();
  const { writeEvSitemapFile } = await import("./sitemap");
  const sitemap = writeEvSitemapFile();
  return { sync, stale, sitemap };
}
