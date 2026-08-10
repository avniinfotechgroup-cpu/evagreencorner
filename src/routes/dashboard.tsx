import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BatteryCharging,
  Bookmark,
  IndianRupee,
  MapPin,
  Route as RouteIcon,
  Sun,
  Trash2,
  Zap,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { SaveStationButton } from "@/components/platform/SaveStationButton";
import { STATIONS } from "@/data/stations";
import { VEHICLES } from "@/data/routePlanner";
import { getAirQuality, aqiCategory } from "@/data/aqi";
import { removeRoute, useSaved } from "@/lib/savedItems";

const TITLE = `My dashboard — saved stations & routes | ${siteConfig.name}`;
const DESCRIPTION =
  "Your personalised EV dashboard: favourite charging stations with live availability, saved route searches and air quality for the places you charge.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const saved = useSaved();
  const stations = saved.stations
    .map((id) => STATIONS.find((s) => s.id === id))
    .filter((s): s is (typeof STATIONS)[number] => Boolean(s));

  const empty = stations.length === 0 && saved.routes.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-border bg-canopy">
          <div className="mx-auto max-w-7xl px-5 py-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90">
              <Bookmark className="size-3.5" />
              Personal dashboard
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-primary-foreground">
              Your saved charging &amp; trips
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/75">
              Favourites and route searches are kept on this device for instant access —
              no account needed.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-10">
          {empty ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <Bookmark className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-4 font-display text-xl font-bold">Nothing saved yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Save a charging station from its detail page, or plan a trip and save the
                search to see it here.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/"
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Find stations
                </Link>
                <Link
                  to="/route-planner"
                  className="rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-surface"
                >
                  Plan a route
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section>
                <h2 className="font-display text-lg font-bold">
                  Favourite stations{" "}
                  <span className="text-muted-foreground">({stations.length})</span>
                </h2>
                <div className="mt-4 space-y-3">
                  {stations.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No favourite stations yet.
                    </p>
                  )}
                  {stations.map((s) => {
                    const air = getAirQuality(s.area);
                    const cat = aqiCategory(air.aqi);
                    return (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              to="/stations/$stationId"
                              params={{ stationId: s.id }}
                              className="font-display text-base font-bold hover:underline"
                            >
                              {s.name}
                            </Link>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="size-3.5 text-leaf" />
                              {s.area}, {s.city} · {s.operator}
                            </p>
                          </div>
                          <SaveStationButton stationId={s.id} name={s.name} compact />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
                            <BatteryCharging className="size-3" />
                            {s.maxPowerKw} kW
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
                            <IndianRupee className="size-3" />
                            {s.pricePerKwh}/kWh
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
                            {s.connectors.join(" · ")}
                          </span>
                          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
                            AQI {air.aqi} · {cat.label}
                          </span>
                          <span
                            className={
                              "ml-auto rounded-lg px-2.5 py-1 " +
                              (s.available > 0
                                ? "bg-volt-gradient text-volt-foreground"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            {s.available > 0 ? `${s.available} bays free` : "Busy"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="font-display text-lg font-bold">
                  Saved route searches{" "}
                  <span className="text-muted-foreground">({saved.routes.length})</span>
                </h2>
                <div className="mt-4 space-y-3">
                  {saved.routes.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No saved trips yet.
                    </p>
                  )}
                  {saved.routes.map((r) => {
                    const vehicle = VEHICLES.find((v) => v.id === r.vehicleId);
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="inline-flex items-center gap-2 font-display text-base font-bold">
                              <RouteIcon className="size-4 text-leaf" />
                              {r.from} → {r.to}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {vehicle?.name ?? "EV"} · starting at {r.startSoc}% charge
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoute(r.id)}
                            aria-label="Remove saved route"
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-surface"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <Link
                          to="/route-planner"
                          search={{
                            from: r.from,
                            to: r.to,
                            vehicle: r.vehicleId,
                            soc: r.startSoc,
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-volt-gradient px-4 py-2.5 text-sm font-semibold text-volt-foreground"
                        >
                          <Zap className="size-4" />
                          Re-run plan
                        </Link>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
                    <Sun className="size-4 text-leaf" />
                    Going further green?
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Charge at home from your own roof — size a system and see payback.
                  </p>
                  <Link
                    to="/solar-calculator"
                    className="mt-4 inline-block rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface"
                  >
                    Open solar calculator
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
