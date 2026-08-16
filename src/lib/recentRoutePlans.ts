/**
 * Recent route planner searches / plans (device localStorage).
 * Separate from bookmarked "saved" trips — this is automatic history.
 */
import { useSyncExternalStore } from "react";

export interface RecentRoutePlan {
  id: string;
  from: string;
  to: string;
  vehicleId: string;
  startSoc: number;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  distanceKm?: number;
  stopsCount?: number;
  mode?: "live" | "demo";
  searchedAt: number;
}

const KEY = "verdiq.recentRoutes.v1";
const MAX = 8;
const EMPTY: RecentRoutePlan[] = [];

let cache: RecentRoutePlan[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): RecentRoutePlan[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (r): r is RecentRoutePlan =>
          Boolean(r) &&
          typeof r === "object" &&
          typeof (r as RecentRoutePlan).from === "string" &&
          typeof (r as RecentRoutePlan).to === "string" &&
          typeof (r as RecentRoutePlan).vehicleId === "string",
      )
      .slice(0, MAX);
  } catch {
    return EMPTY;
  }
}

function write(next: RecentRoutePlan[]) {
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked */
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): RecentRoutePlan[] {
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function recentRouteKey(r: Pick<RecentRoutePlan, "from" | "to" | "vehicleId" | "startSoc">) {
  return `${r.from.trim().toLowerCase()}>${r.to.trim().toLowerCase()}>${r.vehicleId}>${r.startSoc}`;
}

export function useRecentRoutes(): RecentRoutePlan[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function pushRecentRoute(
  input: Omit<RecentRoutePlan, "id" | "searchedAt"> & { id?: string; searchedAt?: number },
) {
  const id = input.id ?? recentRouteKey(input);
  const entry: RecentRoutePlan = {
    ...input,
    id,
    from: input.from.trim(),
    to: input.to.trim(),
    searchedAt: input.searchedAt ?? Date.now(),
  };
  const next = [entry, ...getSnapshot().filter((r) => r.id !== id)].slice(0, MAX);
  write(next);
}

export function removeRecentRoute(id: string) {
  write(getSnapshot().filter((r) => r.id !== id));
}

export function clearRecentRoutes() {
  write([]);
}
