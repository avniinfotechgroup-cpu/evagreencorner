import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  isBatterySwapOnlyStation,
  planRoute,
  resolveRouteVehicle,
  type RouteMapPayload,
} from "@/data/routePlanner";
import { listRouteVehiclesCms } from "@/lib/platform/cms";
import { planLiveRoute } from "./live-route";
import { geocodeQuery } from "./geocode";
import { resolveIndiaLocation } from "@/data/indiaLocations";
import { fetchCuratedNearby } from "@/lib/community/curated-stations";
import { haversineKm } from "./haversine";

async function resolvePoint(
  name: string,
  lat?: number,
  lng?: number,
): Promise<{ lat: number; lng: number; city: string }> {
  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng, city: name };
  }
  const local = resolveIndiaLocation(name);
  if (local) return { lat: local.lat, lng: local.lng, city: local.name };
  const g = await geocodeQuery(`${name}, India`);
  return { lat: g.lat, lng: g.lng, city: g.city || name };
}

function demoCorridorStations(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): NonNullable<RouteMapPayload["corridorStations"]> {
  const steps = 6;
  const byId = new Map<string, NonNullable<RouteMapPayload["corridorStations"]>[number]>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = origin.lat + (dest.lat - origin.lat) * t;
    const lng = origin.lng + (dest.lng - origin.lng) * t;
    try {
      for (const s of fetchCuratedNearby(lat, lng, 25, 15)) {
        if (byId.has(s.id)) continue;
        const atKm = Math.round(haversineKm(origin.lat, origin.lng, s.lat, s.lng));
        byId.set(s.id, {
          id: s.id,
          name: s.name,
          city: s.city || s.area || "En route",
          lat: s.lat,
          lng: s.lng,
          atKm,
          powerKw: s.maxPowerKw,
          connectors: s.connectors.slice(0, 4),
          pricePerKwh: s.pricePerKwh,
          batterySwap: s.batterySwap,
          serviceType: s.serviceType,
        });
      }
    } catch {
      // ignore
    }
  }
  const all = [...byId.values()].sort((a, b) => a.atKm - b.atKm);
  if (all.length <= 40) return all;
  // Spread across corridor instead of keeping only the start cluster
  const maxKm = Math.max(1, all[all.length - 1]!.atKm);
  const picked: typeof all = [];
  const used = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const target = (i / 39) * maxKm;
    let best = all[0]!;
    let bestDiff = Infinity;
    for (const s of all) {
      if (used.has(s.id)) continue;
      const d = Math.abs(s.atKm - target);
      if (d < bestDiff) {
        bestDiff = d;
        best = s;
      }
    }
    used.add(best.id);
    picked.push(best);
  }
  return picked.sort((a, b) => a.atKm - b.atKm);
}

export const planEvRouteLive = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        from: z.string().min(2).max(120),
        to: z.string().min(2).max(120),
        vehicleId: z.string().min(2).max(40),
        startSoc: z.coerce.number().min(5).max(100),
        fromLat: z.coerce.number().min(-90).max(90).optional(),
        fromLng: z.coerce.number().min(-180).max(180).optional(),
        toLat: z.coerce.number().min(-90).max(90).optional(),
        toLng: z.coerce.number().min(-180).max(180).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const vehicle = (() => {
      try {
        const list = listRouteVehiclesCms();
        return list.find((v) => v.id === data.vehicleId) ?? list[0] ?? resolveRouteVehicle(data.vehicleId);
      } catch {
        return resolveRouteVehicle(data.vehicleId);
      }
    })();

    try {
      const live = await planLiveRoute({
        from: data.from,
        to: data.to,
        vehicle,
        startSoc: data.startSoc,
        ...(typeof data.fromLat === "number" ? { fromLat: data.fromLat } : {}),
        ...(typeof data.fromLng === "number" ? { fromLng: data.fromLng } : {}),
        ...(typeof data.toLat === "number" ? { toLat: data.toLat } : {}),
        ...(typeof data.toLng === "number" ? { toLng: data.toLng } : {}),
      });
      const { map, warning, ...plan } = live;
      return {
        mode: "live" as const,
        plan,
        map,
        warning: warning ?? null,
      };
    } catch (err) {
      const plan = planRoute({
        from: data.from,
        to: data.to,
        vehicle,
        startSoc: data.startSoc,
      });

      // Best-effort straight map for demo fallback — attach coords to charge stops
      let map: RouteMapPayload | null = null;
      let planWithCoords = plan;
      try {
        const [o, d] = await Promise.all([
          resolvePoint(data.from, data.fromLat, data.fromLng),
          resolvePoint(data.to, data.toLat, data.toLng),
        ]);
        const dist = Math.max(1, plan.distanceKm);
        const stops = plan.stops.map((s) => {
          const t = Math.min(1, Math.max(0, s.atKm / dist));
          return {
            ...s,
            lat: o.lat + (d.lat - o.lat) * t,
            lng: o.lng + (d.lng - o.lng) * t,
          };
        });
        planWithCoords = { ...plan, stops };
        const demoStations = demoCorridorStations(o, d).filter(
          (s) => vehicle.batterySwap || !isBatterySwapOnlyStation(s),
        );
        map = {
          geometry: [
            { lat: o.lat, lng: o.lng },
            { lat: d.lat, lng: d.lng },
          ],
          origin: { lat: o.lat, lng: o.lng, label: o.city || data.from },
          destination: { lat: d.lat, lng: d.lng, label: d.city || data.to },
          corridorStations: [
            ...demoStations,
            ...stops.map((s, i) => ({
              id: `demo-stop-${i}`,
              name: s.name,
              city: s.city,
              lat: s.lat!,
              lng: s.lng!,
              atKm: s.atKm,
              powerKw: s.powerKw,
              connectors: s.amenities,
              pricePerKwh: s.pricePerKwh,
              planned: true as const,
            })),
          ],
        };
      } catch {
        map = null;
      }

      return {
        mode: "demo" as const,
        plan: planWithCoords,
        map,
        warning:
          (err instanceof Error ? err.message : "Live routing unavailable") +
          " — showing demo corridor estimate instead.",
      };
    }
  });
