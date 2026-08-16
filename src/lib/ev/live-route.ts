import { geocodeQuery } from "./geocode";
import { haversineKm } from "./haversine";
import { fetchCuratedNearby } from "@/lib/community/curated-stations";
import { fetchOsmStationsAlongCorridor } from "./openstreetmap";
import { resolveIndiaLocation } from "@/data/indiaLocations";
import type { EvStation } from "./types";
import {
  isBatterySwapOnlyStation,
  type PlannedStop,
  type RouteCorridorStation,
  type RouteMapPayload,
  type RoutePlan,
  type VehicleProfile,
} from "@/data/routePlanner";

const OSRM_BASE =
  process.env["OSRM_URL"]?.replace(/\/$/, "") || "https://router.project-osrm.org";

type LngLat = [number, number];
type PathSample = { lat: number; lng: number; atKm: number };

function sampleRoutePoints(coords: LngLat[], everyKm: number): PathSample[] {
  if (!coords.length) return [];
  const points: PathSample[] = [];
  let travelled = 0;
  let nextSample = everyKm;

  points.push({ lat: coords[0]![1], lng: coords[0]![0], atKm: 0 });

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!;
    const cur = coords[i]!;
    const seg = haversineKm(prev[1], prev[0], cur[1], cur[0]);
    travelled += seg;
    if (travelled >= nextSample) {
      points.push({ lat: cur[1], lng: cur[0], atKm: Math.round(travelled) });
      nextSample += everyKm;
    }
  }

  const last = coords[coords.length - 1]!;
  points.push({ lat: last[1], lng: last[0], atKm: Math.round(travelled) });
  return points;
}

/** Point on the path closest to a target distance along the route. */
function pointAtKm(samples: PathSample[], atKm: number): PathSample {
  if (!samples.length) return { lat: 0, lng: 0, atKm: 0 };
  let best = samples[0]!;
  let bestDiff = Math.abs(best.atKm - atKm);
  for (const s of samples) {
    const d = Math.abs(s.atKm - atKm);
    if (d < bestDiff) {
      best = s;
      bestDiff = d;
    }
  }
  return best;
}

/** Downsample polyline for browser map payload size. */
function downsampleGeometry(coords: LngLat[], maxPoints = 180): Array<{ lat: number; lng: number }> {
  if (coords.length <= maxPoints) {
    return coords.map(([lng, lat]) => ({ lat, lng }));
  }
  const step = Math.ceil(coords.length / maxPoints);
  const out: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < coords.length; i += step) {
    const c = coords[i]!;
    out.push({ lat: c[1], lng: c[0] });
  }
  const last = coords[coords.length - 1]!;
  const tip = out[out.length - 1];
  if (!tip || tip.lat !== last[1] || tip.lng !== last[0]) {
    out.push({ lat: last[1], lng: last[0] });
  }
  return out;
}

