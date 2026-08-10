import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Home, Leaf, PiggyBank, Sun, Timer, Zap } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import {
  ROOF_TYPES,
  SHADING,
  SOLAR_LOCATIONS,
  estimateSolar,
  inr,
} from "@/data/solar";

const TITLE = `Rooftop Solar Calculator — size, savings & payback | ${siteConfig.name}`;
const DESCRIPTION =
  "Estimate your rooftop solar system size in kW, monthly electricity savings, subsidy-adjusted cost and payback period for your location in minutes.";

export const Route = createFileRoute("/solar-calculator")({
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
  component: SolarCalculatorPage,
});

function SolarCalculatorPage() {
  const [slug, setSlug] = useState(SOLAR_LOCATIONS[0]!.slug);
  const [roofAreaSqft, setRoofArea] = useState(600);
  const [roofType, setRoofType] = useState(ROOF_TYPES[0]!.id);
  const [shading, setShading] = useState(SHADING[0]!.id);
  const [monthlyBill, setMonthlyBill] = useState(4500);
  const [applySubsidy, setSubsidy] = useState(true);

  const location = SOLAR_LOCATIONS.find((l) => l.slug === slug)!;

  const result = useMemo(
    () =>
      estimateSolar({
        location,
        roofAreaSqft,
        usableFactor: ROOF_TYPES.find((r) => r.id === roofType)!.usable,
        shadingFactor: SHADING.find((s) => s.id === shading)!.factor,
        monthlyBill,
        applySubsidy,
      }),
    [location, roofAreaSqft, roofType, shading, monthlyBill, applySubsidy],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-border bg-canopy">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90">
              <Sun className="size-3.5" />
              Solar module
            </span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              How much solar fits on your roof?
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/75">
              Size the system, see monthly savings after subsidy, and know the year your
              rooftop pays for itself — tuned to sunlight and tariffs in your location.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* Inputs */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Your rooftop</h2>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Location
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium text-foreground"
              >
                {SOLAR_LOCATIONS.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name} · {l.sunHours} sun hrs/day · ₹{l.tariff}/unit
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Usable roof area — {roofAreaSqft} sq ft
              <input
                type="range"
                min={150}
                max={4000}
                step={50}
                value={roofAreaSqft}
                onChange={(e) => setRoofArea(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--leaf,currentColor)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Average monthly electricity bill — {inr(monthlyBill)}
              <input
                type="range"
                min={500}
                max={30000}
                step={250}
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(Number(e.target.value))}
                className="mt-3 w-full"
              />
            </label>

            <fieldset className="mt-6">
              <legend className="text-xs font-semibold text-muted-foreground">Roof type</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {ROOF_TYPES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoofType(r.id)}
                    className={
                      "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors " +
                      (roofType === r.id
                        ? "border-leaf/50 bg-leaf/10 text-leaf"
                        : "border-border text-muted-foreground hover:bg-surface")
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-xs font-semibold text-muted-foreground">Shading</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {SHADING.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShading(s.id)}
                    className={
                      "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors " +
                      (shading === s.id
                        ? "border-leaf/50 bg-leaf/10 text-leaf"
                        : "border-border text-muted-foreground hover:bg-surface")
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <span className="text-sm font-medium">Apply residential subsidy (30%, capped)</span>
              <input
                type="checkbox"
                checked={applySubsidy}
                onChange={(e) => setSubsidy(e.target.checked)}
                className="size-4"
              />
            </label>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                {[
                  { icon: Zap, label: "Recommended size", value: `${result.systemKw} kW` },
                  { icon: PiggyBank, label: "Monthly savings", value: inr(result.monthlySavings) },
                  { icon: Timer, label: "Payback", value: `${result.paybackYears} yrs` },
                ].map((m) => (
                  <div key={m.label} className="bg-card px-4 py-5">
                    <m.icon className="size-4 text-leaf" />
                    <p className="mt-2 font-display text-2xl font-bold">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { k: "Panels (545 W)", v: `${result.panels} modules` },
                  { k: "Usable roof", v: `${result.usableAreaSqm} m²` },
                  { k: "Generation", v: `${result.monthlyUnits} units/month` },
                  { k: "Bill offset", v: `${result.billOffsetPct}%` },
                  { k: "System cost", v: inr(result.grossCost) },
                  { k: "Subsidy", v: result.subsidy ? `− ${inr(result.subsidy)}` : "Not applied" },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <dt className="text-xs text-muted-foreground">{row.k}</dt>
                    <dd className="text-sm font-semibold">{row.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-volt-gradient px-5 py-4 text-volt-foreground">
                <div className="inline-flex items-center gap-2">
                  <Coins className="size-4" />
                  <span className="text-sm font-semibold">Net investment</span>
                </div>
                <span className="font-display text-2xl font-bold">{inr(result.netCost)}</span>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">25-year outlook</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Assumes 3% annual tariff escalation and 0.6% panel degradation.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: PiggyBank, label: "Lifetime savings", value: inr(result.lifetimeSavings) },
                  { icon: Leaf, label: "CO₂ avoided / yr", value: `${result.co2TonnesPerYear} t` },
                  { icon: Home, label: "Trees equivalent", value: `${result.treesEquivalent}` },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-border bg-surface p-4">
                    <m.icon className="size-4 text-leaf" />
                    <p className="mt-2 font-display text-lg font-bold">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Estimates are indicative. Final sizing depends on a site survey, sanctioned
                load and your distribution company&apos;s net-metering policy.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
