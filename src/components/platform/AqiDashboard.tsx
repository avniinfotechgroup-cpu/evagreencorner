import { useEffect, useMemo, useRef, useState } from "react";
import {
  CloudSun,
  Crosshair,
  Droplets,
  Heart,
  MapPin,
  Search,
  Share2,
  Sun,
  Wind,
} from "lucide-react";
import {
  usAqiBarPercent,
  usAqiCategory,
  type AirQuality,
  type AqiMapPin,
  type AqiWeather,
} from "@/data/aqi";
import { searchIndiaLocations, type IndiaLocation } from "@/data/indiaLocations";
import { AqiMap } from "./AqiMap";
import { AqiAtmosphere } from "./AqiAtmosphere";
import { BannerMenu } from "./BannerMenu";
import { IconicLoader } from "./IconicLoader";

type Tab = "aqi" | "weather";

interface Props {
  data: AirQuality | null;
  weather: AqiWeather | null;
  nearby: AqiMapPin[];
  loading: boolean;
  error: string | null;
  warning: string | null;
  query: string;
  onQueryChange: (v: string) => void;
  onSearch: (q: string, opts?: { lat: number; lng: number }) => void;
  onLocate: () => void;
  locating?: boolean;
  popular: Array<{ area: string; city: string; lat?: number; lng?: number }>;
}

