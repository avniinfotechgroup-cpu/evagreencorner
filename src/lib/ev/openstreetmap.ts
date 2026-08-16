import { reverseGeocodeAddress } from "./geocode";
import { normalizeConnectors } from "./connector-normalizer";
import { haversineKm } from "./haversine";
import type {
  EvServiceType,
  EvStation,
  FuelCoLocation,
  VehicleAccess,
  YesNoUnknown,
} from "./types";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function yn(value: string | undefined): YesNoUnknown {
  if (!value) return "unknown";
  const v = value.toLowerCase();
  if (v === "yes" || v === "true" || v === "1" || v === "designated") return "yes";
  if (v === "no" || v === "false" || v === "0" || v === "private") return "no";
  return "unknown";
}

function parsePowerKw(tags: Record<string, string>): number | null {
  const candidates = [
    tags["socket:type2:output"],
    tags["socket:ccs:output"],
    tags["socket:chademo:output"],
    tags["maxpower"],
    tags["charging_station:output"],
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const match = String(raw).match(/([\d.]+)\s*(kW|kw|KW)?/);
    if (!match) continue;
    const n = Number(match[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (!match[2] && n > 500) continue;
    return Math.round(n);
  }
  return null;
}

function connectorsFromTags(tags: Record<string, string>): string[] {
  const raw: string[] = [];
  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith("socket:") || value === "no") continue;
    const socket = key.replace(/^socket:/, "").split(":")[0];
    if (socket) raw.push(socket);
  }
  if (tags["socket"]) raw.push(tags["socket"]);
  if (tags["battery_swap"] === "yes" || tags["socket:battery_swap"]) {
    raw.push("Battery swap");
  }
  return normalizeConnectors(raw);
}

function detectServiceType(tags: Record<string, string>, connectors: string[]): {
  serviceType: EvServiceType;
  batterySwap: boolean;
} {
  const swap =
    tags["battery_swap"] === "yes" ||
    Boolean(tags["socket:battery_swap"]) ||
    /swap/i.test(tags["name"] || "") ||
    /swap/i.test(tags["operator"] || "") ||
    /swap/i.test(tags["brand"] || "") ||
    connectors.some((c) => /battery swap/i.test(c));

  const hasPlug =
    connectors.some((c) => !/battery swap/i.test(c) && c !== "Not specified") ||
    Object.keys(tags).some((k) => k.startsWith("socket:") && !k.includes("battery_swap"));

  if (swap && hasPlug) return { serviceType: "both", batterySwap: true };
  if (swap) return { serviceType: "battery_swap", batterySwap: true };
  return { serviceType: "plug_in", batterySwap: false };
}

function countPoints(tags: Record<string, string>, connectors: string[]): {
  total: number;
  known: boolean;
} {
  if (Number(tags["capacity"]) > 0) {
    return { total: Number(tags["capacity"]), known: true };
  }
  let sockets = 0;
  let found = false;
  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith("socket:") || key.includes(":output")) continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      sockets += n;
      found = true;
    } else if (value === "yes") {
      sockets += 1;
      found = true;
    }
  }
  if (found) return { total: sockets, known: true };
  if (connectors.length && connectors[0] !== "Not specified") {
    return { total: connectors.length, known: false };
  }
  return { total: 1, known: false };
}

function parsePrice(tags: Record<string, string>): {
  pricePerKwh: number | null;
  pricingNote: string | null;
} {
  const charge = tags["charge"] || tags["fee:charge"] || tags["payment:charge"];
  if (charge) {
    const perKwh = charge.match(/([\d.]+)\s*(?:INR|Rs\.?|₹)?\s*(?:\/|per)?\s*kWh/i);
    if (perKwh) {
      return { pricePerKwh: Number(perKwh[1]), pricingNote: charge };
    }
    return { pricePerKwh: null, pricingNote: charge };
  }
  if (tags["fee"] === "no") {
    return { pricePerKwh: 0, pricingNote: "Free charging (fee=no)" };
  }
  if (tags["fee"] === "yes") {
    return { pricePerKwh: null, pricingNote: "Paid — rate not published in source data" };
  }
  return { pricePerKwh: null, pricingNote: null };
}

