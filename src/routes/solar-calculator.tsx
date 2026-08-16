import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Home, Leaf, PiggyBank, Sun, Timer, Zap } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { IconicLoader } from "@/components/platform/IconicLoader";
import {
  ROOF_TYPES,
  SHADING,
  SOLAR_LOCATIONS,
  estimateSolar,
  inr,
  type SolarEstimate,
  type SolarLocation,
} from "@/data/solar";
import { estimateSolarLive } from "@/lib/ev/solar.functions";
import { getPublicSolarLocations } from "@/lib/platform/cms.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Rooftop Solar Calculator — size, savings & payback | ${siteConfig.name}`;
const DESCRIPTION =
  "Estimate rooftop solar size in kW using India city DISCOM tariff benchmarks and EU PVGIS sun hours — savings, subsidy and payback in minutes.";

export const Route = createFileRoute("/solar-calculator")({
  loader: () => loadPageSeo("/solar-calculator"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/solar-calculator",
    }),
  component: SolarCalculatorPage,
});

function SolarCalculatorPage() {
  const fetchLive = useServerFn(estimateSolarLive);
  const fetchLocations = useServerFn(getPublicSolarLocations);
  const [locations, setLocations] = useState<SolarLocation[]>(SOLAR_LOCATIONS);
  const [slug, setSlug] = useState(SOLAR_LOCATIONS[0]!.slug);
  const [roofAreaSqft, setRoofArea] = useState(600);
  const [roofType, setRoofType] = useState(ROOF_TYPES[0]!.id);
  const [shading, setShading] = useState(SHADING[0]!.id);
  const [monthlyBill, setMonthlyBill] = useState(4500);
  const [applySubsidy, setSubsidy] = useState(true);
  const [result, setResult] = useState<SolarEstimate | null>(null);
  const [sunHours, setSunHours] = useState(SOLAR_LOCATIONS[0]!.sunHours);
  const [source, setSource] = useState<"pvgis" | "benchmark">("benchmark");
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchLocations()
      .then((res) => {
        if (res.locations?.length) {
          setLocations(res.locations);
          setSlug((prev) =>
            res.locations.some((l) => l.slug === prev) ? prev : res.locations[0]!.slug,
          );
        }
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, [fetchLocations]);

  const location = locations.find((l) => l.slug === slug) ?? locations[0]!;

  useEffect(() => {
    // Instant local preview
    setResult(
      estimateSolar({
        location,
        roofAreaSqft,
        usableFactor: ROOF_TYPES.find((r) => r.id === roofType)!.usable,
        shadingFactor: SHADING.find((s) => s.id === shading)!.factor,
        monthlyBill,
        applySubsidy,
      }),
    );
    setSunHours(location.sunHours);
    setSource("benchmark");

    let cancelled = false;
    const t = window.setTimeout(() => {
      setLoading(true);
      void fetchLive({
        data: {
          locationSlug: slug,
          roofAreaSqft,
          usableFactor: ROOF_TYPES.find((r) => r.id === roofType)!.usable,
          shadingFactor: SHADING.find((s) => s.id === shading)!.factor,
          monthlyBill,
          applySubsidy,
        },
      })
        .then((res) => {
          if (cancelled) return;
          setResult(res.estimate);
          setSunHours(res.location.sunHours);
          setSource(res.source);
          setWarning(res.warning);
        })
        .catch(() => {
          if (cancelled) return;
          setWarning("Live PVGIS lookup failed — showing city benchmark.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [slug, roofAreaSqft, roofType, shading, monthlyBill, applySubsidy, location, fetchLive]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-7xl px-5 pb-14 pt-8">
            <BannerMenu />
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90">
              <Sun className="size-3.5" />
              Solar module · live sun hours
            </span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              How much solar fits on your roof?
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/75">
              Size the system, see monthly savings after subsidy, and know the year your
              rooftop pays for itself — sun hours refreshed from EU PVGIS where available.
            </p>
            <p className="mt-3 max-w-2xl rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-2 text-xs text-primary-foreground/90">
              Sun hours: EU PVGIS (live) with city fallback. Tariffs & ₹/kW: DISCOM / market
              benchmarks by city. Planning estimate only — not a DISCOM bill or installer quote.
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
                {locations.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}, {l.state} · {l.sunHours} sun hrs/day · ₹{l.tariff}/unit · {l.discom}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{location.name}</span>
                {" · "}
                {location.state} · {location.discom}
              </p>
              <p className="mt-1">
                Benchmark: {location.sunHours} peak sun hrs/day · ₹{location.tariff}/kWh · ~
                {inr(location.costPerKw)}/kW installed · grid {location.gridCo2} kg CO₂/kWh
              </p>
              {location.notes ? <p className="mt-1">{location.notes}</p> : null}
            </div>

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
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-border bg-card px-3 py-1 font-semibold">
                Sun hours: {sunHours}/day
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 font-semibold">
                {source === "pvgis" ? "Live PVGIS" : "City benchmark"}
              </span>
              {loading ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <IconicLoader size="sm" label="Refreshing live sun data…" />
                </span>
              ) : null}
            </div>
            {warning ? (
              <p className="rounded-2xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
                {warning}
              </p>
            ) : null}

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                {[
                  { icon: Zap, label: "Recommended size", value: `${result?.systemKw ?? "—"} kW` },
                  {
                    icon: PiggyBank,
                    label: "Monthly savings",
                    value: result ? inr(result.monthlySavings) : "—",
                  },
                  {
                    icon: Timer,
                    label: "Payback",
                    value: result ? `${result.paybackYears} yrs` : "—",
                  },
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
                  { k: "Panels (545 W)", v: result ? `${result.panels} modules` : "—" },
                  { k: "Usable roof", v: result ? `${result.usableAreaSqm} m²` : "—" },
                  {
                    k: "Generation",
                    v: result ? `${result.monthlyUnits} units/month` : "—",
                  },
                  { k: "Bill offset", v: result ? `${result.billOffsetPct}%` : "—" },
                  { k: "System cost", v: result ? inr(result.grossCost) : "—" },
                  {
                    k: "Subsidy",
                    v: result
                      ? result.subsidy
                        ? `− ${inr(result.subsidy)}`
                        : "Not applied"
                      : "—",
                  },
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
                <span className="font-display text-2xl font-bold">
                  {result ? inr(result.netCost) : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">25-year outlook</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Assumes 3% annual tariff escalation and 0.6% panel degradation.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: PiggyBank,
                    label: "Lifetime savings",
                    value: result ? inr(result.lifetimeSavings) : "—",
                  },
                  {
                    icon: Leaf,
                    label: "CO₂ avoided / yr",
                    value: result ? `${result.co2TonnesPerYear} t` : "—",
                  },
                  {
                    icon: Home,
                    label: "Trees equivalent",
                    value: result ? `${result.treesEquivalent}` : "—",
                  },
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
