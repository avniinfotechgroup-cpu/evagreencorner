/**
 * Air quality types, US EPA + CPCB helpers, curated India places.
 * Live readings via `fetchAirQualityLive` (Open-Meteo CAMS + weather).
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
  /** Display AQI — US EPA by default for IQAir-style UI. */
  aqi: number;
  /** Indian National AQI (CPCB) from same pollutants. */
  indiaAqi?: number;
  scale?: "us" | "in";
  updated: string;
  updatedAt?: string;
  station: string;
  pollutants: Pollutant[];
  trend: { day: string; aqi: number }[];
  source?: "live" | "benchmark";
  dominant?: string;
  lat?: number;
  lng?: number;
  statusLabel?: string;
  statusAdvice?: string;
  accent?: string;
}

export interface AqiWeather {
  tempC: number;
  humidity: number;
  windKmh: number;
  uvIndex: number;
  condition: string;
  weatherCode: number;
}

export interface AqiMapPin {
  id: string;
  label: string;
  lat: number;
  lng: number;
  aqi: number;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export interface AqiCategory {
  label: string;
  advice: string;
  cls: string;
  dot: string;
  /** Hex accent for dark dashboard. */
  accent: string;
}

/** US EPA AQI bands — matches IQAir-style scale bar labels. */
export function usAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50)
    return {
      label: "Good",
      advice: "Air quality is satisfactory — enjoy outdoor charging stops.",
      cls: "bg-emerald-500/25 text-emerald-200",
      dot: "bg-emerald-400",
      accent: "#22c55e",
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      advice: "Acceptable; unusually sensitive people may notice mild effects.",
      cls: "bg-yellow-500/25 text-yellow-100",
      dot: "bg-yellow-400",
      accent: "#eab308",
    };
  if (aqi <= 150)
    return {
      label: "Poor",
      advice: "Sensitive groups should limit prolonged outdoor exertion.",
      cls: "bg-orange-500/25 text-orange-100",
      dot: "bg-orange-400",
      accent: "#f97316",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      advice: "Everyone may feel effects — reduce outdoor activity.",
      cls: "bg-rose-500/30 text-rose-100",
      dot: "bg-rose-400",
      accent: "#f43f5e",
    };
  if (aqi <= 300)
    return {
      label: "Severe",
      advice: "Health alert — avoid outdoor exertion; keep cabin recirculation on.",
      cls: "bg-fuchsia-500/30 text-fuchsia-100",
      dot: "bg-fuchsia-400",
      accent: "#d946ef",
    };
  return {
    label: "Hazardous",
    advice: "Emergency conditions — stay indoors with filtered air if possible.",
    cls: "bg-red-900/50 text-red-100",
    dot: "bg-red-800",
    accent: "#7f1d1d",
  };
}

/** CPCB National AQI bands (0–500). */
export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50)
    return {
      label: "Good",
      advice: "Air is clean — ideal for outdoor charging stops and exercise.",
      cls: "bg-volt-gradient text-volt-foreground",
      dot: "bg-leaf",
      accent: "#22c55e",
    };
  if (aqi <= 100)
    return {
      label: "Satisfactory",
      advice: "Minor discomfort possible for unusually sensitive people.",
      cls: "bg-leaf/20 text-foreground",
      dot: "bg-leaf",
      accent: "#84cc16",
    };
  if (aqi <= 200)
    return {
      label: "Moderate",
      advice: "People with asthma or heart conditions should limit long exposure.",
      cls: "bg-amber/25 text-foreground",
      dot: "bg-amber",
      accent: "#f59e0b",
    };
  if (aqi <= 300)
    return {
      label: "Poor",
      advice: "Reduce prolonged outdoor activity; keep cabin recirculation on.",
      cls: "bg-destructive/15 text-destructive",
      dot: "bg-destructive",
      accent: "#f43f5e",
    };
  if (aqi <= 400)
    return {
      label: "Very Poor",
      advice: "Avoid outdoor exertion; prefer indoor or filtered cabin air.",
      cls: "bg-destructive/20 text-destructive",
      dot: "bg-destructive",
      accent: "#e11d48",
    };
  return {
    label: "Severe",
    advice: "Stay indoors if possible — air quality is hazardous.",
    cls: "bg-destructive/25 text-destructive",
    dot: "bg-destructive",
    accent: "#7f1d1d",
  };
}

/** Position on US AQI colour bar (0–301+). */
export function usAqiBarPercent(aqi: number) {
  const stops = [0, 50, 100, 150, 200, 300, 301];
  const clamped = Math.max(0, Math.min(350, aqi));
  if (clamped >= 301) return 97;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (clamped <= b) {
      const seg = i / (stops.length - 1);
      const next = (i + 1) / (stops.length - 1);
      const t = (clamped - a) / (b - a || 1);
      return (seg + (next - seg) * t) * 100;
    }
  }
  return 97;
}

