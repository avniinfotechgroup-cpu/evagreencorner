/**
 * EV route planning dataset + estimator.
 *
 * Pure functions — swap `planRoute` for a routing API later; the UI contract
 * (RoutePlan) stays the same.
 */

export interface CorridorStop {
  name: string;
  city: string;
  atKm: number;
  powerKw: number;
  pricePerKwh: number;
  amenities: string[];
}

export interface Corridor {
  from: string;
  to: string;
  distanceKm: number;
  driveHours: number;
  stops: CorridorStop[];
}

export const CORRIDORS: Corridor[] = [
  {
    from: "Bengaluru",
    to: "Chennai",
    distanceKm: 348,
    driveHours: 5.4,
    stops: [
      { name: "Hoskote Highway Hub", city: "Hoskote", atKm: 32, powerKw: 60, pricePerKwh: 18, amenities: ["Cafe", "Restroom"] },
      { name: "Kolar Gold Fields Plaza", city: "Kolar", atKm: 96, powerKw: 120, pricePerKwh: 21, amenities: ["Food court", "EV lounge"] },
      { name: "Vellore Bypass Charge Point", city: "Vellore", atKm: 212, powerKw: 150, pricePerKwh: 23, amenities: ["24×7", "Restroom"] },
      { name: "Sriperumbudur Motorway Stop", city: "Sriperumbudur", atKm: 298, powerKw: 120, pricePerKwh: 22, amenities: ["Cafe", "Convenience"] },
    ],
  },
  {
    from: "Bengaluru",
    to: "Mysuru",
    distanceKm: 145,
    driveHours: 2.6,
    stops: [
      { name: "Bidadi Expressway Deck", city: "Bidadi", atKm: 34, powerKw: 60, pricePerKwh: 17, amenities: ["Cafe"] },
      { name: "Ramanagara Rest Point", city: "Ramanagara", atKm: 58, powerKw: 120, pricePerKwh: 20, amenities: ["Food court", "Restroom"] },
      { name: "Mandya Toll Charge Hub", city: "Mandya", atKm: 102, powerKw: 60, pricePerKwh: 18, amenities: ["24×7"] },
    ],
  },
  {
    from: "Bengaluru",
    to: "Hyderabad",
    distanceKm: 574,
    driveHours: 8.6,
    stops: [
      { name: "Chikkaballapur Highway Point", city: "Chikkaballapur", atKm: 58, powerKw: 60, pricePerKwh: 18, amenities: ["Cafe"] },
      { name: "Anantapur Solar Plaza", city: "Anantapur", atKm: 196, powerKw: 150, pricePerKwh: 22, amenities: ["Solar canopy", "Food court"] },
      { name: "Kurnool Riverside Stop", city: "Kurnool", atKm: 318, powerKw: 120, pricePerKwh: 21, amenities: ["24×7", "Restroom"] },
      { name: "Jadcherla Motorway Hub", city: "Jadcherla", atKm: 470, powerKw: 150, pricePerKwh: 23, amenities: ["EV lounge"] },
    ],
  },
  {
    from: "Mumbai",
    to: "Pune",
    distanceKm: 149,
    driveHours: 3,
    stops: [
      { name: "Panvel Expressway Charge", city: "Panvel", atKm: 38, powerKw: 120, pricePerKwh: 22, amenities: ["Cafe", "24×7"] },
      { name: "Lonavala Ghat Point", city: "Lonavala", atKm: 92, powerKw: 60, pricePerKwh: 20, amenities: ["Food court"] },
    ],
  },
  {
    from: "Delhi",
    to: "Jaipur",
    distanceKm: 281,
    driveHours: 4.8,
    stops: [
      { name: "Gurugram Toll Hub", city: "Gurugram", atKm: 34, powerKw: 150, pricePerKwh: 24, amenities: ["EV lounge", "24×7"] },
      { name: "Neemrana Highway Deck", city: "Neemrana", atKm: 122, powerKw: 120, pricePerKwh: 22, amenities: ["Cafe", "Restroom"] },
      { name: "Shahpura Rest Stop", city: "Shahpura", atKm: 214, powerKw: 60, pricePerKwh: 19, amenities: ["Convenience"] },
    ],
  },
];

