/**
 * Saved favourites & route searches.
 *
 * Stored on the device (localStorage) so the dashboard works with zero
 * sign-in friction. The store is intentionally transport-agnostic: swap the
 * read/write helpers for API calls later without touching components.
 */
import { useSyncExternalStore } from "react";

export interface SavedRoute {
  id: string;
  from: string;
  to: string;
  vehicleId: string;
  startSoc: number;
  savedAt: number;
}

export interface SavedState {
  stations: string[];
  routes: SavedRoute[];
}

const KEY = "verdiq.saved.v1";
const EMPTY: SavedState = { stations: [], routes: [] };

let cache: SavedState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): SavedState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      stations: Array.isArray(parsed.stations) ? parsed.stations : [],
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(next: SavedState) {
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — keep in-memory state */
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): SavedState {
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

export function useSaved(): SavedState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function toggleStation(id: string) {
  const state = getSnapshot();
  const stations = state.stations.includes(id)
    ? state.stations.filter((s) => s !== id)
    : [id, ...state.stations];
  write({ ...state, stations });
  return stations.includes(id);
}

export function routeKey(r: Pick<SavedRoute, "from" | "to" | "vehicleId">) {
  return `${r.from.trim().toLowerCase()}>${r.to.trim().toLowerCase()}>${r.vehicleId}`;
}

export function saveRoute(input: Omit<SavedRoute, "id" | "savedAt">) {
  const state = getSnapshot();
  const id = routeKey(input);
  const routes = [
    { ...input, id, savedAt: Date.now() },
    ...state.routes.filter((r) => r.id !== id),
  ].slice(0, 20);
  write({ ...state, routes });
}

export function removeRoute(id: string) {
  const state = getSnapshot();
  write({ ...state, routes: state.routes.filter((r) => r.id !== id) });
}
