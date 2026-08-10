import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { POPULAR_AREAS } from "@/data/stations";
import { slugify } from "@/data/aqi";

function aqiTone(aqi: number) {
  if (aqi <= 60) return { label: "Good", cls: "bg-volt-gradient text-volt-foreground" };
  if (aqi <= 85) return { label: "Moderate", cls: "bg-amber/25 text-foreground" };
  return { label: "Poor", cls: "bg-destructive/15 text-destructive" };
}

export function PopularAreas() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="size-3.5 text-leaf" />
            Most searched
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold">Popular areas near you</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Neighbourhoods drivers check most this week — each opens a location page with charger
            density, live air quality and nearby green services.
          </p>
        </div>
        <Link
          to="/locations"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-surface"
        >
          Browse all locations
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {POPULAR_AREAS.map((area) => {
          const tone = aqiTone(area.aqi);
          return (
            <Link
              key={area.name}
              to="/locations/$slug"
              params={{ slug: slugify(area.name) }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold">{area.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {area.city} · {area.pincode}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="font-display text-2xl font-bold text-primary">{area.stations}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    stations
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.cls}`}
                  >
                    AQI {area.aqi} · {tone.label}
                  </span>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {area.searches} searches
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
