import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PLACE, geocodeQuery, reverseGeocode } from "./geocode";
import {
  fetchOcmStationById,
  fetchOcmStationsNearby,
  isOcmConfigured,
} from "./openchargemap";
import { fetchOsmStationById, fetchOsmStationsNearby } from "./openstreetmap";
import {
  fetchCuratedById,
  fetchCuratedNearby,
} from "@/lib/community/curated-stations";
import type { EvStation, NearbyStationsResult } from "./types";

const nearbySchema = z.object({
  query: z.string().optional(),
  /** Optional display label from India location select (avoids reverse-geocode delay). */
  placeLabel: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(50).optional(),
  limit: z.coerce.number().min(1).max(150).optional(),
  connector: z.string().optional(),
  minPowerKw: z.coerce.number().min(0).optional(),
});

function applyFilters(
  stations: EvStation[],
  connector?: string,
  minPowerKw?: number,
): EvStation[] {
  return stations.filter((s) => {
    if (connector && connector !== "All") {
      const c = connector.toLowerCase();
      if (!s.connectors.some((x) => x.toLowerCase().includes(c))) return false;
    }
    if (typeof minPowerKw === "number" && minPowerKw > 0) {
      if (s.maxPowerKw == null || s.maxPowerKw < minPowerKw) return false;
    }
    return true;
  });
}

function mergeStations(primary: EvStation[], secondary: EvStation[], limit: number): EvStation[] {
  const seen = new Set<string>();
  const out: EvStation[] = [];

  const push = (s: EvStation) => {
    const geoKey = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
    if (seen.has(s.id) || seen.has(geoKey)) return;
    seen.add(s.id);
    seen.add(geoKey);
    out.push(s);
  };

  for (const s of primary) push(s);
  for (const s of secondary) push(s);

  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

async function loadNearbyStations(
  input: z.infer<typeof nearbySchema>,
): Promise<NearbyStationsResult> {
  const radiusKm = input.radiusKm ?? 15;
  const limit = input.limit ?? 80;

  let place = DEFAULT_PLACE;
  if (typeof input.lat === "number" && typeof input.lng === "number") {
    // Prefer selected city coordinates directly — reverse-geocode is slow and
    // not needed to find nearby chargers (it only builds a display label).
    const label = input.placeLabel?.trim() || input.query?.trim();
    if (label) {
      const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
      place = {
        label: label.includes("India") ? label : `${label}, India`,
        lat: input.lat,
        lng: input.lng,
        city: parts[0] || "Nearby",
        state: parts[1] || "",
        country: "India",
      };
    } else {
      place = await reverseGeocode(input.lat, input.lng);
    }
  } else if (input.query?.trim()) {
    place = await geocodeQuery(input.query.trim());
  }

  // Free-tier model: always fetch OpenStreetMap; add Open Charge Map when key exists.
  const osmPromise = fetchOsmStationsNearby(place.lat, place.lng, radiusKm, limit).catch(
    (err: unknown) => {
      throw err instanceof Error ? err : new Error("OpenStreetMap fetch failed");
    },
  );

  let osm: EvStation[] = [];
  let ocm: EvStation[] = [];
  let warning: string | undefined;
  let source: NearbyStationsResult["source"] = "openstreetmap";

  if (isOcmConfigured()) {
    const results = await Promise.allSettled([
      osmPromise,
      fetchOcmStationsNearby(place.lat, place.lng, radiusKm, limit),
    ]);

    if (results[0].status === "fulfilled") osm = results[0].value;
    else warning = `OpenStreetMap issue: ${results[0].reason?.message || "failed"}`;

    if (results[1].status === "fulfilled") {
      ocm = results[1].value;
      source = "openchargemap";
    } else {
      const msg =
        results[1].reason instanceof Error
          ? results[1].reason.message
          : "Open Charge Map failed";
      warning = warning
        ? `${warning}; OCM unavailable (${msg})`
        : `Open Charge Map unavailable — showing OpenStreetMap only. (${msg})`;
    }
  } else {
    osm = await osmPromise;
    // OCM key is optional — OSM-only free mode is fully supported.
  }

  let stations = mergeStations(ocm, osm, limit);
  try {
    const curated = fetchCuratedNearby(place.lat, place.lng, radiusKm, limit);
    stations = mergeStations(curated, stations, limit);
    if (curated.length) source = source; // keep API source label; curated merged in
  } catch {
    // curated DB optional — ignore if unavailable
  }
  stations = applyFilters(stations, input.connector, input.minPowerKw);

  if (!stations.length && !warning) {
    warning = "No stations found in this radius. Try 10 km or 20 km.";
  }

  return {
    place,
    stations,
    source,
    fetchedAt: new Date().toISOString(),
    warning,
  };
}

export const searchNearbyStations = createServerFn({ method: "GET" })
  .validator((input) => nearbySchema.parse(input))
  .handler(async ({ data }) => loadNearbyStations(data));

export const getStationById = createServerFn({ method: "GET" })
  .validator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<EvStation | null> => {
    if (data.id.startsWith("adm-")) {
      return fetchCuratedById(data.id);
    }
    if (data.id.startsWith("ocm-")) {
      return (await fetchOcmStationById(data.id)) ?? null;
    }
    if (data.id.startsWith("osm-")) {
      return (await fetchOsmStationById(data.id)) ?? null;
    }
    return null;
  });

export const getDataSourcesStatus = createServerFn({ method: "GET" }).handler(async () => ({
  openStreetMap: { free: true, configured: true, label: "OpenStreetMap Overpass" },
  openChargeMap: {
    free: true,
    configured: isOcmConfigured(),
    label: "Open Charge Map",
    signupUrl: "https://openchargemap.org/site/develop/api",
  },
}));