function vehicleAccessFromTags(
  tags: Record<string, string>,
  serviceType: EvServiceType,
): VehicleAccess {
  const twoWheelerExplicit =
    yn(tags["motorcycle"]) === "yes" ||
    yn(tags["moped"]) === "yes" ||
    yn(tags["scooter"]) === "yes" ||
    yn(tags["bicycle"]) === "yes";

  const twoWheelerNo =
    yn(tags["motorcycle"]) === "no" &&
    yn(tags["bicycle"]) === "no" &&
    yn(tags["moped"]) === "no";

  // Battery-swap vendors in India are typically for bikes / 3W loaders.
  const swapDefaultTwoWheeler = serviceType !== "plug_in" ? "yes" : "unknown";
  const threeWheeler =
    yn(tags["goods"]) === "yes" ||
    yn(tags["three_wheeled_car"]) === "yes" ||
    yn(tags["auto_rickshaw"]) === "yes" ||
    /loader|3[\s-]?wheel|auto/i.test(tags["name"] || "") ||
    /loader|3[\s-]?wheel/i.test(tags["operator"] || "")
      ? "yes"
      : serviceType === "battery_swap"
        ? "unknown"
        : "unknown";

  return {
    cars: yn(tags["motorcar"] || tags["car"]),
    twoWheelers: twoWheelerExplicit ? "yes" : twoWheelerNo ? "no" : swapDefaultTwoWheeler,
    threeWheelers: threeWheeler,
    buses: yn(tags["bus"]),
    trucks: yn(tags["hgv"] || tags["truck"]),
  };
}

function fuelFromTags(tags: Record<string, string>): FuelCoLocation {
  const brand = (tags["brand"] || tags["operator"] || "").toLowerCase();
  const petrolBrands = [
    "bpcl",
    "hpcl",
    "iocl",
    "indian oil",
    "bharat petroleum",
    "hindustan petroleum",
    "nayara",
    "reliance",
    "shell",
  ];
  const looksLikeFuelBrand = petrolBrands.some((b) => brand.includes(b));

  return {
    petrol:
      yn(tags["fuel:petrol"]) !== "unknown"
        ? yn(tags["fuel:petrol"])
        : looksLikeFuelBrand
          ? "yes"
          : "unknown",
    diesel:
      yn(tags["fuel:diesel"]) !== "unknown"
        ? yn(tags["fuel:diesel"])
        : looksLikeFuelBrand
          ? "yes"
          : "unknown",
    cng: yn(tags["fuel:cng"]) !== "unknown" ? yn(tags["fuel:cng"]) : "unknown",
    fuelStationName: looksLikeFuelBrand ? tags["brand"] || tags["operator"] || null : null,
    note: looksLikeFuelBrand
      ? "Likely at/near a fuel retail brand (from operator/brand tags)."
      : null,
  };
}

function buildAddress(tags: Record<string, string>) {
  const line1 = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const area = tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:quarter"] || "";
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
  const state = tags["addr:state"] || "";
  const pincode = tags["addr:postcode"] || "";
  const hasStructured = Boolean(line1 || tags["addr:full"]);
  const address = line1 || tags["addr:full"] || area || "Address not available";
  const fullAddress = [address, area, city, state, pincode]
    .filter((p, i, arr) => Boolean(p) && arr.indexOf(p) === i)
    .join(", ");
  return { address, area, city, state, pincode, fullAddress, hasStructured };
}

function needsAddressEnrichment(station: EvStation): boolean {
  return (
    !station.addressFromGeocode &&
    (station.address === "Address not available" ||
      !station.city ||
      station.fullAddress === "Address not available")
  );
}

export async function enrichStationAddresses(stations: EvStation[]): Promise<EvStation[]> {
  const toEnrich = stations.filter(needsAddressEnrichment).slice(0, 20);
  if (!toEnrich.length) return stations;

  const enriched = await Promise.all(
    toEnrich.map(async (s) => {
      try {
        const geo = await reverseGeocodeAddress(s.lat, s.lng);
        return {
          ...s,
          address: geo.street,
          area: s.area || geo.area,
          city: s.city || geo.city,
          state: s.state || geo.state,
          pincode: s.pincode || geo.pincode,
          fullAddress: geo.label,
          addressFromGeocode: true,
        } satisfies EvStation;
      } catch {
        return s;
      }
    }),
  );

  const byId = new Map(enriched.map((s) => [s.id, s]));
  return stations.map((s) => byId.get(s.id) ?? s);
}

