import { normalizeConnectors } from "./connector-normalizer";
import { haversineKm } from "./haversine";
import type { EvStation } from "./types";

interface OcmConnection {
  ConnectionType?: { Title?: string; FormalName?: string };
  PowerKW?: number | null;
  Quantity?: number | null;
  StatusType?: { IsOperational?: boolean | null };
}

interface OcmPoi {
  ID: number;
  UUID?: string;
  DateLastStatusUpdate?: string | null;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    Latitude?: number;
    Longitude?: number;
    AccessComments?: string;
    ContactTelephone1?: string;
    RelatedURL?: string;
  };
  OperatorInfo?: { Title?: string; WebsiteURL?: string; PhonePrimaryContact?: string };
  Connections?: OcmConnection[];
  NumberOfPoints?: number | null;
  StatusType?: { IsOperational?: boolean | null; Title?: string };
}

function mapPoi(poi: OcmPoi, originLat: number, originLng: number): EvStation | null {
  const lat = poi.AddressInfo?.Latitude;
  const lng = poi.AddressInfo?.Longitude;
  if (lat == null || lng == null) return null;

  const connections = poi.Connections ?? [];
  const connectors = normalizeConnectors(
    connections.map((c) => c.ConnectionType?.FormalName || c.ConnectionType?.Title || null),
  );
  const powers = connections
    .map((c) => c.PowerKW)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const maxPowerKw = powers.length ? Math.max(...powers) : null;
  const quantity = connections.reduce((sum, c) => sum + (c.Quantity && c.Quantity > 0 ? c.Quantity : 0), 0);
  const total = poi.NumberOfPoints && poi.NumberOfPoints > 0 ? poi.NumberOfPoints : Math.max(1, quantity || connectors.length || 1);

  const addr = poi.AddressInfo;
  const address =
    [addr?.AddressLine1, addr?.AddressLine2].filter(Boolean).join(", ") || "Address not available";
  const city = addr?.Town || "";
  const state = addr?.StateOrProvince || "";
  const pincode = addr?.Postcode || "";
  const knownPoints = Boolean(
    (poi.NumberOfPoints && poi.NumberOfPoints > 0) || quantity > 0,
  );

  return {
    id: `ocm-${poi.ID}`,
    source: "openchargemap",
    sourceId: String(poi.ID),
    name: addr?.Title || poi.OperatorInfo?.Title || "EV Charging Station",
    operator: poi.OperatorInfo?.Title || "Unknown operator",
    serviceType: "plug_in",
    batterySwap: false,
    address,
    area: city,
    city,
    state,
    pincode,
    fullAddress: [address, city, state, pincode].filter(Boolean).join(", "),
    addressFromGeocode: false,
    lat,
    lng,
    distanceKm: Math.round(haversineKm(originLat, originLng, lat, lng) * 10) / 10,
    connectors: connectors.length ? connectors : ["Not specified"],
    maxPowerKw,
    pricePerKwh: null,
    pricingNote: null,
    total,
    chargingPointsKnown: knownPoints,
    open24: null,
    openingHours: null,
    website: poi.OperatorInfo?.WebsiteURL || addr?.RelatedURL || null,
    phone: poi.OperatorInfo?.PhonePrimaryContact || addr?.ContactTelephone1 || null,
    availability: "UNKNOWN",
    rushLevel: "UNKNOWN",
    rushNote: "Rush / busy-level data is not available from the source.",
    vehicleAccess: {
      cars: "unknown",
      twoWheelers: "unknown",
      threeWheelers: "unknown",
      buses: "unknown",
      trucks: "unknown",
    },
    fuelCoLocation: {
      petrol: "unknown",
      diesel: "unknown",
      cng: "unknown",
      fuelStationName: null,
      note: null,
    },
    access: addr?.AccessComments || null,
    lastUpdated: poi.DateLastStatusUpdate || null,
  };
}

function apiKey(): string | undefined {
  const fromProcess =
    typeof process !== "undefined"
      ? process.env["OPEN_CHARGE_MAP_API_KEY"] || process.env["VITE_OPEN_CHARGE_MAP_API_KEY"]
      : undefined;
  const fromVite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (
    fromProcess || fromVite?.["OPEN_CHARGE_MAP_API_KEY"] || fromVite?.["VITE_OPEN_CHARGE_MAP_API_KEY"]
  );
}

export function isOcmConfigured(): boolean {
  return Boolean(apiKey());
}

export async function fetchOcmStationsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): Promise<EvStation[]> {
  const key = apiKey();
  if (!key) throw new Error("OPEN_CHARGE_MAP_API_KEY is not configured");

  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("distance", String(Math.min(Math.max(radiusKm, 1), 50)));
  url.searchParams.set("distanceunit", "KM");
  url.searchParams.set("maxresults", String(Math.min(limit, 100)));
  url.searchParams.set("compact", "true");
  url.searchParams.set("verbose", "false");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-Key": key,
      "User-Agent": "EvaGreenCorner/1.0 (https://evagreencorner.com)",
    },
  });

  if (!res.ok) {
    throw new Error(`Open Charge Map failed (${res.status})`);
  }

  const data = (await res.json()) as OcmPoi[];
  return data
    .map((poi) => mapPoi(poi, lat, lng))
    .filter((s): s is EvStation => Boolean(s))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function fetchOcmStationById(id: string): Promise<EvStation | null> {
  const match = /^ocm-(\d+)$/.exec(id);
  if (!match) return null;
  const key = apiKey();
  if (!key) return null;

  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("chargepointid", match[1]!);
  url.searchParams.set("compact", "true");
  url.searchParams.set("verbose", "false");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-Key": key,
      "User-Agent": "EvaGreenCorner/1.0 (https://evagreencorner.com)",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as OcmPoi[];
  const poi = data[0];
  if (!poi) return null;
  const lat = poi.AddressInfo?.Latitude ?? 0;
  const lng = poi.AddressInfo?.Longitude ?? 0;
  return mapPoi(poi, lat, lng);
}
