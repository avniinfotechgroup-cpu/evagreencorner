import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SOLAR_LOCATIONS, estimateSolar, type SolarEstimate } from "@/data/solar";
import { listSolarLocationsCms } from "@/lib/platform/cms";
import { geocodeQuery } from "./geocode";

async function fetchPvgisSunHours(lat: number, lng: number): Promise<number | null> {
  try {
    const url = new URL("https://re.jrc.ec.europa.eu/api/v5_2/PVcalc");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("peakpower", "1");
    url.searchParams.set("loss", "14");
    url.searchParams.set("outputformat", "json");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      outputs?: { totals?: { fixed?: { E_y?: number } } };
    };
    const yearly = data.outputs?.totals?.fixed?.E_y;
    if (typeof yearly !== "number" || yearly <= 0) return null;
    // kWh/kWp/year ÷ 365 ≈ peak-sun-hours equivalent for daily average
    return Math.round((yearly / 365) * 100) / 100;
  } catch {
    return null;
  }
}

export const estimateSolarLive = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        locationSlug: z.string().min(2).max(60),
        locationQuery: z.string().max(120).optional(),
        roofAreaSqft: z.coerce.number().min(50).max(20000),
        usableFactor: z.coerce.number().min(0.4).max(1),
        shadingFactor: z.coerce.number().min(0.5).max(1),
        monthlyBill: z.coerce.number().min(500).max(200000),
        applySubsidy: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const catalog = (() => {
      try {
        return listSolarLocationsCms();
      } catch {
        return SOLAR_LOCATIONS;
      }
    })();
    const base = catalog.find((l) => l.slug === data.locationSlug) ?? catalog[0]!;

    let sunHours = base.sunHours;
    let source: "pvgis" | "benchmark" = "benchmark";
    let placeLabel = base.name;
    let warning: string | null = null;

    try {
      let lat = base.lat;
      let lng = base.lng;
      if (data.locationQuery?.trim()) {
        const place = await geocodeQuery(`${data.locationQuery}, India`);
        placeLabel = place.city || place.label;
        lat = place.lat;
        lng = place.lng;
      } else {
        placeLabel = `${base.name}, ${base.state}`;
      }
      const liveSun = await fetchPvgisSunHours(lat, lng);
      if (liveSun != null && liveSun > 2 && liveSun < 9) {
        sunHours = liveSun;
        source = "pvgis";
      } else {
        warning = "PVGIS sun data unavailable for this point — using city benchmark hours.";
      }
    } catch (err) {
      warning =
        (err instanceof Error ? err.message : "Geocode failed") +
        " — using city benchmark sun hours.";
    }

    const location = { ...base, name: placeLabel, sunHours };
    const estimate: SolarEstimate = estimateSolar({
      location,
      roofAreaSqft: data.roofAreaSqft,
      usableFactor: data.usableFactor,
      shadingFactor: data.shadingFactor,
      monthlyBill: data.monthlyBill,
      applySubsidy: data.applySubsidy,
    });

    return {
      estimate,
      location,
      source,
      warning,
    };
  });