function mapElement(el: OverpassElement, originLat: number, originLng: number): EvStation | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const tags = el.tags ?? {};
  const isFuelEv = tags["amenity"] === "fuel" && tags["fuel:electricity"] === "yes";
  const name =
    tags["name"] ||
    tags["operator"] ||
    tags["brand"] ||
    (isFuelEv ? "EV charging at fuel station" : "EV Charging Station");
  const operator = tags["operator"] || tags["brand"] || "Unknown operator";
  const connectors = connectorsFromTags(tags);
  const service = detectServiceType(tags, connectors);
  const maxPowerKw = service.batterySwap && service.serviceType === "battery_swap" ? null : parsePowerKw(tags);
  const openingHours = tags["opening_hours"] || null;
  const open24 = openingHours === "24/7" ? true : openingHours ? false : null;
  const points = countPoints(tags, connectors);
  const pricing = parsePrice(tags);
  const addr = buildAddress(tags);

  const displayName =
    service.batterySwap && !/swap/i.test(name) ? `${name} (Battery swap)` : name;

  return {
    id: `osm-${el.type}-${el.id}`,
    source: "openstreetmap",
    sourceId: String(el.id),
    name: displayName,
    operator,
    serviceType: service.serviceType,
    batterySwap: service.batterySwap,
    address: addr.address,
    area: addr.area,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    fullAddress: addr.fullAddress,
    addressFromGeocode: false,
    lat,
    lng,
    distanceKm: Math.round(haversineKm(originLat, originLng, lat, lng) * 10) / 10,
    connectors: connectors.length ? connectors : service.batterySwap ? ["Battery swap"] : ["Not specified"],
    maxPowerKw,
    pricePerKwh: pricing.pricePerKwh,
    pricingNote: pricing.pricingNote,
    total: points.total,
    chargingPointsKnown: points.known,
    open24,
    openingHours,
    website: tags["website"] || tags["contact:website"] || null,
    phone: tags["phone"] || tags["contact:phone"] || null,
    availability: "UNKNOWN",
    rushLevel: "UNKNOWN",
    rushNote: "Rush / busy-level data is not available from the source.",
    vehicleAccess: vehicleAccessFromTags(tags, service.serviceType),
    fuelCoLocation: isFuelEv
      ? {
          petrol: "yes",
          diesel: "yes",
          cng: yn(tags["fuel:cng"]),
          fuelStationName: name,
          note: "Tagged in OpenStreetMap as a fuel station with EV charging (fuel:electricity=yes).",
        }
      : fuelFromTags(tags),
    access: tags["access"] || tags["parking"] || null,
    lastUpdated: null,
  };
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const OVERPASS_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  Accept: "*/*",
  "User-Agent": "EvaGreenCorner/1.0 (https://evagreencorner.com)",
};

async function overpassQuery(query: string): Promise<{ elements?: OverpassElement[] }> {
  let lastError: Error | null = null;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: OVERPASS_HEADERS,
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        lastError = new Error(`OpenStreetMap Overpass failed (${res.status})`);
        continue;
      }
      return (await res.json()) as { elements?: OverpassElement[] };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Overpass request failed");
    }
  }
  throw lastError ?? new Error("OpenStreetMap Overpass unavailable");
}