async function osrmRoute(from: LngLat, to: LngLat) {
  const url = `${OSRM_BASE}/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: LngLat[] };
      }>;
    };
    if (data.code !== "Ok" || !data.routes?.[0]) {
      throw new Error("No driving route found between these places.");
    }
    return data.routes[0];
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Routing timed out. Try again in a moment.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function stationsNear(lat: number, lng: number, radiusKm: number): EvStation[] {
  try {
    return fetchCuratedNearby(lat, lng, radiusKm, 20);
  } catch {
    return [];
  }
}

function nearestAtKm(lat: number, lng: number, samples: PathSample[]): number {
  let best = samples[0]?.atKm ?? 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (const s of samples) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s.atKm;
    }
  }
  return best;
}

/** Keep chargers spread along the full route (not only the dense start cluster). */
function thinStationsAlongRoute(
  stations: RouteCorridorStation[],
  max: number,
): RouteCorridorStation[] {
  if (stations.length <= max) {
    return [...stations].sort((a, b) => a.atKm - b.atKm || a.name.localeCompare(b.name));
  }
  const sorted = [...stations].sort((a, b) => a.atKm - b.atKm || a.name.localeCompare(b.name));
  const maxKm = Math.max(1, sorted[sorted.length - 1]!.atKm);
  const picked: RouteCorridorStation[] = [];
  const used = new Set<string>();

  for (let i = 0; i < max; i++) {
    const target = (i / Math.max(1, max - 1)) * maxKm;
    let best: RouteCorridorStation | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const s of sorted) {
      if (used.has(s.id)) continue;
      const d = Math.abs(s.atKm - target);
      if (d < bestDiff) {
        bestDiff = d;
        best = s;
      }
    }
    if (best) {
      used.add(best.id);
      picked.push(best);
    }
  }

  return picked.sort((a, b) => a.atKm - b.atKm || a.name.localeCompare(b.name));
}

function toCorridorStation(
  station: EvStation,
  atKm: number,
  planned = false,
): RouteCorridorStation {
  return {
    id: station.id,
    name: station.name,
    city: station.city || station.area || "En route",
    lat: station.lat,
    lng: station.lng,
    atKm,
    powerKw: station.maxPowerKw,
    connectors: station.connectors.slice(0, 4),
    pricePerKwh: station.pricePerKwh,
    batterySwap: station.batterySwap,
    serviceType: station.serviceType,
    ...(planned ? { planned: true } : {}),
  };
}

function filterStationsForVehicle(
  stations: RouteCorridorStation[],
  vehicle: VehicleProfile,
): RouteCorridorStation[] {
  if (vehicle.batterySwap) return stations;
  return stations.filter((s) => s.planned || !isBatterySwapOnlyStation(s));
}

function collectCuratedCorridorStations(samples: PathSample[]): RouteCorridorStation[] {
  const byId = new Map<string, RouteCorridorStation>();
  const curatedSamples = samples.filter((_, i) => i % 2 === 0).slice(0, 24);
  for (const p of curatedSamples) {
    for (const s of stationsNear(p.lat, p.lng, 22)) {
      if (byId.has(s.id)) continue;
      byId.set(s.id, toCorridorStation(s, nearestAtKm(s.lat, s.lng, samples)));
    }
  }
  return [...byId.values()];
}

async function collectOsmCorridorStations(samples: PathSample[]): Promise<RouteCorridorStation[]> {
  const osmSamples =
    samples.length <= 12
      ? samples
      : Array.from({ length: 12 }, (_, i) => {
          const idx = Math.round((i / 11) * (samples.length - 1));
          return samples[idx]!;
        });
  const osm = await fetchOsmStationsAlongCorridor(
    osmSamples.map((p) => ({ lat: p.lat, lng: p.lng })),
    18,
    100,
  );
  return osm.map((s) => toCorridorStation(s, nearestAtKm(s.lat, s.lng, samples)));
}

async function collectCorridorStations(
  samples: PathSample[],
  plannedStops: PlannedStop[],
): Promise<RouteCorridorStation[]> {
  const byId = new Map<string, RouteCorridorStation>();
  for (const c of collectCuratedCorridorStations(samples)) {
    byId.set(c.id, c);
  }

  try {
    for (const c of await collectOsmCorridorStations(samples)) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  } catch {
    // curated-only ok
  }

  for (const stop of plannedStops) {
    if (stop.lat == null || stop.lng == null) continue;
    let matched: RouteCorridorStation | undefined;
    let best = 3;
    for (const c of byId.values()) {
      const d = haversineKm(stop.lat, stop.lng, c.lat, c.lng);
      if (d < best) {
        best = d;
        matched = c;
      }
    }
    if (matched) {
      byId.set(matched.id, { ...matched, planned: true, atKm: stop.atKm });
    } else {
      const syntheticId = `planned-${stop.atKm}-${stop.name}`;
      byId.set(syntheticId, {
        id: syntheticId,
        name: stop.name,
        city: stop.city,
        lat: stop.lat,
        lng: stop.lng,
        atKm: stop.atKm,
        powerKw: stop.powerKw,
        connectors: stop.amenities,
        pricePerKwh: stop.pricePerKwh,
        planned: true,
      });
    }
  }

  return thinStationsAlongRoute([...byId.values()], 80);
}

function mergePlannedIntoCorridor(
  base: RouteCorridorStation[],
  plannedStops: PlannedStop[],
): RouteCorridorStation[] {
  const byId = new Map(base.map((c) => [c.id, { ...c }]));
  const plannedIds = new Set<string>();

  for (const stop of plannedStops) {
    if (stop.lat == null || stop.lng == null) continue;
    let matched: RouteCorridorStation | undefined;
    let best = 3;
    for (const c of byId.values()) {
      const d = haversineKm(stop.lat, stop.lng, c.lat, c.lng);
      if (d < best) {
        best = d;
        matched = c;
      }
    }
    if (matched) {
      byId.set(matched.id, { ...matched, planned: true, atKm: stop.atKm });
      plannedIds.add(matched.id);
    } else {
      const syntheticId = `planned-${Math.round(stop.atKm)}-${stop.lat.toFixed(4)}-${stop.lng.toFixed(4)}`;
      byId.set(syntheticId, {
        id: syntheticId,
        name: stop.name,
        city: stop.city,
        lat: stop.lat,
        lng: stop.lng,
        atKm: stop.atKm,
        powerKw: stop.powerKw,
        connectors: stop.amenities,
        pricePerKwh: stop.pricePerKwh,
        planned: true,
      });
      plannedIds.add(syntheticId);
    }
  }

  // Always keep required SoC stops; fill remaining slots spread along the route
  const all = [...byId.values()];
  const required = all
    .filter((c) => plannedIds.has(c.id) || c.planned)
    .sort((a, b) => a.atKm - b.atKm || a.name.localeCompare(b.name));
  const others = thinStationsAlongRoute(
    all.filter((c) => !plannedIds.has(c.id) && !c.planned),
    Math.max(0, 100 - required.length),
  );
  return [...required, ...others].sort((a, b) => a.atKm - b.atKm || a.name.localeCompare(b.name));
}

/**
 * Pick charge stops from start SoC so the driver never goes below reserve.
 * Prefers real corridor stations; falls back to path waypoints when sparse.
 */
function planStopsFromSoc(input: {
  distanceKm: number;
  samples: PathSample[];
  corridor: RouteCorridorStation[];
  vehicle: VehicleProfile;
  startSoc: number;
  reserveSoc: number;
  targetSoc: number;
}): { stops: PlannedStop[]; warning?: string } {
  const { distanceKm, samples, corridor, vehicle, startSoc, reserveSoc, targetSoc } = input;
  const kmPerPercent = vehicle.rangeKm / 100;
  const usableRangeKm = Math.max(40, (100 - reserveSoc) * kmPerPercent * 0.9);

  const stops: PlannedStop[] = [];
  let soc = Math.min(100, Math.max(5, startSoc));
  let lastKm = 0;
  let usedGuide = false;
  const usedIds = new Set<string>();

  // Safety: max stops scales with distance
  const maxStops = Math.min(12, Math.max(1, Math.ceil(distanceKm / usableRangeKm) + 1));

  for (let n = 0; n < maxStops; n++) {
    const remaining = distanceKm - lastKm;
    const reachableKm = (soc - reserveSoc) * kmPerPercent;
    if (reachableKm >= remaining - 2) break;

    // Charge before we hit reserve — aim ~75% into the reachable window
    const idealKm = lastKm + Math.max(40, reachableKm * 0.75);
    const windowLo = lastKm + 25;
    const windowHi = Math.min(distanceKm - 15, lastKm + reachableKm - 5);

    if (windowLo >= windowHi) {
      // Cannot place another stop safely
      break;
    }

    const targetKm = Math.min(windowHi, Math.max(windowLo, idealKm));

    // Prefer a real station near the target distance along the route
    let pick: RouteCorridorStation | null = null;
    let pickScore = Number.POSITIVE_INFINITY;
    for (const c of corridor) {
      if (usedIds.has(c.id)) continue;
      if (c.atKm < windowLo || c.atKm > windowHi) continue;
      const score = Math.abs(c.atKm - targetKm) + (c.planned ? -5 : 0);
      if (score < pickScore) {
        pickScore = score;
        pick = c;
      }
    }

    let stopAtKm = targetKm;
    let lat: number;
    let lng: number;
    let name: string;
    let city: string;
    let powerKw = 60;
    let price = 20;
    let amenities: string[] = ["CCS2"];

    if (pick) {
      usedIds.add(pick.id);
      stopAtKm = pick.atKm;
      lat = pick.lat;
      lng = pick.lng;
      name = pick.name;
      city = pick.city;
      powerKw = pick.powerKw ?? 60;
      price = pick.pricePerKwh ?? 20;
      amenities = pick.connectors.length ? pick.connectors.slice(0, 3) : amenities;
    } else {
      usedGuide = true;
      const pt = pointAtKm(samples, targetKm);
      stopAtKm = pt.atKm;
      lat = pt.lat;
      lng = pt.lng;
      name = `Suggested charge stop · ${Math.round(stopAtKm)} km`;
      city = "Along route";
      powerKw = 60;
      price = 20;
      amenities = ["Highway / en-route"];
    }

    const gap = stopAtKm - lastKm;
    if (gap < 20) break;

    const arrivalSoc = Math.max(reserveSoc * 0.4, soc - gap / kmPerPercent);
    const departureSoc = targetSoc;
    const kwhAdded = ((departureSoc - arrivalSoc) / 100) * vehicle.batteryKwh;
    if (kwhAdded <= 1) break;

    const minutes = Math.round((kwhAdded / (powerKw * 0.72)) * 60) + 5;

    stops.push({
      name,
      city,
      atKm: Math.round(stopAtKm),
      powerKw,
      pricePerKwh: price,
      amenities,
      arrivalSoc: Math.round(arrivalSoc),
      departureSoc,
      kwhAdded: Math.round(kwhAdded * 10) / 10,
      cost: Math.round(kwhAdded * price),
      minutes,
      lat,
      lng,
    });

    soc = departureSoc;
    lastKm = stopAtKm;
  }

  // Still can't finish? Add one last guide stop if needed
  const remaining = distanceKm - lastKm;
  const reachableKm = (soc - reserveSoc) * kmPerPercent;
  if (remaining > reachableKm + 10 && stops.length < maxStops) {
    usedGuide = true;
    const stopAtKm = Math.min(distanceKm - 20, lastKm + reachableKm * 0.8);
    const pt = pointAtKm(samples, stopAtKm);
    const gap = pt.atKm - lastKm;
    if (gap >= 20) {
      const arrivalSoc = Math.max(reserveSoc * 0.4, soc - gap / kmPerPercent);
      const departureSoc = targetSoc;
      const kwhAdded = ((departureSoc - arrivalSoc) / 100) * vehicle.batteryKwh;
      const powerKw = 60;
      const price = 20;
      const minutes = Math.round((kwhAdded / (powerKw * 0.72)) * 60) + 5;
      stops.push({
        name: `Suggested charge stop · ${Math.round(pt.atKm)} km`,
        city: "Along route",
        atKm: Math.round(pt.atKm),
        powerKw,
        pricePerKwh: price,
        amenities: ["Highway / en-route"],
        arrivalSoc: Math.round(arrivalSoc),
        departureSoc,
        kwhAdded: Math.round(kwhAdded * 10) / 10,
        cost: Math.round(kwhAdded * price),
        minutes,
        lat: pt.lat,
        lng: pt.lng,
      });
      soc = departureSoc;
      lastKm = pt.atKm;
    }
  }

  const warning = usedGuide
    ? "Some charge stops are suggested along the driving path (few verified highway chargers matched). Prefer gold pins; green dots are other chargers near the route."
    : undefined;

  return { stops, ...(warning ? { warning } : {}) };
}

export async function planLiveRoute(input: {
  from: string;
  to: string;
  vehicle: VehicleProfile;
  startSoc: number;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  reserveSoc?: number;
  targetSoc?: number;
}): Promise<RoutePlan & { live: true; warning?: string; map: RouteMapPayload }> {
  const reserveSoc = input.reserveSoc ?? 12;
  const targetSoc = input.targetSoc ?? 85;

  const [origin, dest] = await Promise.all([
    typeof input.fromLat === "number" && typeof input.fromLng === "number"
      ? Promise.resolve({
          label: input.from,
          city: input.from,
          lat: input.fromLat,
          lng: input.fromLng,
          state: "",
          country: "India",
        })
      : (() => {
          const local = resolveIndiaLocation(input.from);
          if (local) {
            return Promise.resolve({
              label: local.label,
              city: local.name,
              lat: local.lat,
              lng: local.lng,
              state: local.state,
              country: "India",
            });
          }
          return geocodeQuery(`${input.from}, India`);
        })(),
    typeof input.toLat === "number" && typeof input.toLng === "number"
      ? Promise.resolve({
          label: input.to,
          city: input.to,
          lat: input.toLat,
          lng: input.toLng,
          state: "",
          country: "India",
        })
      : (() => {
          const local = resolveIndiaLocation(input.to);
          if (local) {
            return Promise.resolve({
              label: local.label,
              city: local.name,
              lat: local.lat,
              lng: local.lng,
              state: local.state,
              country: "India",
            });
          }
          return geocodeQuery(`${input.to}, India`);
        })(),
  ]);

  const route = await osrmRoute([origin.lng, origin.lat], [dest.lng, dest.lat]);
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const driveHours = Math.round((route.duration / 3600) * 10) / 10;
  const coords = route.geometry.coordinates;
  const pathSamples = sampleRoutePoints(coords, 40);

  // 1) Plan required stops from start SoC FIRST (never wait on OSM)
  const planned = planStopsFromSoc({
    distanceKm,
    samples: pathSamples,
    corridor: [],
    vehicle: input.vehicle,
    startSoc: input.startSoc,
    reserveSoc,
    targetSoc,
  });
  const stops = planned.stops;
  let warning = planned.warning;

  // 2) Corridor chargers: curated is sync/fast; OSM is best-effort (don't drop curated on timeout)
  const curatedFast = collectCuratedCorridorStations(pathSamples);
  let osmExtra: RouteCorridorStation[] = [];
  try {
    osmExtra = await Promise.race([
      collectOsmCorridorStations(pathSamples),
      new Promise<RouteCorridorStation[]>((resolve) => {
        setTimeout(() => resolve([]), 8_000);
      }),
    ]);
  } catch {
    osmExtra = [];
  }
  const corridorMerged = new Map<string, RouteCorridorStation>();
  for (const c of [...curatedFast, ...osmExtra]) {
    if (!corridorMerged.has(c.id)) corridorMerged.set(c.id, c);
  }
  let corridorStationsBase = thinStationsAlongRoute([...corridorMerged.values()], 80);

  // Snap suggested stops onto nearby real chargers when possible
  if (corridorStationsBase.length && stops.length) {
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]!;
      let best: RouteCorridorStation | null = null;
      let bestScore = 35; // max km along-route delta to snap
      for (const c of corridorStationsBase) {
        const along = Math.abs(c.atKm - s.atKm);
        if (along > bestScore) continue;
        const off =
          s.lat != null && s.lng != null
            ? haversineKm(s.lat, s.lng, c.lat, c.lng)
            : along;
        if (off < 30 && along < bestScore) {
          bestScore = along;
          best = c;
        }
      }
      if (best) {
        stops[i] = {
          ...s,
          name: best.name,
          city: best.city,
          lat: best.lat,
          lng: best.lng,
          powerKw: best.powerKw ?? s.powerKw,
          pricePerKwh: best.pricePerKwh ?? s.pricePerKwh,
          amenities: best.connectors.length ? best.connectors.slice(0, 3) : s.amenities,
        };
      }
    }
    if (!stops.some((s) => s.name.startsWith("Suggested charge"))) {
      warning = undefined;
    }
  }

  // Prefer known corridor guide labels when available
  if (stops.some((s) => s.name.startsWith("Suggested charge"))) {
    try {
      const { planRoute } = await import("@/data/routePlanner");
      const demo = planRoute({
        from: input.from,
        to: input.to,
        vehicle: input.vehicle,
        startSoc: input.startSoc,
      });
      if (demo.stops.length > 0 && !demo.synthetic) {
        stops.length = 0;
        for (const s of demo.stops) {
          const pt = pointAtKm(pathSamples, s.atKm);
          stops.push({
            name: s.name,
            city: s.city,
            atKm: s.atKm,
            powerKw: s.powerKw,
            pricePerKwh: s.pricePerKwh,
            amenities: s.amenities,
            arrivalSoc: s.arrivalSoc,
            departureSoc: s.departureSoc,
            kwhAdded: s.kwhAdded,
            cost: s.cost,
            minutes: s.minutes,
            lat: pt.lat,
            lng: pt.lng,
          });
        }
        warning =
          "Live driving path from OSRM. Charge stops from the known corridor guide.";
      }
    } catch {
      // keep SoC-based stops
    }
  }

  // Rebuild SoC arrival from planned stops
  const kmPerPercent = input.vehicle.rangeKm / 100;
  const kwhPerKm = input.vehicle.batteryKwh / input.vehicle.rangeKm;
  let soc = Math.min(100, Math.max(5, input.startSoc));
  let lastKm = 0;
  for (const s of stops) {
    soc = s.departureSoc;
    lastKm = s.atKm;
  }
  const arrivalSoc = Math.max(0, Math.round(soc - (distanceKm - lastKm) / kmPerPercent));

  const corridorStations = filterStationsForVehicle(
    mergePlannedIntoCorridor(corridorStationsBase, stops),
    input.vehicle,
  );

  if (!stops.length) {
    const reachable = (input.startSoc - reserveSoc) * kmPerPercent;
    if (reachable >= distanceKm) {
      warning = "With your starting charge, no charging stop is required for this trip.";
    } else if (!warning) {
      warning =
        "Could not place charge stops for this path. Try adjusting start charge or destinations.";
    }
  }

  const energyKwh = Math.round(distanceKm * kwhPerKm * 10) / 10;
  const energyCost = stops.reduce((n, s) => n + s.cost, 0);
  const chargingMinutes = stops.reduce((n, s) => n + s.minutes, 0);
  const petrolCost = Math.round((distanceKm / 16) * 105);
  const co2SavedKg = Math.round(distanceKm * 0.11 * 10) / 10;

  const map: RouteMapPayload = {
    geometry: downsampleGeometry(coords),
    origin: {
      lat: origin.lat,
      lng: origin.lng,
      label: origin.city || input.from,
    },
    destination: {
      lat: dest.lat,
      lng: dest.lng,
      label: dest.city || input.to,
    },
    corridorStations,
  };

  return {
    from: origin.city || input.from,
    to: dest.city || input.to,
    distanceKm,
    driveHours,
    chargingMinutes,
    totalHours: Math.round((driveHours + chargingMinutes / 60) * 10) / 10,
    stops,
    energyKwh,
    energyCost,
    petrolCost,
    co2SavedKg,
    arrivalSoc,
    synthetic: false,
    live: true,
    map,
    ...(warning ? { warning } : {}),
  };
}