export const ROUTE_PRESETS = CORRIDORS.map((c) => ({ from: c.from, to: c.to }));

export interface VehicleProfile {
  id: string;
  name: string;
  batteryKwh: number;
  /** Typical claimed / MIDC-style range used for stop planning (km). */
  rangeKm: number;
  connector: string;
  /** True for scooters / 2W–3W that use battery-swap networks */
  batterySwap: boolean;
  /** Optional display notes for admin / UI */
  brand?: string;
  segment?: string;
}

/**
 * India-focused route planner profiles.
 * Battery / range are reference planning values (variant-dependent; re-verify for quotes).
 */
export const VEHICLES: VehicleProfile[] = [
  {
    id: "nexon-ev-45",
    name: "Tata Nexon EV (45 kWh)",
    brand: "Tata",
    segment: "SUV",
    batteryKwh: 45,
    rangeKm: 465,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "nexon-ev-40",
    name: "Tata Nexon EV (40 kWh)",
    brand: "Tata",
    segment: "SUV",
    batteryKwh: 40,
    rangeKm: 375,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "punch-ev-35",
    name: "Tata Punch EV (35 kWh)",
    brand: "Tata",
    segment: "Micro SUV",
    batteryKwh: 35,
    rangeKm: 421,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "tiago-ev-24",
    name: "Tata Tiago EV (24 kWh)",
    brand: "Tata",
    segment: "Hatchback",
    batteryKwh: 24,
    rangeKm: 315,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "curvv-ev",
    name: "Tata Curvv EV (55 kWh)",
    brand: "Tata",
    segment: "Coupe SUV",
    batteryKwh: 55,
    rangeKm: 502,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "mg-zs-50",
    name: "MG ZS EV (50.3 kWh)",
    brand: "MG",
    segment: "SUV",
    batteryKwh: 50.3,
    rangeKm: 461,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "mg-windsor",
    name: "MG Windsor EV (38 kWh)",
    brand: "MG",
    segment: "SUV",
    batteryKwh: 38,
    rangeKm: 331,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "xuv400",
    name: "Mahindra XUV400 (39.4 kWh)",
    brand: "Mahindra",
    segment: "SUV",
    batteryKwh: 39.4,
    rangeKm: 456,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "be6e",
    name: "Mahindra BE 6e (59 kWh)",
    brand: "Mahindra",
    segment: "SUV",
    batteryKwh: 59,
    rangeKm: 535,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "xev9e",
    name: "Mahindra XEV 9e (59 kWh)",
    brand: "Mahindra",
    segment: "SUV",
    batteryKwh: 59,
    rangeKm: 542,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "byd-atto3",
    name: "BYD Atto 3 (60.5 kWh)",
    brand: "BYD",
    segment: "SUV",
    batteryKwh: 60.5,
    rangeKm: 521,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "byd-seal",
    name: "BYD Seal (82.5 kWh)",
    brand: "BYD",
    segment: "Sedan",
    batteryKwh: 82.5,
    rangeKm: 650,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "hyundai-creta-ev",
    name: "Hyundai Creta Electric (51.4 kWh)",
    brand: "Hyundai",
    segment: "SUV",
    batteryKwh: 51.4,
    rangeKm: 473,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "kia-ev6",
    name: "Kia EV6 (77.4 kWh)",
    brand: "Kia",
    segment: "Crossover",
    batteryKwh: 77.4,
    rangeKm: 708,
    connector: "CCS2",
    batterySwap: false,
  },
  {
    id: "ola-s1-pro",
    name: "Ola S1 Pro (4 kWh)",
    brand: "Ola",
    segment: "Scooter",
    batteryKwh: 4,
    rangeKm: 195,
    connector: "Type 2 / Portable",
    batterySwap: false,
  },
  {
    id: "ather-450x",
    name: "Ather 450X (3.7 kWh)",
    brand: "Ather",
    segment: "Scooter",
    batteryKwh: 3.7,
    rangeKm: 150,
    connector: "Type 2 / Portable",
    batterySwap: false,
  },
  {
    id: "bounce-infinity",
    name: "Bounce Infinity E1 (swap)",
    brand: "Bounce",
    segment: "Scooter",
    batteryKwh: 1.9,
    rangeKm: 85,
    connector: "Battery swap",
    batterySwap: true,
  },
  {
    id: "sun-mobility-3w",
    name: "EV 3W / loader (battery swap)",
    brand: "Swap network",
    segment: "3-wheeler",
    batteryKwh: 5,
    rangeKm: 100,
    connector: "Battery swap",
    batterySwap: true,
  },
];

