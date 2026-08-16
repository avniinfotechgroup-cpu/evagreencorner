import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureVehiclesSchema } from "./schema";
import { getRegisteredProviders, type ProviderVehicleDraft } from "./providers";
import { duplicateKey } from "./providers/types";

function now() {
  return new Date().toISOString();
}

export type SyncResult = {
  providerId: string;
  fetched: number;
  createdPending: number;
  matchedExisting: number;
  errors: string[];
};

function ensureSyncTables() {
  ensureVehiclesSchema();
  const db = getDb();
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS vehicle_sync_runs (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      status TEXT NOT NULL,
      fetched INTEGER NOT NULL DEFAULT 0,
      pending INTEGER NOT NULL DEFAULT 0,
      matched INTEGER NOT NULL DEFAULT 0,
      error_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pending_status ON vehicle_pending_updates(status);
  `);
}

function findVehicleByKey(key: string): string | null {
  const db = getDb();
  const [brandPart, modelPart] = key.split("|");
  if (!brandPart || !modelPart) return null;
  const row = db
    .prepare(
      `SELECT v.id FROM vehicles v
       JOIN vehicle_brands b ON b.id = v.brand_id
       WHERE v.deleted_at IS NULL
         AND lower(replace(replace(b.slug, ' ', '-'), '--', '-')) LIKE ?
         AND (lower(v.slug) LIKE ? OR lower(v.model_name) LIKE ? OR lower(v.name) LIKE ?)
       LIMIT 1`,
    )
    .get(`%${brandPart}%`, `%${modelPart}%`, `%${modelPart}%`, `%${modelPart}%`) as
    | { id: string }
    | undefined;
  return row?.id ?? null;
}

function validateDraft(d: ProviderVehicleDraft): string | null {
  if (!d.brandName?.trim() || !d.name?.trim()) return "Missing brand or name";
  if (d.batteryKwh != null && d.batteryKwh <= 0) return "Invalid battery";
  if (d.claimedRangeKm != null && d.claimedRangeKm <= 0) return "Invalid range";
  if (d.startingPrice != null && d.startingPrice < 0) return "Invalid price";
  if (d.motorPowerKw != null && d.motorPowerKw < 0) return "Invalid motor power";
  return null;
}

/** Persist pending queue without circular/huge `raw` API blobs. */
function draftToJson(draft: ProviderVehicleDraft): string {
  const { raw: _raw, ...safe } = draft;
  try {
    return JSON.stringify(safe);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Could not serialize vehicle draft: ${err.message}`
        : "Could not serialize vehicle draft",
    );
  }
}

/** Sync external providers into pending queue — never auto-publishes critical fields. */
export async function runVehicleSync(opts?: {
  providerIds?: string[];
}): Promise<SyncResult[]> {
  ensureSyncTables();
  const db = getDb();
  const providers = getRegisteredProviders().filter(
    (p) => p.id !== "manual" && (!opts?.providerIds || opts.providerIds.includes(p.id)),
  );

  const results: SyncResult[] = [];

  for (const provider of providers) {
    const result: SyncResult = {
      providerId: provider.id,
      fetched: 0,
      createdPending: 0,
      matchedExisting: 0,
      errors: [],
    };

    let drafts: ProviderVehicleDraft[] = [];
    try {
      drafts = await provider.fetchVehicles();
      result.fetched = drafts.length;
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : "Fetch failed");
      db.prepare(
        `INSERT INTO vehicle_sync_runs
          (id, provider_id, status, fetched, pending, matched, error_summary, created_at)
         VALUES (?, ?, 'error', 0, 0, 0, ?, ?)`,
      ).run(
        `sync-${newId().slice(0, 10)}`,
        provider.id,
        result.errors.join("; "),
        now(),
      );
      results.push(result);
      continue;
    }

    const ts = now();
    for (const draft of drafts) {
      const invalid = validateDraft(draft);
      if (invalid) {
        result.errors.push(`${draft.name}: ${invalid}`);
        continue;
      }
      const key = duplicateKey(draft);
      const existingId = findVehicleByKey(key);
      if (existingId) result.matchedExisting += 1;

      try {
        db.prepare(
          `INSERT INTO vehicle_pending_updates
            (id, vehicle_id, duplicate_key, payload_json, source, status, review_notes, created_at, reviewed_at)
           VALUES (?, ?, ?, ?, ?, 'pending', '', ?, NULL)`,
        ).run(
          `pend-${newId().slice(0, 12)}`,
          existingId,
          key,
          draftToJson(draft),
          provider.name,
          ts,
        );
        result.createdPending += 1;
      } catch (err) {
        result.errors.push(
          `${draft.name}: ${err instanceof Error ? err.message : "insert failed"}`,
        );
      }
    }

    db.prepare(
      `UPDATE vehicle_data_sources SET last_sync = ?, updated_at = ? WHERE type != 'manual' OR name LIKE ?`,
    ).run(ts, ts, `%${provider.name.split(" ")[0]}%`);

    db.prepare(
      `INSERT INTO vehicle_sync_runs
        (id, provider_id, status, fetched, pending, matched, error_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `sync-${newId().slice(0, 10)}`,
      provider.id,
      result.errors.length ? "partial" : "ok",
      result.fetched,
      result.createdPending,
      result.matchedExisting,
      result.errors.slice(0, 5).join("; "),
      ts,
    );

    results.push(result);
  }

  return results;
}

export function listPendingUpdates(limit = 50) {
  ensureSyncTables();
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT id, vehicle_id, duplicate_key, payload_json, source, status, created_at
         FROM vehicle_pending_updates WHERE status = 'pending'
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as Array<{
      id: string;
      vehicle_id: string | null;
      duplicate_key: string;
      payload_json: string;
      source: string;
      status: string;
      created_at: string;
    }>
  ).map((r) => ({
    id: r.id,
    vehicleId: r.vehicle_id,
    duplicateKey: r.duplicate_key,
    payload: JSON.parse(r.payload_json) as ProviderVehicleDraft,
    source: r.source,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export function setPendingStatus(
  id: string,
  status: "approved" | "rejected",
  notes = "",
) {
  ensureSyncTables();
  const db = getDb();
  db.prepare(
    `UPDATE vehicle_pending_updates
     SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?`,
  ).run(status, notes, now(), id);
}

export function listSyncRuns(limit = 20) {
  ensureSyncTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT id, provider_id, status, fetched, pending, matched, error_summary, created_at
       FROM vehicle_sync_runs ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    provider_id: string;
    status: string;
    fetched: number;
    pending: number;
    matched: number;
    error_summary: string;
    created_at: string;
  }>;
}

export { getSetting, setSetting } from "./settings";
