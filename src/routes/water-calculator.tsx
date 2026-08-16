import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Leaf } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import {
  DIET_OPTIONS,
  SHOWER_OPTIONS,
  estimateWater,
  type DietType,
  type ShowerHabit,
} from "@/data/water";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Water Footprint Calculator — home & virtual water | ${siteConfig.name}`;
const DESCRIPTION =
  "Estimate daily and monthly water use including showers, laundry, diet virtual water and garden — compare with a typical Indian lifestyle.";

export const Route = createFileRoute("/water-calculator")({
  loader: () => loadPageSeo("/water-calculator"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/water-calculator",
    }),
  component: WaterCalculatorPage,
});

function WaterCalculatorPage() {
  const [householdSize, setHouseholdSize] = useState(3);
  const [showersPerPersonPerWeek, setShowers] = useState(7);
  const [showerHabit, setShowerHabit] = useState<ShowerHabit>("medium");
  const [laundryLoadsPerWeek, setLaundry] = useState(4);
  const [diet, setDiet] = useState<DietType>("veg");
  const [mealsOutPerWeek, setMealsOut] = useState(2);
  const [gardenWateringDaysPerWeek, setGarden] = useState(2);

  const result = useMemo(
    () =>
      estimateWater({
        householdSize,
        showersPerPersonPerWeek,
        showerHabit,
        laundryLoadsPerWeek,
        diet,
        mealsOutPerWeek,
        gardenWateringDaysPerWeek,
      }),
    [
      householdSize,
      showersPerPersonPerWeek,
      showerHabit,
      laundryLoadsPerWeek,
      diet,
      mealsOutPerWeek,
      gardenWateringDaysPerWeek,
    ],
  );

  const maxSlice = Math.max(...result.breakdown.map((b) => b.litresPerDay), 1);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-7xl px-5 pb-14 pt-8">
            <BannerMenu />
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90">
              <Droplets className="size-3.5" />
              Calculator · litres / day
            </span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              How much water does your lifestyle use?
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/75">
              Direct use at home plus virtual water in food — the hidden litres behind every meal
              and shower.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Your habits</h2>

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
              Showers per person / week — {showersPerPersonPerWeek}
              <input
                type="range"
                min={1}
                max={14}
                value={showersPerPersonPerWeek}
                onChange={(e) => setShowers(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Shower length
              <select
                value={showerHabit}
                onChange={(e) => setShowerHabit(e.target.value as ShowerHabit)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-medium"
              >
                {SHOWER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Laundry loads / week — {laundryLoadsPerWeek}
              <input
                type="range"
                min={0}
                max={14}
                value={laundryLoadsPerWeek}
                onChange={(e) => setLaundry(Number(e.target.value))}
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
              Meals out / week — {mealsOutPerWeek}
              <input
                type="range"
                min={0}
                max={21}
                value={mealsOutPerWeek}
                onChange={(e) => setMealsOut(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
              Garden watering days / week — {gardenWateringDaysPerWeek}
              <input
                type="range"
                min={0}
                max={7}
                value={gardenWateringDaysPerWeek}
                onChange={(e) => setGarden(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--leaf)]"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated water footprint
              </p>
              <p className="mt-2 font-display text-4xl font-bold">
                {result.litresPerDay.toLocaleString("en-IN")}
                <span className="ml-2 text-base font-semibold text-muted-foreground">L / day</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                ~{result.litresPerPersonPerDay.toLocaleString("en-IN")} L per person/day · ~
                {result.litresPerMonth.toLocaleString("en-IN")} L / month
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                India lifestyle avg ~{result.indiaAvgLitresPerPersonDay.toLocaleString("en-IN")} L
                / person/day (incl. food) · you are{" "}
                {result.vsIndiaPct > 0 ? "+" : ""}
                {result.vsIndiaPct}% vs that benchmark
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
                        {b.litresPerDay.toLocaleString("en-IN")} L/day
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-volt-gradient"
                        style={{ width: `${(b.litresPerDay / maxSlice) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Leaf className="size-3.5" />
                Virtual water dominates diet — awareness estimate only.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
