import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BatteryCharging,
  Clock,
  IndianRupee,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Star,
} from "lucide-react";
import { POPULAR_AREAS, STATIONS } from "@/data/stations";
import { getAirQuality, slugify, aqiCategory } from "@/data/aqi";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { StationMap } from "@/components/platform/StationMap";
import { AqiPanel } from "@/components/platform/AqiPanel";

export const Route = createFileRoute("/locations/$slug")({
  loader: ({ params }) => {
    const area = POPULAR_AREAS.find((a) => slugify(a.name) === params.slug);
    if (!area) throw notFound();
    return { area };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Location unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const a = loaderData.area;
    const title = `EV charging stations in ${a.name}, ${a.city} (${a.pincode}) — live AQI`;
    const description = `${a.stations} EV charging points in ${a.name}, ${a.city}. Compare connectors, tariffs and live availability, see the ${a.name} air quality index and map of nearby chargers.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/locations/${slugify(a.name)}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `How many EV charging stations are there in ${a.name}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${a.name} in ${a.city} has ${a.stations} mapped public EV charging points, including AC Type 2 and DC fast CCS2 chargers.`,
                },
              },
              {
                "@type": "Question",
                name: `What is the air quality in ${a.name} today?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `The current air quality index in ${a.name} is around ${a.aqi} on the CPCB national AQI scale.`,
                },
              },
            ],
          }),
        },
      ],
    };
  },
  component: LocationPage,
  notFoundComponent: LocationNotFound,
});

function LocationPage() {
  const { area } = Route.useLoaderData();
  const air = getAirQuality(area.name);
  const cat = aqiCategory(air.aqi);
  const stations = STATIONS.filter(
    (s) => s.area === area.name || s.pincode === area.pincode,
  );
  const listed = stations.length > 0 ? stations : STATIONS.slice(0, 3);
  const cheapest = listed.reduce((a, b) => (a.pricePerKwh <= b.pricePerKwh ? a : b));
  const fastest = listed.reduce((a, b) => (a.maxPowerKw >= b.maxPowerKw ? a : b));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-border bg-canopy">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <nav className="text-xs text-primary-foreground/70">
              <Link to="/" className="hover:text-primary-foreground">
                Home
              </Link>{" "}
              /{" "}
              <Link to="/locations" className="hover:text-primary-foreground">
                Locations
              </Link>{" "}
              / <span className="text-primary-foreground">{area.name}</span>
            </nav>
            <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              EV charging stations in {area.name}, {area.city}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-primary-foreground/80">
              {area.stations} public charging points mapped around {area.name} ({area.pincode}).
              Compare tariffs from ₹{cheapest.pricePerKwh}/kWh, DC fast charging up to{" "}
              {fastest.maxPowerKw} kW, and check today's air quality — currently{" "}
              <strong className="font-semibold text-primary-foreground">
                AQI {air.aqi} ({cat.label})
              </strong>
              .
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="rounded-xl bg-volt-gradient px-5 py-3 text-sm font-semibold text-volt-foreground"
              >
                Search live availability
              </Link>
              <Link
                to="/route-planner"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
              >
                <RouteIcon className="size-4" />
                Plan a route from {area.name}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <h2 className="font-display text-2xl font-bold">
                Charging stations near {area.name}
              </h2>
              <ul className="mt-5 space-y-3">
                {listed.map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/stations/$stationId"
                      params={{ stationId: s.id }}
                      className="block rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-base font-bold">{s.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {s.operator} · {s.address} · {s.pincode}
                          </p>
                        </div>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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
                          <Navigation className="size-3.5 text-leaf" />
                          {s.distanceKm} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 text-amber" />
                          {s.rating}
                        </span>
                        <span className="text-foreground">{s.connectors.join(" · ")}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">
                  Charging in {area.name}: what to know
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {area.name} is one of the most searched charging neighbourhoods in {area.city},
                  with roughly {area.searches} searches a month on {siteConfig.name}. Most public
                  points are CCS2 DC fast chargers at malls and tech parks, with AC Type 2 units in
                  residential blocks. Off-peak windows after 11pm are typically 15% cheaper.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Cheapest tariff", value: `₹${cheapest.pricePerKwh}/kWh`, sub: cheapest.name },
                    { label: "Fastest charger", value: `${fastest.maxPowerKw} kW`, sub: fastest.name },
                    { label: "Air quality now", value: `AQI ${air.aqi}`, sub: cat.label },
                  ].map((c) => (
                    <div key={c.label} className="rounded-2xl border border-border bg-surface p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {c.label}
                      </p>
                      <p className="mt-1.5 font-display text-lg font-bold">{c.value}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <StationMap stations={listed} activeId={listed[0]!.id} onSelect={() => {}} />
              <AqiPanel data={air} />
            </aside>
          </div>

          {/* Nearby areas */}
          <div className="mt-14">
            <h2 className="font-display text-xl font-bold">Other areas in {area.city}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {POPULAR_AREAS.filter((a) => a.name !== area.name).map((a) => (
                <Link
                  key={a.name}
                  to="/locations/$slug"
                  params={{ slug: slugify(a.name) }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-surface"
                >
                  <MapPin className="size-3.5 text-leaf" />
                  EV charging in {a.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function LocationNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Location not covered yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We don't have a landing page for this area yet.
        </p>
        <Link
          to="/locations"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse all locations
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
