import { haversineKm } from "./haversine";

export type LatLng = { lat: number; lng: number };

/**
 * Build a Google Maps Directions URL (official Maps URLs API).
 * Waypoints appear as stops along the driving route (max ~9 on the web URL API).
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 *
 * Tested: `api=1` + lat/lng calculates the blue route on first open.
 * Unofficial “search along route” deep-links often need Enter or drop the route.
 */
export function googleDirectionsUrl(opts: {
  destination: LatLng;
  origin?: LatLng | null;
  waypoints?: LatLng[];
  /** Launch turn-by-turn when supported (mobile). */
  navigate?: boolean;
}): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${opts.destination.lat},${opts.destination.lng}`,
    travelmode: "driving",
  });
  if (opts.origin) {
    params.set("origin", `${opts.origin.lat},${opts.origin.lng}`);
  }
  const wps = sanitizeWaypoints(opts.waypoints, opts.origin, opts.destination);
  if (wps.length) {
    params.set("waypoints", wps.map((w) => `${w.lat},${w.lng}`).join("|"));
  }
  if (opts.navigate) {
    params.set("dir_action", "navigate");
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function sanitizeWaypoints(
  waypoints: LatLng[] | undefined,
  origin: LatLng | null | undefined,
  destination: LatLng,
): LatLng[] {
  return (waypoints ?? [])
    .filter(
      (w) =>
        Number.isFinite(w.lat) &&
        Number.isFinite(w.lng) &&
        !(
          origin &&
          Math.abs(w.lat - origin.lat) < 1e-5 &&
          Math.abs(w.lng - origin.lng) < 1e-5
        ) &&
        !(
          Math.abs(w.lat - destination.lat) < 1e-5 &&
          Math.abs(w.lng - destination.lng) < 1e-5
        ),
    )
    .slice(0, 9);
}

/**
 * Pick chargers roughly on the A→B corridor, spaced evenly by distance from origin
 * (visit order for Google Maps waypoints).
 */
export function pickStationsAlongPath<T extends LatLng & { id?: string }>(
  origin: LatLng,
  destination: LatLng,
  candidates: T[],
  opts?: {
    max?: number;
    excludeId?: string;
    corridorSlackKm?: number;
    minSeparationKm?: number;
  },
): T[] {
  const max = opts?.max ?? 8;
  const slack = opts?.corridorSlackKm ?? 12;
  const direct = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  if (direct < 0.3) return [];
  const minSep =
    opts?.minSeparationKm ?? Math.min(8, Math.max(1.2, direct / 12));

  const scored = candidates
    .filter((c) => c.id !== opts?.excludeId)
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .map((c) => {
      const fromOrigin = haversineKm(origin.lat, origin.lng, c.lat, c.lng);
      const toDest = haversineKm(c.lat, c.lng, destination.lat, destination.lng);
      const detour = fromOrigin + toDest - direct;
      return { c, fromOrigin, detour };
    })
    .filter(
      (x) =>
        x.fromOrigin > 0.2 &&
        x.fromOrigin < direct - 0.2 &&
        x.detour <= slack,
    )
    .sort((x, y) => x.fromOrigin - y.fromOrigin || x.detour - y.detour);

  if (!scored.length) return [];

  // Prefer evenly spaced stops along the trip (better than clustering near start)
  const picked: T[] = [];
  for (let i = 1; i <= max; i++) {
    const target = (i / (max + 1)) * direct;
    let best: (typeof scored)[number] | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const row of scored) {
      if (picked.some((p) => p.id && row.c.id && p.id === row.c.id)) continue;
      if (
        picked.some(
          (p) => haversineKm(p.lat, p.lng, row.c.lat, row.c.lng) < minSep,
        )
      ) {
        continue;
      }
      const d = Math.abs(row.fromOrigin - target);
      if (d < bestDiff) {
        bestDiff = d;
        best = row;
      }
    }
    if (best) picked.push(best.c);
  }

  // Fallback: if spacing found nothing useful, take nearest-in-order
  if (!picked.length) {
    for (const row of scored) {
      if (picked.length >= max) break;
      const tooClose = picked.some(
        (p) => haversineKm(p.lat, p.lng, row.c.lat, row.c.lng) < minSep,
      );
      if (tooClose) continue;
      picked.push(row.c);
    }
  }

  return picked.sort(
    (a, b) =>
      haversineKm(origin.lat, origin.lng, a.lat, a.lng) -
      haversineKm(origin.lat, origin.lng, b.lat, b.lng),
  );
}

/** Directions to a station from a search origin (destination only — no extra stops). */
export function directionsToStationUrl(opts: {
  origin?: LatLng | null;
  station: LatLng & { id?: string };
  nearby?: Array<LatLng & { id?: string }>;
  navigate?: boolean;
}): string {
  return googleDirectionsUrl({
    origin: opts.origin,
    destination: opts.station,
    navigate: opts.navigate,
  });
}

/**
 * Full trip A→B on Google Maps with EV charging stations as waypoints.
 * Official `api=1` — blue driving route + charger stops on first open.
 * Pass only real corridor / planned chargers (ordered along the path).
 */
export function directionsForRouteUrl(opts: {
  origin: LatLng;
  destination: LatLng;
  originLabel?: string;
  destinationLabel?: string;
  /** EV charge stops along the drive (shown as Google Maps waypoints). */
  stops?: LatLng[];
  navigate?: boolean;
}): string {
  return googleDirectionsUrl({
    origin: opts.origin,
    destination: opts.destination,
    waypoints: opts.stops,
    navigate: opts.navigate,
  });
}