/** Map old saved vehicle ids → current catalog */
const VEHICLE_ALIASES: Record<string, string> = {
  "nexon-ev": "nexon-ev-40",
  "mg-zs": "mg-zs-50",
  "tiago-ev": "tiago-ev-24",
  "swap-scooter": "bounce-infinity",
  "swap-3w": "sun-mobility-3w",
};

export function resolveRouteVehicle(id: string | undefined | null): VehicleProfile {
  const key = id ? VEHICLE_ALIASES[id] ?? id : VEHICLES[0]!.id;
  return VEHICLES.find((v) => v.id === key) ?? VEHICLES[0]!;
}

export interface PlannedStop extends CorridorStop {
  arrivalSoc: number;
  departureSoc: number;
  kwhAdded: number;
  cost: number;
  minutes: number;
  lat?: number;
  lng?: number;
}

export interface RoutePlan {
  from: string;
  to: string;
  distanceKm: number;
  driveHours: number;
  chargingMinutes: number;
  totalHours: number;
  stops: PlannedStop[];
  energyKwh: number;
  energyCost: number;
  petrolCost: number;
  co2SavedKg: number;
  arrivalSoc: number;
  synthetic: boolean;
}

/** Charging stations found near the driving path (for map + browse list). */
export type RouteCorridorStation = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** Approximate distance along route (km) */
  atKm: number;
  powerKw: number | null;
  connectors: string[];
  pricePerKwh: number | null;
  /** True when this station was chosen as a planned charge stop */
  planned?: boolean;
  /** Battery-swap-only (or primarily swap) location */
  batterySwap?: boolean;
  serviceType?: "plug_in" | "battery_swap" | "both";
};

/** Swap-only sites are irrelevant for plug-in cars (Nexon, etc.). */
export function isBatterySwapOnlyStation(s: {
  batterySwap?: boolean;
  serviceType?: string | null;
  connectors?: string[];
  name?: string;
}): boolean {
  if (s.serviceType === "battery_swap") return true;
  if (s.serviceType === "both") return false;
  if (s.serviceType === "plug_in") return false;
  const connectors = s.connectors ?? [];
  const hasPlug = connectors.some((c) =>
    /ccs|type\s*2|chademo|gb\/t|\bac\b|dc\b|bharat/i.test(c),
  );
  const hasSwapLabel = connectors.some((c) => /battery\s*swap|swap/i.test(c));
  if (hasPlug && !hasSwapLabel) return false;
  if (hasSwapLabel && !hasPlug) return true;
  if (s.batterySwap && !hasPlug) return true;
  return /battery\s*swap|\(battery swap\)/i.test(s.name ?? "");
}

export type RouteMapPayload = {
  geometry: Array<{ lat: number; lng: number }>;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  corridorStations?: RouteCorridorStation[];
};

function findCorridor(from: string, to: string): Corridor | undefined {
  const a = from.trim().toLowerCase();
  const b = to.trim().toLowerCase();
  return CORRIDORS.find(
    (c) =>
      (c.from.toLowerCase() === a && c.to.toLowerCase() === b) ||
      (c.from.toLowerCase() === b && c.to.toLowerCase() === a),
  );
}

