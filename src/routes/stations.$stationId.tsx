import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  BatteryCharging,
  Clock,
  IndianRupee,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { STATIONS } from "@/data/stations";
import { getAirQuality } from "@/data/aqi";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { StationMap } from "@/components/platform/StationMap";
import { AqiPanel } from "@/components/platform/AqiPanel";

export const Route = createFileRoute("/stations/$stationId")({
  loader: ({ params }) => {
    const station = STATIONS.find((s) => s.id === params.stationId);
    if (!station) throw notFound();
    return { station };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Station unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const s = loaderData.station;
    const title = `${s.name}, ${s.area} — EV charging station | ${siteConfig.name}`;
    const description = `${s.operator} charging point at ${s.address}, ${s.city} ${s.pincode}. ${s.connectors.join(", ")} up to ${s.maxPowerKw} kW at ₹${s.pricePerKwh}/kWh. Live availability and hours.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EVChargingStation",
            name: s.name,
            address: {
              "@type": "PostalAddress",
              streetAddress: s.address,
              addressLocality: s.city,
              postalCode: s.pincode,
              addressCountry: "IN",
            },
            openingHours: s.open24 ? "Mo-Su 00:00-23:59" : "Mo-Su 06:00-23:00",
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: s.rating,
              ratingCount: 128,
            },
          }),
        },
      ],
    };
  },
  component: StationDetail,
  notFoundComponent: StationNotFound,
});

const PRICING_ROWS = [
  { window: "Off-peak · 11pm – 7am", multiplier: 0.85 },
  { window: "Standard · 7am – 6pm", multiplier: 1 },
  { window: "Peak · 6pm – 11pm", multiplier: 1.18 },
];

const HOURS_24 = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function StationDetail() {
  const { station } = Route.useLoaderData();
  const air = getAirQuality(station.area);
  const busy = station.available === 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to search
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {station.operator}
                  </span>
                  <h1 className="mt-1 font-display text-3xl font-bold">{station.name}</h1>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4 text-leaf" />
                    {station.address}, {station.city} {station.pincode}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-semibold " +
                    (busy
                      ? "bg-muted text-muted-foreground"
                      : "bg-volt-gradient text-volt-foreground")
                  }
                >
                  {busy ? "All bays busy" : `${station.available} of ${station.total} free`}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
                {[
                  { icon: BatteryCharging, label: "Max power", value: `${station.maxPowerKw} kW` },
                  { icon: IndianRupee, label: "Tariff", value: `₹${station.pricePerKwh}/kWh` },
                  { icon: Navigation, label: "Distance", value: `${station.distanceKm} km` },
                  { icon: Star, label: "Rating", value: `${station.rating} / 5` },
                ].map((m) => (
                  <div key={m.label} className="bg-card px-4 py-4">
                    <m.icon className="size-4 text-leaf" />
                    <p className="mt-2 font-display text-lg font-bold">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${station.name} ${station.address} ${station.city}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <Navigation className="size-4" />
                  Get directions
                </a>
                <a
                  href={`tel:${siteConfig.supportEmail ? "+911800000000" : ""}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-surface"
                >
                  <Phone className="size-4 text-leaf" />
                  Contact operator
                </a>
              </div>
            </div>

            {/* Connectors */}
            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Connectors & availability</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {station.connectors.map((c: string, i: number) => {
                  const bays = Math.max(1, Math.round(station.total / station.connectors.length));
                  const free = Math.min(station.available, i === 0 ? station.available : Math.max(0, station.available - 1));
                  const dc = c === "CCS2" || c === "CHAdeMO" || c === "GB/T";
                  return (
                    <div key={c} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-sm font-bold">{c}</p>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          {dc ? "DC fast" : "AC"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {bays} bay{bays > 1 ? "s" : ""} · up to{" "}
                        {dc ? station.maxPowerKw : Math.min(22, station.maxPowerKw)} kW
                      </p>
                      <div className="mt-3 flex items-center gap-1.5">
                        {Array.from({ length: bays }).map((_, b) => (
                          <span
                            key={b}
                            className={
                              "h-2 flex-1 rounded-full " + (b < free ? "bg-leaf" : "bg-muted")
                            }
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                        {free > 0 ? `${free} available now` : "Occupied — avg wait 12 min"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Pricing */}
            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Pricing</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Energy billed per kWh. Parking free for the first 60 minutes while charging.
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Time window</th>
                      <th className="px-4 py-3 font-semibold">Rate</th>
                      <th className="px-4 py-3 font-semibold">30 kWh top-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_ROWS.map((r) => {
                      const rate = Math.round(station.pricePerKwh * r.multiplier * 10) / 10;
                      return (
                        <tr key={r.window} className="border-t border-border">
                          <td className="px-4 py-3">{r.window}</td>
                          <td className="px-4 py-3 font-semibold">₹{rate}/kWh</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            ≈ ₹{Math.round(rate * 30)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-border bg-surface">
                      <td className="px-4 py-3">Idle fee after charging</td>
                      <td className="px-4 py-3 font-semibold">₹2/min</td>
                      <td className="px-4 py-3 text-muted-foreground">After 15 min grace</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Hours */}
            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Clock className="size-4 text-leaf" />
                Opening hours
              </h2>
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {HOURS_24.map((d) => (
                  <li key={d} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{d}</span>
                    <span className="font-semibold">
                      {station.open24 ? "Open 24 hours" : "6:00 am – 11:00 pm"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-leaf" />
                Verified operator · CCTV monitored · attended bays
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StationMap stations={[station]} activeId={station.id} onSelect={() => {}} />
            <AqiPanel data={air} />
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-base font-bold">Heading further?</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Plan charge stops for a longer drive with cost and time estimates.
              </p>
              <Link
                to="/route-planner"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-volt-gradient px-4 py-2.5 text-sm font-semibold text-volt-foreground"
              >
                <Zap className="size-4" />
                Open route planner
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function StationNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Station not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This charging point may have been removed or renamed.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Search stations
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
