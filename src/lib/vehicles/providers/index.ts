import type { ProviderVehicleDraft, VehicleDataProvider } from "./types";
import { duplicateKey, normalizeDraft } from "./types";

/** Manual / admin source — never auto-fetches. */
export const ManualProvider: VehicleDataProvider = {
  id: "manual",
  name: "Manual / Admin",
  priority: 1,
  async fetchVehicles() {
    return [];
  },
};

/**
 * OEM / licensed HTTP JSON feed.
 * Expects EV_API_URL (+ optional EV_API_KEY) returning `{ vehicles: [...] }` or an array.
 * On failure returns [] — never deletes local data.
 */
export const OemHttpProvider: VehicleDataProvider = {
  id: "oem-http",
  name: "OEM / EV API feed",
  priority: 10,
  async fetchVehicles() {
    const url = process.env["EV_API_URL"]?.trim();
    if (!url) return [];

    const key = process.env["EV_API_KEY"]?.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(key ? { Authorization: `Bearer ${key}`, "X-API-Key": key } : {}),
        },
      });
      if (!res.ok) {
        console.warn(`[ev-sync] OEM provider HTTP ${res.status}`);
        return [];
      }
      const body = (await res.json()) as unknown;
      const list = Array.isArray(body)
        ? body
        : body &&
            typeof body === "object" &&
            Array.isArray((body as { vehicles?: unknown }).vehicles)
          ? ((body as { vehicles: unknown[] }).vehicles)
          : [];
      return list
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => normalizeDraft(row, "OEM / EV API feed"));
    } catch (err) {
      console.warn("[ev-sync] OEM provider failed", err instanceof Error ? err.message : err);
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};

/** Optional second feed via VEHICLE_API_URL */
export const VehDbHttpProvider: VehicleDataProvider = {
  id: "vehdb-http",
  name: "Vehicle API feed",
  priority: 20,
  async fetchVehicles() {
    const url = process.env["VEHICLE_API_URL"]?.trim();
    if (!url) return [];
    const key = process.env["VEHICLE_API_KEY"]?.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(key ? { Authorization: `Bearer ${key}`, "X-API-Key": key } : {}),
        },
      });
      if (!res.ok) {
        console.warn(`[ev-sync] Vehicle API HTTP ${res.status}`);
        return [];
      }
      const body = (await res.json()) as unknown;
      const list = Array.isArray(body)
        ? body
        : body &&
            typeof body === "object" &&
            Array.isArray((body as { data?: unknown }).data)
          ? ((body as { data: unknown[] }).data)
          : [];
      return list
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => normalizeDraft(row, "Vehicle API feed"));
    } catch (err) {
      console.warn(
        "[ev-sync] Vehicle API failed",
        err instanceof Error ? err.message : err,
      );
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};

export function getRegisteredProviders(): VehicleDataProvider[] {
  return [ManualProvider, OemHttpProvider, VehDbHttpProvider].sort(
    (a, b) => a.priority - b.priority,
  );
}

export { duplicateKey, normalizeDraft };
export type { ProviderVehicleDraft, VehicleDataProvider };
