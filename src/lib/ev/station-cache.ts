import type { EvStation } from "./types";

const KEY = "verdiq.stationCache.v1";

type CacheMap = Record<string, EvStation>;

function read(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

function write(map: CacheMap) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function cacheStations(stations: EvStation[]) {
  const map = read();
  for (const s of stations) map[s.id] = s;
  write(map);
}

export function cacheStation(station: EvStation) {
  const map = read();
  map[station.id] = station;
  write(map);
}

export function getCachedStation(id: string): EvStation | null {
  return read()[id] ?? null;
}
