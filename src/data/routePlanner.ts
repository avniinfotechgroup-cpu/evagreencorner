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
  rangeKm: number;
  connector: string;
}

export const VEHICLES: VehicleProfile[] = [
  { id: "nexon-ev", name: "Tata Nexon EV LR", batteryKwh: 40.5, rangeKm: 380, connector: "CCS2" },
  { id: "mg-zs", name: "MG ZS EV", batteryKwh: 50.3, rangeKm: 420, connector: "CCS2" },
  { id: "xuv400", name: "Mahindra XUV400", batteryKwh: 39.4, rangeKm: 350, connector: "CCS2" },
  { id: "tiago-ev", name: "Tata Tiago EV", batteryKwh: 24, rangeKm: 250, connector: "CCS2" },
  { id: "byd-atto3", name: "BYD Atto 3", batteryKwh: 60.5, rangeKm: 480, connector: "CCS2" },
];

export interface PlannedStop extends CorridorStop {
  arrivalSoc: number;
  departureSoc: number;
  kwhAdded: number;
  cost: number;
  minutes: number;
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
