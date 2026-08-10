import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { STATIONS } from "@/data/stations";

export interface LiveConnector {
  type: string;
  bays: number;
  free: number;
  powerKw: number;
  kind: "DC fast" | "AC";
  waitMinutes: number;
}

export interface LiveAvailability {
  stationId: string;
  available: number;
  total: number;
  connectors: LiveConnector[];
  /** ISO timestamp of the reading. */
  checkedAt: string;
}

/** Deterministic per-station, per-30s pseudo random so SSR and client agree. */
function pulse(seed: string, bucket: number) {
  let h = 2166136261 ^ bucket;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export const getLiveAvailability = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ stationId: z.string() }).parse(input))
  .handler(async ({ data }): Promise<LiveAvailability> => {
    const station = STATIONS.find((s) => s.id === data.stationId);
    if (!station) throw new Error("Station not found");

    const bucket = Math.floor(Date.now() / 30_000);
    const drift = pulse(station.id, bucket);
    const available = Math.max(
      0,
      Math.min(station.total, Math.round(station.available + (drift * 3 - 1.2))),
    );

    let remaining = available;
    const connectors: LiveConnector[] = station.connectors.map((type, i) => {
      const bays = Math.max(
        1,
        i === station.connectors.length - 1
          ? station.total - Math.floor(station.total / station.connectors.length) * i
          : Math.floor(station.total / station.connectors.length),
      );
      const free = Math.min(bays, remaining);
      remaining -= free;
      const dc = type === "CCS2" || type === "CHAdeMO" || type === "GB/T";
      return {
        type,
        bays,
        free,
        powerKw: dc ? station.maxPowerKw : Math.min(22, station.maxPowerKw),
        kind: dc ? "DC fast" : "AC",
        waitMinutes: free > 0 ? 0 : 6 + Math.round(pulse(type + station.id, bucket) * 18),
      };
    });

    return {
      stationId: station.id,
      available,
      total: station.total,
      connectors,
      checkedAt: new Date().toISOString(),
    };
  });