async function enrichFuelNearby(station: EvStation): Promise<EvStation> {
  if (
    station.fuelCoLocation.petrol !== "unknown" ||
    station.fuelCoLocation.diesel !== "unknown" ||
    station.fuelCoLocation.cng !== "unknown"
  ) {
    return station;
  }

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="fuel"](around:100,${station.lat},${station.lng});
      way["amenity"="fuel"](around:100,${station.lat},${station.lng});
    );
    out center tags 3;
  `;

  try {
    const json = await overpassQuery(query);
    const fuel = json.elements?.[0];
    if (!fuel?.tags) return station;

    const tags = fuel.tags;
    const name = tags["name"] || tags["brand"] || tags["operator"] || "Nearby fuel station";
    return {
      ...station,
      fuelCoLocation: {
        petrol: yn(tags["fuel:petrol"]) === "no" ? "no" : "yes",
        diesel: yn(tags["fuel:diesel"]) === "no" ? "no" : "yes",
        cng:
          yn(tags["fuel:cng"]) === "yes" ? "yes" : yn(tags["fuel:cng"]) === "no" ? "no" : "unknown",
        fuelStationName: name,
        note: "Fuel station found within ~100 m of this charger (OpenStreetMap).",
      },
    };
  } catch {
    return station;
  }
}

export async function fetchOsmStationsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): Promise<EvStation[]> {
  const radiusM = Math.min(Math.max(radiusKm, 1), 50) * 1000;
  // Free OpenStreetMap coverage: chargers, fuel+EV, battery swap.
  // Address reverse-geocode is NOT done here (keeps search fast); detail page enriches.
  const query = `
    [out:json][timeout:45];
    (
      node["amenity"="charging_station"](around:${radiusM},${lat},${lng});
      way["amenity"="charging_station"](around:${radiusM},${lat},${lng});
      relation["amenity"="charging_station"](around:${radiusM},${lat},${lng});
      node["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${lat},${lng});
      way["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${lat},${lng});
      node["battery_swap"="yes"](around:${radiusM},${lat},${lng});
      way["battery_swap"="yes"](around:${radiusM},${lat},${lng});
      node["socket:battery_swap"](around:${radiusM},${lat},${lng});
      way["socket:battery_swap"](around:${radiusM},${lat},${lng});
    );
    out center tags;
  `;

  const json = await overpassQuery(query);
  const seen = new Set<string>();
  const stations: EvStation[] = [];

  for (const el of json.elements ?? []) {
    const mapped = mapElement(el, lat, lng);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    stations.push(mapped);
  }

  stations.sort((a, b) => a.distanceKm - b.distanceKm);
  return stations.slice(0, Math.min(limit, 150));
}

/**
 * One Overpass request: chargers near several points along a driving corridor.
 * Used by the route planner so users can see stations between A and B.
 */
export async function fetchOsmStationsAlongCorridor(
  points: Array<{ lat: number; lng: number }>,
  radiusKm: number,
  limit: number,
): Promise<EvStation[]> {
  if (!points.length) return [];
  const radiusM = Math.min(Math.max(radiusKm, 1), 25) * 1000;
  const samples = points.slice(0, 12);
  const aroundBlocks = samples
    .map(
      (p) => `
      node["amenity"="charging_station"](around:${radiusM},${p.lat},${p.lng});
      way["amenity"="charging_station"](around:${radiusM},${p.lat},${p.lng});
      node["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${p.lat},${p.lng});
      way["amenity"="fuel"]["fuel:electricity"="yes"](around:${radiusM},${p.lat},${p.lng});
    `,
    )
    .join("\n");

  const query = `
    [out:json][timeout:18];
    (
      ${aroundBlocks}
    );
    out center tags;
  `;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14_000);
  try {
    let lastError: Error | null = null;
    let json: { elements?: OverpassElement[] } | null = null;
    for (const url of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: OVERPASS_HEADERS,
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        if (!res.ok) {
          lastError = new Error(`Overpass failed (${res.status})`);
          continue;
        }
        json = (await res.json()) as { elements?: OverpassElement[] };
        break;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        lastError = err instanceof Error ? err : new Error("Overpass request failed");
      }
    }
    if (!json) throw lastError ?? new Error("Overpass unavailable");

    const mid = samples[Math.floor(samples.length / 2)] ?? samples[0]!;
    const seen = new Set<string>();
    const stations: EvStation[] = [];
    for (const el of json.elements ?? []) {
      const mapped = mapElement(el, mid.lat, mid.lng);
      if (!mapped || seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      stations.push(mapped);
    }
    return stations.slice(0, Math.min(limit, 120));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOsmStationById(id: string): Promise<EvStation | null> {
  const match = /^osm-(node|way)-(\d+)$/.exec(id);
  if (!match) return null;
  const type = match[1]!;
  const osmId = match[2]!;
  const query = `
    [out:json][timeout:20];
    ${type}(${osmId});
    out center tags;
  `;

  try {
    const json = await overpassQuery(query);
    const el = json.elements?.[0];
    if (!el) return null;
    const lat = el.lat ?? el.center?.lat ?? 0;
    const lng = el.lon ?? el.center?.lon ?? 0;
    const base = mapElement(el, lat, lng);
    if (!base) return null;
    const withFuel = await enrichFuelNearby(base);
    const [withAddress] = await enrichStationAddresses([withFuel]);
    return withAddress ?? withFuel;
  } catch {
    return null;
  }
}
