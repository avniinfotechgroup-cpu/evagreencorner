import { useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Clock,
  Crosshair,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { STATIONS, type ChargingStation } from "@/data/stations";
import { getAirQuality } from "@/data/aqi";
import { siteConfig } from "@/config/platform";
import { StationMap } from "./StationMap";
import { AqiPanel } from "./AqiPanel";

const QUICK_FILTERS = ["All", "Fast DC", "CCS2", "Type 2", "Open 24×7", "Available now"] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];

function matchesFilter(station: ChargingStation, filter: QuickFilter) {
  switch (filter) {
    case "Fast DC":
      return station.maxPowerKw >= 50;
    case "CCS2":
      return station.connectors.includes("CCS2");
    case "Type 2":
      return station.connectors.includes("Type 2");
    case "Open 24×7":
      return station.open24;
    case "Available now":
      return station.available > 0;
    default:
      return true;
  }
}

export function StationFinder() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(siteConfig.defaultCity);
  const [filter, setFilter] = useState<QuickFilter>("All");
  const [locating, setLocating] = useState(false);
  const [activeId, setActiveId] = useState<string>(STATIONS[0]!.id);

  const results = useMemo(() => {
    const q = submitted.trim().toLowerCase();
    return STATIONS.filter((s) => matchesFilter(s, filter))
      .filter(
        (s) =>
          !q ||
          s.city.toLowerCase().includes(q) ||
          s.area.toLowerCase().includes(q) ||
          s.pincode.includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.operator.toLowerCase().includes(q),
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [submitted, filter]);

  const activeStation = results.find((s) => s.id === activeId) ?? results[0];

  const useCurrentLocation = () => {
    setLocating(true);
    window.setTimeout(() => {
      setQuery(siteConfig.defaultCity);
      setSubmitted(siteConfig.defaultCity);
      setLocating(false);
    }, 700);
  };

  return (
    <>
      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="rounded-3xl border border-border/60 bg-card/95 p-2 shadow-lift backdrop-blur"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter pincode, area, city or landmark"
              aria-label="Search charging stations by pincode, area or location"
              className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 px-2 pb-2 md:px-0 md:pb-0">
            <button
              type="button"
              onClick={useCurrentLocation}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent md:flex-none"
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Crosshair className="size-4 text-leaf" />
              )}
              Current location
            </button>
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 md:flex-none"
            >
              <Zap className="size-4" />
              Find chargers
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (filter === f
                ? "border-transparent bg-volt-gradient text-volt-foreground"
                : "border-border bg-card/70 text-muted-foreground hover:text-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results + map */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-baseline justify-between px-1 pb-3">
            <h2 className="font-display text-base font-bold">
              {results.length} stations near{" "}
              <span className="text-primary">{submitted.trim() || siteConfig.defaultCity}</span>
            </h2>
            <span className="text-xs text-muted-foreground">Sorted by distance</span>
          </div>

          <ul className="max-h-[30rem] space-y-2.5 overflow-y-auto pr-1">
            {results.map((s) => (
              <li key={s.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveId(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && setActiveId(s.id)}
                  className={
                    "w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors " +
                    (activeId === s.id
                      ? "border-primary/50 bg-accent/60"
                      : "border-border bg-background hover:bg-surface")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.operator} · {s.address} · {s.pincode}
                      </p>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                        (s.available > 0
                          ? "bg-volt-gradient text-volt-foreground"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {s.available > 0 ? `${s.available}/${s.total} free` : "Busy"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Navigation className="size-3.5 text-leaf" />
                      {s.distanceKm} km
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BatteryCharging className="size-3.5 text-leaf" />
                      {s.maxPowerKw} kW
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IndianRupee className="size-3.5 text-leaf" />
                      {s.pricePerKwh}/kWh
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5 text-leaf" />
                      {s.open24 ? "24×7" : "6am–11pm"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 text-amber" />
                      {s.rating}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.connectors.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <Link
                    to="/stations/$stationId"
                    params={{ stationId: s.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground hover:bg-accent"
                  >
                    View details
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </li>
            ))}

            {results.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-8 text-center">
                <MapPin className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No stations match this search</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try another pincode or clear the filters.
                </p>
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-5">
          <StationMap stations={results} activeId={activeId} onSelect={setActiveId} />
          <AqiPanel data={getAirQuality(activeStation?.area ?? submitted)} compact />
        </div>
      </div>
    </>
  );
}
