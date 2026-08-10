import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Gauge, Leaf, PlugZap } from "lucide-react";
import heroImage from "@/assets/hero-charging.jpg";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { StationFinder } from "@/components/platform/StationFinder";
import { PopularAreas } from "@/components/platform/PopularAreas";
import { ModuleGrid } from "@/components/platform/ModuleGrid";

const TITLE = `${siteConfig.name} — Find EV charging stations near you`;
const DESCRIPTION =
  "Search EV charging stations by pincode, area or current location. Live availability, tariffs and connectors, plus air quality, solar and carbon tools.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

const STATS = [
  { icon: PlugZap, value: "12,480+", label: "Charging points mapped" },
  { icon: Gauge, value: "Live", label: "Availability & tariffs" },
  { icon: Leaf, value: "9", label: "Environmental tools" },
  { icon: BadgeCheck, value: "1,200+", label: "Verified green partners" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="Electric vehicle charging under a solar canopy surrounded by trees"
            width={1600}
            height={1000}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-canopy opacity-[0.88]" />

          <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur">
              <Leaf className="size-3.5" />
              {siteConfig.tagline}
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.08] text-primary-foreground sm:text-5xl md:text-6xl">
              Find an EV charging station near you
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-primary-foreground/80">
              Enter a pincode, area or landmark — or use your current location — to see live
              availability, connector types and tariffs on the map.
            </p>
          </div>

          <div className="relative mx-auto max-w-6xl px-5 pb-16">
            <StationFinder />
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card px-6 py-8">
                <s.icon className="size-5 text-leaf" />
                <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <PopularAreas />
        <ModuleGrid />

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-canopy px-8 py-14 text-center">
            <div className="absolute inset-0 grid-lines opacity-20" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-bold text-primary-foreground">
                Know your footprint before your next drive
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80">
                Combine charging data with carbon, water and solar calculators to see the real
                impact of every kilometre.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a
                  href="/carbon-calculator"
                  className="rounded-xl bg-volt-gradient px-6 py-3 text-sm font-semibold text-volt-foreground"
                >
                  Calculate my footprint
                </a>
                <a
                  href="/route-planner"
                  className="rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Plan an EV route
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
