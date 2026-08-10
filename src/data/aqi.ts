/**
 * Air-quality dataset.
 *
 * Provider-agnostic: swap `getAirQuality` for a live API call (CPCB, OpenAQ,
 * IQAir...) without touching any UI component.
 */

export interface Pollutant {
  code: string;
  label: string;
  value: number;
  unit: string;
  limit: number;
}

export interface AirQuality {
  slug: string;
  area: string;
  city: string;
  aqi: number;
  updated: string;
  station: string;
  pollutants: Pollutant[];
  /** Last 7 days, oldest first. */
  trend: { day: string; aqi: number }[];
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export interface AqiCategory {
  label: string;
  advice: string;
  cls: string;
  dot: string;
}

export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50)
    return {
      label: "Good",
      advice: "Air is clean — ideal for outdoor charging stops and exercise.",
      cls: "bg-volt-gradient text-volt-foreground",
      dot: "bg-leaf",
    };
  if (aqi <= 100)
    return {
      label: "Satisfactory",
      advice: "Minor discomfort possible for unusually sensitive people.",
      cls: "bg-leaf/20 text-foreground",
      dot: "bg-leaf",
    };
  if (aqi <= 200)
    return {
      label: "Moderate",
      advice: "People with asthma or heart conditions should limit long exposure.",
      cls: "bg-amber/25 text-foreground",
      dot: "bg-amber",
    };
  return {
    label: "Poor",
    advice: "Reduce prolonged outdoor activity; keep cabin recirculation on.",
    cls: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildTrend(base: number, seed: number) {
  return DAYS.map((day, i) => {
    const wave = Math.sin((i + seed) * 1.1) * 14 + Math.cos((i + seed) * 0.7) * 8;
    return { day, aqi: Math.max(18, Math.round(base + wave)) };
  });
}

function buildPollutants(aqi: number): Pollutant[] {
  const k = aqi / 100;
  return [
    { code: "pm25", label: "PM2.5", value: Math.round(28 * k * 10) / 10, unit: "µg/m³", limit: 60 },
    { code: "pm10", label: "PM10", value: Math.round(64 * k * 10) / 10, unit: "µg/m³", limit: 100 },
    { code: "no2", label: "NO₂", value: Math.round(31 * k * 10) / 10, unit: "µg/m³", limit: 80 },
    { code: "so2", label: "SO₂", value: Math.round(11 * k * 10) / 10, unit: "µg/m³", limit: 80 },
    { code: "o3", label: "O₃", value: Math.round(24 * k * 10) / 10, unit: "µg/m³", limit: 100 },
    { code: "co", label: "CO", value: Math.round(9 * k) / 10, unit: "mg/m³", limit: 4 },
  ];
}

const BASE: { area: string; city: string; aqi: number; station: string }[] = [
  { area: "Indiranagar", city: "Bengaluru", aqi: 62, station: "BWSSB Kadabesanahalli" },
  { area: "Koramangala", city: "Bengaluru", aqi: 71, station: "Silk Board CAAQMS" },
  { area: "Whitefield", city: "Bengaluru", aqi: 88, station: "ITPL Monitoring Unit" },
  { area: "HSR Layout", city: "Bengaluru", aqi: 66, station: "HSR Sector 3 CAAQMS" },
  { area: "Hebbal", city: "Bengaluru", aqi: 94, station: "Hebbal CAAQMS" },
  { area: "Jayanagar", city: "Bengaluru", aqi: 58, station: "Jayanagar 5th Block" },
  { area: "Electronic City", city: "Bengaluru", aqi: 79, station: "E-City Phase 1" },
  { area: "Yelahanka", city: "Bengaluru", aqi: 55, station: "Yelahanka Satellite Town" },
];

export const AIR_QUALITY: AirQuality[] = BASE.map((b, i) => ({
  slug: slugify(b.area),
  area: b.area,
  city: b.city,
  aqi: b.aqi,
  station: b.station,
  updated: "Updated 15 min ago",
  pollutants: buildPollutants(b.aqi),
  trend: buildTrend(b.aqi, i),
}));

const CITY_FALLBACK: AirQuality = {
  slug: "bengaluru",
  area: "Bengaluru",
  city: "Bengaluru",
  aqi: 72,
  station: "City average · 8 monitors",
  updated: "Updated 15 min ago",
  pollutants: buildPollutants(72),
  trend: buildTrend(72, 3),
};

/** Resolve air quality for a free-text query, area name or pincode. */
export function getAirQuality(query?: string): AirQuality {
  if (!query) return CITY_FALLBACK;
  const q = query.trim().toLowerCase();
  if (!q) return CITY_FALLBACK;
  return (
    AIR_QUALITY.find((a) => a.slug === slugify(q)) ??
    AIR_QUALITY.find((a) => a.area.toLowerCase().includes(q) || q.includes(a.area.toLowerCase())) ??
    CITY_FALLBACK
  );
}
