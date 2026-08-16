import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AQI_PLACES,
  computeIndianAqi,
  resolveAqiPlace,
  slugify,
  usAqiCategory,
  weatherConditionFromCode,
  type AirQuality,
  type AqiMapPin,
  type AqiWeather,
} from "@/data/aqi";
import { geocodeQuery } from "./geocode";

type OpenMeteoAir = {
  current?: {
    time?: string;
    pm10?: number;
    pm2_5?: number;
    carbon_monoxide?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    us_aqi?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
};

type OpenMeteoWeather = {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    uv_index?: number;
  };
};

function formatUpdatedLabel(iso?: string) {
  if (!iso) return "Just now";
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  const t = Date.parse(normalized);
  if (!Number.isFinite(t)) return iso;
  const d = new Date(t);
  const stamp = d.toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Last Updated: ${stamp} (Local Time)`;
}

function dailyTrendFromHourly(hourly?: OpenMeteoAir["hourly"]) {
  if (!hourly?.time?.length) return [] as AirQuality["trend"];
  const byDay = new Map<string, number[]>();

  for (let i = 0; i < hourly.time.length; i++) {
    const stamp = hourly.time[i]!;
    const dayKey = stamp.slice(0, 10);
    const us = hourly.us_aqi?.[i];
    let aqi: number;
    if (us != null && Number.isFinite(us)) {
      aqi = Math.round(us);
    } else {
      const sample = { pm25: hourly.pm2_5?.[i] ?? null, pm10: hourly.pm10?.[i] ?? null };
      if (sample.pm25 == null && sample.pm10 == null) continue;
      aqi = computeIndianAqi(sample).aqi;
    }
    const list = byDay.get(dayKey) ?? [];
    list.push(aqi);
    byDay.set(dayKey, list);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, values]) => {
      const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
      const d = new Date(`${date}T12:00:00`);
      return {
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        aqi: avg,
      };
    });
}

async function fetchOpenMeteoAir(lat: number, lng: number): Promise<OpenMeteoAir> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
  );
  url.searchParams.set("hourly", "pm2_5,pm10,us_aqi");
  url.searchParams.set("past_days", "7");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Air quality upstream failed (${res.status})`);
  return (await res.json()) as OpenMeteoAir;
}

async function fetchOpenMeteoWeather(lat: number, lng: number): Promise<OpenMeteoWeather | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index",
    );
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as OpenMeteoWeather;
  } catch {
    return null;
  }
}

async function fetchNearbyPins(
  centerLat: number,
  centerLng: number,
  city: string,
  centerAqi: number,
): Promise<AqiMapPin[]> {
  const sameCity = AQI_PLACES.filter((p) => p.city === city).slice(0, 6);
  const offsets =
    sameCity.length >= 3
      ? sameCity
      : [
          { area: "Centre", city, lat: centerLat, lng: centerLng },
          { area: "North", city, lat: centerLat + 0.04, lng: centerLng + 0.01 },
          { area: "East", city, lat: centerLat + 0.01, lng: centerLng + 0.05 },
          { area: "South", city, lat: centerLat - 0.04, lng: centerLng - 0.02 },
          { area: "West", city, lat: centerLat - 0.01, lng: centerLng - 0.05 },
        ];

  const pins = await Promise.all(
    offsets.map(async (p, i) => {
      try {
        if (Math.abs(p.lat - centerLat) < 0.001 && Math.abs(p.lng - centerLng) < 0.001) {
          return {
            id: `pin-${i}`,
            label: p.area,
            lat: p.lat,
            lng: p.lng,
            aqi: centerAqi,
          } satisfies AqiMapPin;
        }
        const raw = await fetchOpenMeteoAir(p.lat, p.lng);
        const aqi = Math.round(raw.current?.us_aqi ?? centerAqi);
        return {
          id: `pin-${i}`,
          label: p.area,
          lat: p.lat,
          lng: p.lng,
          aqi,
        } satisfies AqiMapPin;
      } catch {
        return {
          id: `pin-${i}`,
          label: p.area,
          lat: p.lat,
          lng: p.lng,
          aqi: centerAqi + (i % 3) - 1,
        } satisfies AqiMapPin;
      }
    }),
  );

  return pins;
}

