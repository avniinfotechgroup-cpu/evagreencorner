import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Wind } from "lucide-react";
import { POPULAR_AREAS } from "@/data/stations";
import { slugify, aqiCategory } from "@/data/aqi";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";

const TITLE = `EV charging & air quality by location in ${siteConfig.defaultCity} | ${siteConfig.name}`;
const DESCRIPTION =
  "Browse area guides with EV charging station listings, live AQI summaries and maps for every popular neighbourhood.";

export const Route = createFileRoute("/locations/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocationsIndex,
});

function LocationsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-14">
        <h1 className="font-display text-4xl font-bold">Location guides</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Every area page lists nearby charging stations with tariffs and connectors, a live air
          quality summary and a map of the neighbourhood.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_AREAS.map((a) => {
            const cat = aqiCategory(a.aqi);
            return (
              <Link
                key={a.name}
                to="/locations/$slug"
                params={{ slug: slugify(a.name) }}
                className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="inline-flex items-center gap-1.5 font-display text-base font-bold">
                      <MapPin className="size-4 text-leaf" />
                      {a.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.city} · {a.pincode} · {a.stations} stations
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <span
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cat.cls}`}
                >
                  <Wind className="size-3" />
                  AQI {a.aqi} · {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