function AqiScaleBar({ aqi }: { aqi: number }) {
  const pct = usAqiBarPercent(aqi);
  const labels = [
    { n: "0", t: "Good" },
    { n: "50", t: "Moderate" },
    { n: "100", t: "Poor" },
    { n: "150", t: "Unhealthy" },
    { n: "200", t: "Severe" },
    { n: "301+", t: "Hazardous" },
  ];

  return (
    <div className="relative mt-5 max-w-md">
      <div
        className="h-2.5 w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg,#22c55e 0%,#eab308 18%,#f97316 36%,#f43f5e 55%,#d946ef 75%,#7f1d1d 100%)",
        }}
      />
      <div
        className="absolute -top-1.5 size-0 border-x-[6px] border-b-[8px] border-x-transparent border-b-white drop-shadow"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
      <div className="mt-2 flex justify-between text-[10px] text-white/55">
        {labels.map((l) => (
          <span key={l.n} className="text-center leading-tight">
            <span className="block font-semibold text-white/80">{l.n}</span>
            {l.t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AqiDashboard({
  data,
  weather,
  nearby,
  loading,
  error,
  warning,
  query,
  onQueryChange,
  onSearch,
  onLocate,
  locating,
  popular,
}: Props) {
  const [tab, setTab] = useState<Tab>("aqi");
  const [liked, setLiked] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const searchWrapRef = useRef<HTMLFormElement | null>(null);

  const cat = useMemo(() => usAqiCategory(data?.aqi ?? 0), [data?.aqi]);
  const accent = data?.accent || cat.accent;
  const pm25 = data?.pollutants.find((p) => p.code === "pm25");
  const pm10 = data?.pollutants.find((p) => p.code === "pm10");
  const lat = data?.lat ?? 28.6139;
  const lng = data?.lng ?? 77.209;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as IndiaLocation[];

    const fromIndia = searchIndiaLocations(query, 10);
    const fromPopular = popular
      .filter(
        (p) =>
          p.area.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          q.includes(p.area.toLowerCase()),
      )
      .slice(0, 4)
      .map(
        (p) =>
          ({
            id: `aqi-${p.area}`,
            name: p.area,
            state: p.city,
            stateCode: "",
            country: "India",
            lat: p.lat ?? 0,
            lng: p.lng ?? 0,
            label: `${p.area}, ${p.city}, India`,
            aliases: [],
            kind: "city" as const,
            priority: 90,
          }) satisfies IndiaLocation,
      );

    const seen = new Set<string>();
    const merged: IndiaLocation[] = [];
    for (const loc of [...fromPopular, ...fromIndia]) {
      const key = loc.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(loc);
      if (merged.length >= 12) break;
    }
    return merged;
  }, [query, popular]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickLocation = (loc: IndiaLocation) => {
    onQueryChange(loc.name);
    setSuggestOpen(false);
    if (loc.lat && loc.lng) {
      onSearch(loc.name, { lat: loc.lat, lng: loc.lng });
    } else {
      onSearch(loc.name);
    }
  };

  const share = async () => {
    const text = `${data?.station ?? "Air quality"} — AQI ${data?.aqi ?? "—"} (${data?.statusLabel ?? cat.label})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Air Quality", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#070b14]">
      {/* Full-bleed map behind UI — no dark veil */}
      <div className="absolute inset-0 z-0 h-full min-h-[calc(100vh-4rem)] w-full">
        <AqiMap
          lat={lat}
          lng={lng}
          pins={
            nearby.length
              ? nearby
              : data
                ? [{ id: "c", label: data.area, lat, lng, aqi: data.aqi }]
                : []
          }
          onSelectPin={(pin) => onSearch(pin.label)}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:py-10">
        <div className="pointer-events-auto w-full">
          <BannerMenu compact />
        </div>

        {/* Only search row is narrower — city autocomplete */}
        <form
          ref={searchWrapRef}
          className="pointer-events-auto relative z-20 flex w-full max-w-md flex-wrap items-center gap-2 sm:max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            const hit = suggestions[highlight] ?? suggestions[0];
            if (suggestOpen && hit) {
              pickLocation(hit);
              return;
            }
            onSearch(query.trim() || "New Delhi");
            setSuggestOpen(false);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
            <input
              value={query}
              onChange={(e) => {
                onQueryChange(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (!suggestOpen || suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Escape") {
                  setSuggestOpen(false);
                }
              }}
              placeholder="Search city or area…"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestOpen && suggestions.length > 0}
              aria-autocomplete="list"
              className="w-full rounded-2xl border border-white/15 bg-black/55 py-3 pl-10 pr-3 text-sm text-white outline-none backdrop-blur-md placeholder:text-white/40 focus:border-white/35"
            />

            {suggestOpen && query.trim().length >= 2 ? (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+6px)] max-h-72 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-lift backdrop-blur-md"
              >
                {suggestions.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-white/50">
                    No matching city. Try Delhi, Mumbai, Bengaluru…
                  </p>
                ) : (
                  suggestions.map((loc, i) => (
                    <button
                      key={loc.id}
                      type="button"
                      role="option"
                      aria-selected={i === highlight}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pickLocation(loc)}
                      className={
                        "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors " +
                        (i === highlight
                          ? "bg-white/15 text-white"
                          : "text-white/80 hover:bg-white/10")
                      }
                    >
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-300" />
                      <span>
                        <span className="block font-semibold">{loc.name}</span>
                        <span className="block text-xs text-white/45">{loc.label}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
          >
            Check AQI
          </button>
        </form>

        <div className="pointer-events-auto flex w-full flex-wrap gap-2">
          {popular.slice(0, 8).map((p) => (
            <button
              key={`${p.city}-${p.area}`}
              type="button"
              onClick={() => {
                onQueryChange(p.area);
                if (p.lat != null && p.lng != null) {
                  onSearch(p.area, { lat: p.lat, lng: p.lng });
                } else {
                  onSearch(p.area);
                }
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors ${
                data?.area === p.area
                  ? "border-white/40 bg-white/20 text-white"
                  : "border-white/15 bg-black/40 text-white/70 hover:bg-white/10"
              }`}
            >
              {p.area}
            </button>
          ))}
        </div>

        <div
          className="pointer-events-auto relative w-full overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl"
          style={{
            background: `linear-gradient(145deg, rgba(24,24,27,0.82), rgba(24,24,27,0.68) 50%, ${accent}14)`,
          }}
        >
          <AqiAtmosphere aqi={data?.aqi ?? 0} />

          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="inline-flex rounded-full border border-white/10 bg-black/35 p-1">
                <button
                  type="button"
                  onClick={() => setTab("aqi")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    tab === "aqi" ? "bg-white/15 text-white" : "text-white/60"
                  }`}
                >
                  <Wind className="size-3.5" /> AQI
                </button>
                <button
                  type="button"
                  onClick={() => setTab("weather")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    tab === "weather" ? "bg-white/15 text-white" : "text-white/60"
                  }`}
                >
                  <Sun className="size-3.5" /> Weather
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLocate}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 disabled:opacity-60"
                >
                  {locating ? <IconicLoader size="sm" /> : <Crosshair className="size-3.5" />}
                  Locate me
                </button>
                <button
                  type="button"
                  onClick={() => setLiked((v) => !v)}
                  className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 hover:bg-white/10"
                  aria-label="Favourite"
                >
                  <Heart className={`size-4 ${liked ? "fill-rose-400 text-rose-400" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 hover:bg-white/10"
                  aria-label="Share"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Real-time Air Quality Index (AQI)
            </h1>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-sky-300">
              <MapPin className="size-3.5" />
              {data?.station ?? "Searching…"}
            </p>
            <p className="mt-1 text-xs italic text-white/50">
              {data?.updated ?? "Fetching latest reading…"}
            </p>

            {warning ? (
              <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {warning}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}

            {loading && !data ? (
              <div className="mt-10 flex justify-center py-16">
                <IconicLoader size="lg" label="Fetching live air quality…" />
              </div>
            ) : null}

            {data && tab === "aqi" ? (
              <div className="relative z-[1] mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                    </span>
                    Live AQI
                  </p>

                  <div className="mt-2 flex flex-wrap items-end gap-5">
                    <div>
                      <p
                        className="font-display text-6xl font-bold leading-none sm:text-7xl"
                        style={{ color: accent }}
                      >
                        {data.aqi}
                      </p>
                      <p className="mt-1 text-sm text-white/60">AQI (US)</p>
                    </div>

                    <div
                      className="rounded-2xl border px-4 py-3 backdrop-blur-md"
                      style={{
                        borderColor: `${accent}66`,
                        background: `${accent}22`,
                      }}
                    >
                      <p className="text-xs text-white/70">Air Quality is</p>
                      <p className="font-display text-2xl font-bold" style={{ color: accent }}>
                        {data.statusLabel ?? cat.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid max-w-sm grid-cols-2 gap-3 text-sm text-white/85">
                    <p>
                      PM2.5 :{" "}
                      <span className="font-semibold text-white">
                        {pm25?.value ?? "—"} µg/m³
                      </span>
                    </p>
                    <p>
                      PM10 :{" "}
                      <span className="font-semibold text-white">
                        {pm10?.value ?? "—"} µg/m³
                      </span>
                    </p>
                  </div>

                  {data.indiaAqi != null ? (
                    <p className="mt-3 text-xs text-white/45">
                      Indian National AQI (CPCB): {data.indiaAqi}
                      {data.dominant ? ` · dominant ${data.dominant}` : ""}
                    </p>
                  ) : null}

                  <AqiScaleBar aqi={data.aqi} />
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-4xl font-bold text-white">
                        {weather?.tempC ?? "—"} °C
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {weather?.condition ?? "—"}
                      </p>
                    </div>
                    <CloudSun className="size-10 text-white/80" />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
                    <div>
                      <Droplets className="mx-auto size-4 text-sky-300" />
                      <p className="mt-1.5 text-sm font-semibold text-white">
                        {weather?.humidity ?? "—"}%
                      </p>
                      <p className="text-[10px] text-white/50">Humidity</p>
                    </div>
                    <div>
                      <Wind className="mx-auto size-4 text-sky-300" />
                      <p className="mt-1.5 text-sm font-semibold text-white">
                        {weather?.windKmh ?? "—"} km/h
                      </p>
                      <p className="text-[10px] text-white/50">Wind</p>
                    </div>
                    <div>
                      <Sun className="mx-auto size-4 text-amber-300" />
                      <p className="mt-1.5 text-sm font-semibold text-white">
                        {weather?.uvIndex ?? "—"}
                      </p>
                      <p className="text-[10px] text-white/50">UV Index</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-white/45">
                    {data.statusAdvice ?? cat.advice}
                  </p>
                </div>
              </div>
            ) : null}

            {data && tab === "weather" && weather ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-black/35 p-6 backdrop-blur-md">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-5xl font-bold text-white">{weather.tempC} °C</p>
                    <p className="mt-2 text-lg text-white/80">{weather.condition}</p>
                  </div>
                  <CloudSun className="size-14 text-white/75" />
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Humidity", value: `${weather.humidity}%`, icon: Droplets },
                    { label: "Wind speed", value: `${weather.windKmh} km/h`, icon: Wind },
                    { label: "UV index", value: String(weather.uvIndex), icon: Sun },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <m.icon className="size-4 text-sky-300" />
                      <p className="mt-2 font-display text-xl font-bold text-white">{m.value}</p>
                      <p className="text-xs text-white/50">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {loading && data ? (
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/55">
                <IconicLoader size="sm" /> Refreshing…
              </p>
            ) : null}
          </div>
        </div>

        <p className="pointer-events-auto max-w-3xl text-[11px] text-white/40">
          Map markers show nearby US AQI estimates. Live data: Open-Meteo CAMS + weather. Not an
          official CPCB bulletin — ground stations may differ.
        </p>
      </div>
    </div>
  );
}
