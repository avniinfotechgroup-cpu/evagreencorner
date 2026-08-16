import { VEHICLES } from "../src/data/routePlanner.ts";

// Inline copy of planning math to verify
function pointAtKm(samples: Array<{ lat: number; lng: number; atKm: number }>, atKm: number) {
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

function planStopsFromSoc(input: {
  distanceKm: number;
  samples: Array<{ lat: number; lng: number; atKm: number }>;
  startSoc: number;
  reserveSoc: number;
  targetSoc: number;
  rangeKm: number;
  batteryKwh: number;
}) {
  const { distanceKm, samples, startSoc, reserveSoc, targetSoc, rangeKm, batteryKwh } = input;
  const kmPerPercent = rangeKm / 100;
  const usableRangeKm = Math.max(40, (100 - reserveSoc) * kmPerPercent * 0.9);
  const stops: Array<{ atKm: number; lat: number; lng: number; name: string }> = [];
  let soc = Math.min(100, Math.max(5, startSoc));
  let lastKm = 0;
  const maxStops = Math.min(12, Math.max(1, Math.ceil(distanceKm / usableRangeKm) + 1));

  for (let n = 0; n < maxStops; n++) {
    const remaining = distanceKm - lastKm;
    const reachableKm = (soc - reserveSoc) * kmPerPercent;
    if (reachableKm >= remaining - 2) break;

    const idealKm = lastKm + Math.max(40, reachableKm * 0.75);
    const windowLo = lastKm + 25;
    const windowHi = Math.min(distanceKm - 15, lastKm + reachableKm - 5);
    if (windowLo >= windowHi) break;

    const targetKm = Math.min(windowHi, Math.max(windowLo, idealKm));
    const pt = pointAtKm(samples, targetKm);
    const gap = pt.atKm - lastKm;
    if (gap < 20) break;

    const arrivalSoc = Math.max(reserveSoc * 0.4, soc - gap / kmPerPercent);
    const departureSoc = targetSoc;
    const kwhAdded = ((departureSoc - arrivalSoc) / 100) * batteryKwh;
    if (kwhAdded <= 1) break;

    stops.push({
      atKm: Math.round(pt.atKm),
      lat: pt.lat,
      lng: pt.lng,
      name: `Suggested · ${Math.round(pt.atKm)} km`,
    });
    soc = departureSoc;
    lastKm = pt.atKm;
  }
  return stops;
}

const vehicle = VEHICLES[0]!;
const distanceKm = 1515.9;
const samples = Array.from({ length: 40 }, (_, i) => ({
  lat: 28.6 - (i / 39) * 11,
  lng: 77.2 + (i / 39) * 1.5,
  atKm: Math.round((i / 39) * distanceKm),
}));

const stops = planStopsFromSoc({
  distanceKm,
  samples,
  startSoc: 80,
  reserveSoc: 12,
  targetSoc: 85,
  rangeKm: vehicle.rangeKm,
  batteryKwh: vehicle.batteryKwh,
});

console.log("vehicle", vehicle.name, "range", vehicle.rangeKm);
console.log("stops", stops.length, stops);