function resolveCoords(input: {
  query?: string | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
}) {
  let lat = input.lat;
  let lng = input.lng;
  let area = "Selected location";
  let city = "India";
  let warning: string | null = null;

  const known = resolveAqiPlace(input.query);
  const q = input.query?.trim().toLowerCase() ?? "";

  if (
    (lat == null || lng == null) &&
    known &&
    (!q ||
      known.area.toLowerCase() === q ||
      known.city.toLowerCase() === q ||
      known.area.toLowerCase().includes(q) ||
      q.includes(known.area.toLowerCase()))
  ) {
    lat = known.lat;
    lng = known.lng;
    area = known.area;
    city = known.city;
  }

  return { lat, lng, area, city, warning, known, q };
}

export const fetchAirQualityLive = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        query: z.string().max(120).optional(),
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let { lat, lng, area, city, warning, known } = resolveCoords(data);

    if ((lat == null || lng == null) && data.query?.trim()) {
      try {
        const place = await geocodeQuery(`${data.query.trim()}, India`);
        lat = place.lat;
        lng = place.lng;
        city = place.city || "India";
        area = data.query.trim() || city;
      } catch {
        if (known) {
          lat = known.lat;
          lng = known.lng;
          area = known.area;
          city = known.city;
          warning = "Geocoding failed — using nearest curated place.";
        } else {
          throw new Error(`Could not find “${data.query}”`);
        }
      }
    }

    if (lat == null || lng == null) {
      const fallback = resolveAqiPlace("New Delhi")!;
      lat = fallback.lat;
      lng = fallback.lng;
      area = fallback.area;
      city = fallback.city;
    }

    const [raw, weatherRaw] = await Promise.all([
      fetchOpenMeteoAir(lat, lng),
      fetchOpenMeteoWeather(lat, lng),
    ]);

    const cur = raw.current ?? {};
    const indian = computeIndianAqi({
      pm25: cur.pm2_5,
      pm10: cur.pm10,
      no2: cur.nitrogen_dioxide,
      so2: cur.sulphur_dioxide,
      o3: cur.ozone,
      coUg: cur.carbon_monoxide,
    });

    const usAqi = Math.round(cur.us_aqi ?? indian.aqi);
    const cat = usAqiCategory(usAqi);
    const wCur = weatherRaw?.current ?? {};
    const weatherCode = wCur.weather_code ?? 0;

    const weather: AqiWeather = {
      tempC: Math.round(wCur.temperature_2m ?? 28),
      humidity: Math.round(wCur.relative_humidity_2m ?? 50),
      windKmh: Math.round((wCur.wind_speed_10m ?? 8) * 10) / 10,
      uvIndex: Math.round(wCur.uv_index ?? 0),
      condition: weatherConditionFromCode(weatherCode, usAqi),
      weatherCode,
    };

    const trend = dailyTrendFromHourly(raw.hourly);
    const locationLabel =
      area.toLowerCase() === city.toLowerCase()
        ? `${city}, India`
        : `${area}, ${city}, India`;

    const result: AirQuality = {
      slug: slugify(area),
      area,
      city,
      aqi: usAqi,
      indiaAqi: indian.aqi,
      scale: "us",
      dominant: indian.dominant,
      station: locationLabel,
      updated: formatUpdatedLabel(cur.time),
      updatedAt: cur.time,
      pollutants: indian.pollutants,
      trend: trend.length > 0 ? trend : [{ day: "Now", aqi: usAqi }],
      source: "live",
      lat,
      lng,
      statusLabel: cat.label,
      statusAdvice: cat.advice,
      accent: cat.accent,
    };

    const nearby = await fetchNearbyPins(lat, lng, city, usAqi);

    return {
      data: result,
      weather,
      nearby,
      warning,
      attribution:
        "Live US AQI & pollutants from Open-Meteo (CAMS). Weather from Open-Meteo. Values can differ from a single ground station on IQAir / CPCB.",
    };
  });