/** Deterministic pseudo-corridor for city pairs we do not have mapped yet. */
function syntheticCorridor(from: string, to: string): Corridor {
  const seed = [...`${from}${to}`].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const distanceKm = 180 + (seed % 420);
  const count = Math.max(1, Math.round(distanceKm / 140));
  const stops: CorridorStop[] = Array.from({ length: count }, (_, i) => ({
    name: `Highway Charge Hub ${i + 1}`,
    city: `En route to ${to.trim() || "destination"}`,
    atKm: Math.round((distanceKm / (count + 1)) * (i + 1)),
    powerKw: [60, 120, 150][(seed + i) % 3]!,
    pricePerKwh: 17 + ((seed + i) % 7),
    amenities: ["Cafe", "Restroom"],
  }));
  return { from, to, distanceKm, driveHours: distanceKm / 62, stops };
}

export interface PlanInput {
  from: string;
  to: string;
  vehicle: VehicleProfile;
  startSoc: number;
  reserveSoc?: number;
  targetSoc?: number;
}

export function planRoute({
  from,
  to,
  vehicle,
  startSoc,
  reserveSoc = 12,
  targetSoc = 85,
}: PlanInput): RoutePlan {
  const known = findCorridor(from, to);
  const corridor = known ?? syntheticCorridor(from, to);
  const kmPerPercent = vehicle.rangeKm / 100;
  const kwhPerKm = vehicle.batteryKwh / vehicle.rangeKm;

  const stops: PlannedStop[] = [];
  let soc = Math.min(100, Math.max(5, startSoc));
  let lastKm = 0;

  for (const stop of corridor.stops) {
    const remaining = corridor.distanceKm - lastKm;
    const reachableKm = (soc - reserveSoc) * kmPerPercent;
    if (reachableKm >= remaining) break; // can finish without stopping again

    const nextGap = stop.atKm - lastKm;
    // Only stop when we cannot comfortably reach beyond this point.
    const kmToStopAfter =
      (corridor.stops.find((s) => s.atKm > stop.atKm)?.atKm ?? corridor.distanceKm) - lastKm;
    if (reachableKm >= kmToStopAfter) {
      continue;
    }

    const arrivalSoc = Math.max(reserveSoc * 0.5, soc - nextGap / kmPerPercent);
    const departureSoc = targetSoc;
    const kwhAdded = ((departureSoc - arrivalSoc) / 100) * vehicle.batteryKwh;
    if (kwhAdded <= 1) continue;

    // DC charging tapers; assume ~72% of rated power on average.
    const minutes = Math.round((kwhAdded / (stop.powerKw * 0.72)) * 60) + 5;

    stops.push({
      ...stop,
      arrivalSoc: Math.round(arrivalSoc),
      departureSoc,
      kwhAdded: Math.round(kwhAdded * 10) / 10,
      cost: Math.round(kwhAdded * stop.pricePerKwh),
      minutes,
    });

    soc = departureSoc;
    lastKm = stop.atKm;
  }

  const arrivalSoc = Math.max(0, Math.round(soc - (corridor.distanceKm - lastKm) / kmPerPercent));
  const energyKwh = Math.round(corridor.distanceKm * kwhPerKm * 10) / 10;
  const energyCost = stops.reduce((n, s) => n + s.cost, 0);
  const chargingMinutes = stops.reduce((n, s) => n + s.minutes, 0);
  const petrolCost = Math.round((corridor.distanceKm / 16) * 105);
  const co2SavedKg = Math.round(corridor.distanceKm * 0.11 * 10) / 10;

  return {
    from: corridor.from,
    to: corridor.to,
    distanceKm: corridor.distanceKm,
    driveHours: Math.round(corridor.driveHours * 10) / 10,
    chargingMinutes,
    totalHours: Math.round((corridor.driveHours + chargingMinutes / 60) * 10) / 10,
    stops,
    energyKwh,
    energyCost,
    petrolCost,
    co2SavedKg,
    arrivalSoc,
    synthetic: !known,
  };
}
