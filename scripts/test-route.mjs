import { planLiveRoute } from "../src/lib/ev/live-route.ts";
import { VEHICLES } from "../src/data/routePlanner.ts";
import { resolveIndiaLocation, searchIndiaLocations } from "../src/data/indiaLocations.ts";

async function main() {
  console.log("resolve Bengaluru", resolveIndiaLocation("Bengaluru"));
  console.log("search Ben", searchIndiaLocations("Ben", 3).map((x) => x.name));
  const vehicle = VEHICLES[0];
  if (!vehicle) throw new Error("no vehicle");
  try {
    const r = await planLiveRoute({
      from: "Bengaluru",
      to: "Chennai",
      vehicle,
      startSoc: 80,
      fromLat: 12.9716,
      fromLng: 77.5946,
      toLat: 13.0827,
      toLng: 80.2707,
    });
    console.log("route ok", {
      km: r.distanceKm,
      stops: r.stops.length,
      pts: r.map.geometry.length,
      warning: r.warning ?? null,
    });
  } catch (e) {
    console.error("route fail", e instanceof Error ? e.message : e);
  }
}

void main();
