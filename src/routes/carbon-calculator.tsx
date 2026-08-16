import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Footprints, Leaf, Trees } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import {
  COMMUTE_OPTIONS,
  DIET_OPTIONS,
  estimateCarbon,
  type CommuteMode,
  type DietType,
} from "@/data/carbon";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Carbon Footprint Calculator — household & travel | ${siteConfig.name}`;
const DESCRIPTION =
  "Estimate annual CO₂e from electricity, diet, commute, flights and LPG — compare with a typical Indian household and see trees needed to offset.";

export const Route = createFileRoute("/carbon-calculator")({
  loader: () => loadPageSeo("/carbon-calculator"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/carbon-calculator",
    }),
  component: CarbonCalculatorPage,
});

function CarbonCalculatorPage() {
  const [householdSize, setHouseholdSize] = useState(3);
  const [monthlyElectricityKwh, setKwh] = useState(280);
  const [diet, setDiet] = useState<DietType>("veg");
  const [commuteKmPerDay, setCommuteKm] = useState(25);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>("ev");
  const [flightsHoursPerYear, setFlights] = useState(4);
  const [lpgCylindersPerYear, setLpg] = useState(8);

  const result = useMemo(
    () =>
      estimateCarbon({
        householdSize,
        monthlyElectricityKwh,
        diet,
        commuteKmPerDay,
        commuteMode,
        flightsHoursPerYear,
        lpgCylindersPerYear,
      }),
    [
      householdSize,
      monthlyElectricityKwh,
      diet,
      commuteKmPerDay,
      commuteMode,
      flightsHoursPerYear,
      lpgCylindersPerYear,
    ],
  );

  const maxSlice = Math.max(...result.breakdown.map((b) => b.kgCo2ePerYear), 1);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-7xl px-5 pb-14 pt-8">
            <BannerMenu />
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90">
              <Footprints className="size-3.5" />
              Calculator · CO₂e / year
            </span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              What is your household carbon footprint?
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/75">
              Electricity, food, commute, flights and cooking gas — see where emissions stack up
              and how an EV commute changes the picture.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Your lifestyle</h2>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Household size — {householdSize}
              <input
                type="range"
                min={1}
                max={8}
                value={householdSize}
                onChange={(e) => setHouseholdSize(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Monthly electricity — {monthlyElectricityKwh} kWh
              <input
                type="range"
                min={50}
                max={1200}
                step={10}
                value={monthlyElectricityKwh}
                onChange={(e) => setKwh(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Diet
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value as DietType)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium"
              >
                {DIET_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Daily commute — {commuteKmPerDay} km
              <input
                type="range"
                min={0}
                max={100}
                value={commuteKmPerDay}
                onChange={(e) => setCommuteKm(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Commute mode
              <select
                value={commuteMode}
                onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium"
              >
                {COMMUTE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Flight hours / year — {flightsHoursPerYear} h
              <input
                type="range"
                min={0}
                max={80}
                value={flightsHoursPerYear}
                onChange={(e) => setFlights(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              LPG cylinders / year — {lpgCylindersPerYear}
              <input
                type="range"
                min={0}
                max={24}
                value={lpgCylindersPerYear}
                onChange={(e) => setLpg(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated annual footprint
              </p>
              <p className="mt-2 font-display text-4xl font-bold">
                {result.totalKgCo2ePerYear.toLocaleString("en-IN")}
                <span className="ml-2 text-base font-semibold text-muted-foreground">
                  kg CO₂e / yr
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                ~{result.perPersonKg.toLocaleString("en-IN")} kg per person · India household avg ~
                {result.indiaAvgKg.toLocaleString("en-IN")} kg (
                {result.vsIndiaPct > 0 ? "+" : ""}
                {result.vsIndiaPct}%)
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold">
                <Trees className="size-4 text-leaf" />
                ~{result.treesToOffset} trees / year to offset
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-display text-base font-bold">Breakdown</h3>
              <ul className="mt-4 space-y-3">
                {result.breakdown.map((b) => (
                  <li key={b.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.label}</span>
                      <span className="text-muted-foreground">
                        {b.kgCo2ePerYear.toLocaleString("en-IN")} kg
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-volt-gradient"
                        style={{ width: `${(b.kgCo2ePerYear / maxSlice) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Leaf className="size-3.5" />
                Indicative India grid & lifestyle factors — not a certified inventory.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