export const AQI_PLACES: Array<{
  area: string;
  city: string;
  lat: number;
  lng: number;
}> = [
  { area: "Indiranagar", city: "Bengaluru", lat: 12.9784, lng: 77.6408 },
  { area: "Koramangala", city: "Bengaluru", lat: 12.9352, lng: 77.6245 },
  { area: "Whitefield", city: "Bengaluru", lat: 12.9698, lng: 77.75 },
  { area: "HSR Layout", city: "Bengaluru", lat: 12.9116, lng: 77.6473 },
  { area: "Hebbal", city: "Bengaluru", lat: 13.0358, lng: 77.597 },
  { area: "Connaught Place", city: "Delhi", lat: 28.6315, lng: 77.2167 },
  { area: "Dwarka", city: "Delhi", lat: 28.5921, lng: 77.046 },
  { area: "New Delhi", city: "Delhi", lat: 28.6139, lng: 77.209 },
  { area: "Andheri", city: "Mumbai", lat: 19.1197, lng: 72.8468 },
  { area: "Powai", city: "Mumbai", lat: 19.1176, lng: 72.906 },
  { area: "Hitech City", city: "Hyderabad", lat: 17.4435, lng: 78.3772 },
  { area: "Anna Nagar", city: "Chennai", lat: 13.085, lng: 80.21 },
  { area: "Salt Lake", city: "Kolkata", lat: 22.5726, lng: 88.4138 },
  { area: "Baner", city: "Pune", lat: 18.559, lng: 73.7868 },
  { area: "Bengaluru", city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { area: "Delhi", city: "Delhi", lat: 28.6139, lng: 77.209 },
  { area: "Mumbai", city: "Mumbai", lat: 19.076, lng: 72.8777 },
];

export function resolveAqiPlace(query?: string) {
  if (!query?.trim()) return AQI_PLACES.find((p) => p.area === "New Delhi")!;
  const q = query.trim().toLowerCase();
  return (
    AQI_PLACES.find((p) => p.area.toLowerCase() === q) ??
    AQI_PLACES.find((p) => p.city.toLowerCase() === q) ??
    AQI_PLACES.find(
      (p) =>
        p.area.toLowerCase().includes(q) ||
        q.includes(p.area.toLowerCase()) ||
        p.city.toLowerCase().includes(q),
    ) ??
    null
  );
}

type Breakpoint = { lo: number; hi: number; iLo: number; iHi: number };

function subIndex(value: number, breaks: Breakpoint[]): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  for (const row of breaks) {
    if (value >= row.lo && value <= row.hi) {
      const span = row.hi - row.lo || 1;
      return Math.round(((row.iHi - row.iLo) / span) * (value - row.lo) + row.iLo);
    }
  }
  for (let i = 0; i < breaks.length - 1; i++) {
    const row = breaks[i]!;
    const next = breaks[i + 1]!;
    if (value > row.hi && value < next.lo) return row.iHi;
  }
  const last = breaks[breaks.length - 1]!;
  if (value > last.hi) return 500;
  return null;
}

