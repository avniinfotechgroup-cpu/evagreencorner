import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BatteryCharging,
  Clock,
  Coins,
  Flag,
  IndianRupee,
  Leaf,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Timer,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import {
  planRoute,
  ROUTE_PRESETS,
  VEHICLES,
  type RoutePlan,
} from "@/data/routePlanner";

const TITLE = `EV Route Planner — charge stops, cost & time | ${siteConfig.name}`;
const DESCRIPTION =
  "Plan an electric car trip: enter start and destination to get recommended charging stops with estimated charging time, energy cost and CO₂ saved.";

export const Route = createFileRoute("/route-planner")({
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
  component: RoutePlannerPage,
});

function RoutePlannerPage() {
  const [from, setFrom] = useState("Bengaluru");
  const [to, setTo] = useState("Chennai");
  const [vehicleId, setVehicleId] = useState(VEHICLES[0]!.id);
  const [startSoc, setStartSoc] = useState(80);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [busy, setBusy] = useState(false);

  const vehicle = VEHICLES.find((v) => v.id === vehicleId)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from.trim() || !to.trim()) return;
    setBusy(true);
    window.setTimeout(() => {
      setPlan(planRoute({ from, to, vehicle, startSoc }));
      setBusy(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-border bg-canopy">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <RouteIcon className="size-3.5" />
              EV Route Planner
            </span>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Plan the drive. We'll plan the charging.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-primary-foreground/80">
              Enter your start and destination — get recommended stops, charging time and total
              cost for your car's battery and connector.
            </p>

            <form
              onSubmit={submit}
              className="mt-8 rounded-3xl border border-border/60 bg-card/95 p-4 shadow-lift backdrop-blur"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <MapPin className="size-4 shrink-0 text-leaf" />
                  <span className="sr-only">Start location</span>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="Start city or pincode"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <Flag className="size-4 shrink-0 text-leaf" />
                  <span className="sr-only">Destination</span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="Destination city or pincode"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <BatteryCharging className="size-4 shrink-0 text-leaf" />
                  <span className="sr-only">Vehicle</span>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    {VEHICLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.batteryKwh} kWh
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                    Start charge {startSoc}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={startSoc}
                    onChange={(e) => setStartSoc(Number(e.target.value))}
                    className="w-full accent-[var(--leaf)]"
                    aria-label="Starting state of charge"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}
                  Plan route
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="text-[11px] text-muted-foreground">Popular:</span>
                {ROUTE_PRESETS.map((p) => (
                  <button
                    key={`${p.from}-${p.to}`}
                    type="button"
                    onClick={() => {
                      setFrom(p.from);
                      setTo(p.to);
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {p.from} → {p.to}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14">
          {!plan ? (
            <div className="rounded-3xl border border-dashed border-border p-14 text-center">
              <RouteIcon className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-4 font-display text-lg font-bold">No route planned yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Pick a start and destination above. We'll match charge stops to your battery size
                and show cost and time for the whole trip.
              </p>
            </div>
          ) : (
            <PlanResult plan={plan} vehicleName={vehicle.name} />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function PlanResult({ plan, vehicleName }: { plan: RoutePlan; vehicleName: string }) {
  const saving = plan.petrolCost - plan.energyCost;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {plan.from} <ArrowRight className="inline size-5 text-leaf" /> {plan.to}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicleName} · arriving with about {plan.arrivalSoc}% battery
            {plan.synthetic ? " · estimated corridor" : ""}
          </p>
        </div>
        <span className="rounded-full bg-volt-gradient px-3.5 py-1.5 text-xs font-semibold text-volt-foreground">
          {plan.stops.length === 0
            ? "No charging stop needed"
            : `${plan.stops.length} charging stop${plan.stops.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-5">
        {[
          { icon: RouteIcon, label: "Distance", value: `${plan.distanceKm} km` },
          { icon: Clock, label: "Total time", value: `${plan.totalHours} h` },
          { icon: Timer, label: "Charging time", value: `${plan.chargingMinutes} min` },
          { icon: IndianRupee, label: "Charging cost", value: `₹${plan.energyCost}` },
          { icon: Leaf, label: "CO₂ saved", value: `${plan.co2SavedKg} kg` },
        ].map((m) => (
          <div key={m.label} className="bg-card px-5 py-5">
            <m.icon className="size-4 text-leaf" />
            <p className="mt-2 font-display text-xl font-bold">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ol className="relative space-y-4 border-l border-dashed border-border pl-6">
          <li className="relative">
            <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <MapPin className="size-3" />
            </span>
            <p className="font-display text-sm font-bold">{plan.from}</p>
            <p className="text-xs text-muted-foreground">Departure · 0 km</p>
          </li>

          {plan.stops.map((s) => (
            <li key={s.name} className="relative">
              <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-volt-gradient text-volt-foreground">
                <BatteryCharging className="size-3" />
              </span>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-bold">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.city} · {s.atKm} km in · {s.powerKw} kW
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                    {s.arrivalSoc}% → {s.departureSoc}%
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="size-3.5 text-leaf" />
                    {s.minutes} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BatteryCharging className="size-3.5 text-leaf" />
                    {s.kwhAdded} kWh
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IndianRupee className="size-3.5 text-leaf" />
                    {s.cost} at ₹{s.pricePerKwh}/kWh
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}

          <li className="relative">
            <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <Flag className="size-3" />
            </span>
            <p className="font-display text-sm font-bold">{plan.to}</p>
            <p className="text-xs text-muted-foreground">
              Arrival · {plan.distanceKm} km · ~{plan.arrivalSoc}% battery left
            </p>
          </li>
        </ol>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
              <Coins className="size-4 text-leaf" />
              Cost comparison
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Energy needed</dt>
                <dd className="font-semibold">{plan.energyKwh} kWh</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Charging cost (EV)</dt>
                <dd className="font-semibold">₹{plan.energyCost}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Same trip on petrol</dt>
                <dd className="font-semibold">₹{plan.petrolCost}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-semibold">You save</dt>
                <dd className="font-display text-lg font-bold text-primary">
                  ₹{Math.max(0, saving)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <p className="text-xs text-muted-foreground">
              Estimates assume average DC taper at 72% of rated power, a 12% arrival reserve and
              charging to 85%. Real time and cost vary with temperature, traffic and operator
              tariffs.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