const BP = {
  pm25: [
    { lo: 0, hi: 30, iLo: 0, iHi: 50 },
    { lo: 31, hi: 60, iLo: 51, iHi: 100 },
    { lo: 61, hi: 90, iLo: 101, iHi: 200 },
    { lo: 91, hi: 120, iLo: 201, iHi: 300 },
    { lo: 121, hi: 250, iLo: 301, iHi: 400 },
    { lo: 251, hi: 380, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { lo: 0, hi: 50, iLo: 0, iHi: 50 },
    { lo: 51, hi: 100, iLo: 51, iHi: 100 },
    { lo: 101, hi: 250, iLo: 101, iHi: 200 },
    { lo: 251, hi: 350, iLo: 201, iHi: 300 },
    { lo: 351, hi: 430, iLo: 301, iHi: 400 },
    { lo: 431, hi: 500, iLo: 401, iHi: 500 },
  ],
  no2: [
    { lo: 0, hi: 40, iLo: 0, iHi: 50 },
    { lo: 41, hi: 80, iLo: 51, iHi: 100 },
    { lo: 81, hi: 180, iLo: 101, iHi: 200 },
    { lo: 181, hi: 280, iLo: 201, iHi: 300 },
    { lo: 281, hi: 400, iLo: 301, iHi: 400 },
    { lo: 401, hi: 800, iLo: 401, iHi: 500 },
  ],
  o3: [
    { lo: 0, hi: 50, iLo: 0, iHi: 50 },
    { lo: 51, hi: 100, iLo: 51, iHi: 100 },
    { lo: 101, hi: 168, iLo: 101, iHi: 200 },
    { lo: 169, hi: 208, iLo: 201, iHi: 300 },
    { lo: 209, hi: 748, iLo: 301, iHi: 400 },
    { lo: 749, hi: 1000, iLo: 401, iHi: 500 },
  ],
  co: [
    { lo: 0, hi: 1, iLo: 0, iHi: 50 },
    { lo: 1.1, hi: 2, iLo: 51, iHi: 100 },
    { lo: 2.1, hi: 10, iLo: 101, iHi: 200 },
    { lo: 10.1, hi: 17, iLo: 201, iHi: 300 },
    { lo: 17.1, hi: 34, iLo: 301, iHi: 400 },
    { lo: 34.1, hi: 50, iLo: 401, iHi: 500 },
  ],
  so2: [
    { lo: 0, hi: 40, iLo: 0, iHi: 50 },
    { lo: 41, hi: 80, iLo: 51, iHi: 100 },
    { lo: 81, hi: 380, iLo: 101, iHi: 200 },
    { lo: 381, hi: 800, iLo: 201, iHi: 300 },
    { lo: 801, hi: 1600, iLo: 301, iHi: 400 },
    { lo: 1601, hi: 2000, iLo: 401, iHi: 500 },
  ],
} as const satisfies Record<string, Breakpoint[]>;

export interface PollutantSample {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  o3?: number | null;
  coUg?: number | null;
}

export function computeIndianAqi(sample: PollutantSample): {
  aqi: number;
  dominant: string;
  pollutants: Pollutant[];
} {
  const coMg =
    sample.coUg != null && Number.isFinite(sample.coUg) ? sample.coUg / 1000 : null;

  const scores: Array<{ code: string; label: string; index: number }> = [];
  const pm25 = subIndex(sample.pm25 ?? -1, BP.pm25);
  const pm10 = subIndex(sample.pm10 ?? -1, BP.pm10);
  const no2 = subIndex(sample.no2 ?? -1, BP.no2);
  const so2 = subIndex(sample.so2 ?? -1, BP.so2);
  const o3 = subIndex(sample.o3 ?? -1, BP.o3);
  const co = coMg != null ? subIndex(coMg, BP.co) : null;

  if (pm25 != null) scores.push({ code: "pm25", label: "PM2.5", index: pm25 });
  if (pm10 != null) scores.push({ code: "pm10", label: "PM10", index: pm10 });
  if (no2 != null) scores.push({ code: "no2", label: "NO₂", index: no2 });
  if (so2 != null) scores.push({ code: "so2", label: "SO₂", index: so2 });
  if (o3 != null) scores.push({ code: "o3", label: "O₃", index: o3 });
  if (co != null) scores.push({ code: "co", label: "CO", index: co });

  const top = scores.reduce(
    (best, s) => (s.index > best.index ? s : best),
    { code: "pm25", label: "PM2.5", index: 0 },
  );

  const pollutants: Pollutant[] = [
    { code: "pm25", label: "PM2.5", value: round1(sample.pm25), unit: "µg/m³", limit: 60 },
    { code: "pm10", label: "PM10", value: round1(sample.pm10), unit: "µg/m³", limit: 100 },
    { code: "no2", label: "NO₂", value: round1(sample.no2), unit: "µg/m³", limit: 80 },
    { code: "so2", label: "SO₂", value: round1(sample.so2), unit: "µg/m³", limit: 80 },
    { code: "o3", label: "O₃", value: round1(sample.o3), unit: "µg/m³", limit: 100 },
    { code: "co", label: "CO", value: round1(coMg), unit: "mg/m³", limit: 4 },
  ];

  return {
    aqi: Math.min(500, Math.max(0, top.index)),
    dominant: top.label,
    pollutants,
  };
}

function round1(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

export function weatherConditionFromCode(code: number, aqi: number): string {
  if (aqi >= 150) return "Smoky haze";
  if (aqi >= 100) return "Hazy";
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Mixed conditions";
}

export const AIR_QUALITY: AirQuality[] = AQI_PLACES.slice(0, 12).map((p) => ({
  slug: slugify(p.area),
  area: p.area,
  city: p.city,
  aqi: 0,
  station: `${p.area} · live lookup`,
  updated: "Waiting for live data…",
  pollutants: [],
  trend: [],
  source: "benchmark",
}));

export function getAirQuality(query?: string): AirQuality {
  const place = resolveAqiPlace(query) ?? AQI_PLACES[0]!;
  return {
    slug: slugify(place.area),
    area: place.area,
    city: place.city,
    aqi: 0,
    station: "Live feed unavailable",
    updated: "Offline",
    pollutants: [],
    trend: [],
    source: "benchmark",
  };
}
