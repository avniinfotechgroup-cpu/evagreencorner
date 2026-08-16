import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  BatteryCharging,
  Bookmark,
  BookmarkCheck,
  Clock,
  Coins,
  Flag,
  History,
  IndianRupee,
  Leaf,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Timer,
} from "lucide-react";
import { routeKey, saveRoute, useSaved } from "@/lib/savedItems";
import {
  clearRecentRoutes,
  pushRecentRoute,
  useRecentRoutes,
} from "@/lib/recentRoutePlans";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { IconicLoader } from "@/components/platform/IconicLoader";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { PlaceTypeahead } from "@/components/platform/PlaceTypeahead";
import { RoutePlanMap } from "@/components/platform/RoutePlanMap";
import {
  ROUTE_PRESETS,
  VEHICLES,
  isBatterySwapOnlyStation,
  resolveRouteVehicle,
  type PlannedStop,
  type RouteCorridorStation,
  type RouteMapPayload,
  type RoutePlan,
  type VehicleProfile,
} from "@/data/routePlanner";
import { planEvRouteLive } from "@/lib/ev/route.functions";
import { directionsForRouteUrl, pickStationsAlongPath } from "@/lib/ev/google-maps-directions";
import { haversineKm } from "@/lib/ev/haversine";
import { getPublicRouteVehicles } from "@/lib/platform/cms.functions";
import { resolveIndiaLocation, type IndiaLocation } from "@/data/indiaLocations";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `EV Route Planner — charge stops, cost & time | ${siteConfig.name}`;
const DESCRIPTION =
  "Plan an electric car trip: enter start and destination to get recommended charging stops with estimated charging time, energy cost and CO₂ saved.";

export const Route = createFileRoute("/route-planner")({
  loader: () => loadPageSeo("/route-planner"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/route-planner",
    }),
  validateSearch: (search: Record<string, unknown>) => {
    const out: {
      from?: string;
      to?: string;
      vehicle?: string;
      soc?: number;
    } = {};
    if (typeof search["from"] === "string" && search["from"].trim()) {
      out.from = search["from"];
    }
    if (typeof search["to"] === "string" && search["to"].trim()) {
      out.to = search["to"];
    }
    if (typeof search["vehicle"] === "string" && search["vehicle"].trim()) {
      out.vehicle = search["vehicle"];
    }
    const soc = Number(search["soc"]);
    if (Number.isFinite(soc) && soc > 0) out.soc = soc;
    return out;
  },
  component: RoutePlannerPage,
});

function RoutePlannerPage() {
  const search = Route.useSearch();
  const planLive = useServerFn(planEvRouteLive);
  const fetchVehicles = useServerFn(getPublicRouteVehicles);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>(VEHICLES);
  const [from, setFrom] = useState(search.from ?? "");
  const [to, setTo] = useState(search.to ?? "");
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleId, setVehicleId] = useState(resolveRouteVehicle(search.vehicle).id);
  const [startSoc, setStartSoc] = useState(search.soc ?? 80);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [mapData, setMapData] = useState<RouteMapPayload | null>(null);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);

  const scrollToResults = () => {
    // Wait for results to paint, then point user to the details section
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
  };

  useEffect(() => {
    void fetchVehicles()
      .then((res) => {
        if (res.vehicles?.length) {
          setVehicles(res.vehicles);
          setVehicleId((prev) =>
            res.vehicles.some((v) => v.id === prev) ? prev : res.vehicles[0]!.id,
          );
        }
      })
      .catch(() => {
        /* static VEHICLES fallback */
      });
  }, [fetchVehicles]);

  const vehicle =
    vehicles.find((v) => v.id === vehicleId) ??
    resolveRouteVehicle(vehicleId) ??
    vehicles[0]!;
  const saved = useSaved();
  const recent = useRecentRoutes();
  const isSaved = saved.routes.some(
    (r) => r.id === routeKey({ from, to, vehicleId }),
  );

  const onSave = () => {
    saveRoute({ from: from.trim(), to: to.trim(), vehicleId, startSoc });
    toast.success(`Saved ${from} → ${to} to your dashboard`);
  };

  const runPlan = async (opts?: {
    from?: string;
    to?: string;
    vehicleId?: string;
    startSoc?: number;
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    /** Skip writing to recent history (e.g. initial mount with defaults) */
    skipRecent?: boolean;
  }) => {
    const f = (opts?.from ?? from).trim();
    const t = (opts?.to ?? to).trim();
    const vid = opts?.vehicleId ?? vehicleId;
    const soc = opts?.startSoc ?? startSoc;
    if (f.length < 2 || t.length < 2) return;

    // Prefer local India city coords so planning works without Nominatim
    const localFrom = resolveIndiaLocation(f);
    const localTo = resolveIndiaLocation(t);
    const fromLat = opts?.fromLat ?? fromCoords?.lat ?? localFrom?.lat;
    const fromLng = opts?.fromLng ?? fromCoords?.lng ?? localFrom?.lng;
    const toLat = opts?.toLat ?? toCoords?.lat ?? localTo?.lat;
    const toLng = opts?.toLng ?? toCoords?.lng ?? localTo?.lng;

    if (localFrom && !fromCoords) setFromCoords({ lat: localFrom.lat, lng: localFrom.lng });
    if (localTo && !toCoords) setToCoords({ lat: localTo.lat, lng: localTo.lng });

    setBusy(true);
    setWarning(null);
    if (!opts?.skipRecent) {
      scrollToResults();
    }
    try {
      const payload: {
        from: string;
        to: string;
        vehicleId: string;
        startSoc: number;
        fromLat?: number;
        fromLng?: number;
        toLat?: number;
        toLng?: number;
      } = {
        from: f,
        to: t,
        vehicleId: vid,
        startSoc: soc,
      };
      if (typeof fromLat === "number") payload.fromLat = fromLat;
      if (typeof fromLng === "number") payload.fromLng = fromLng;
      if (typeof toLat === "number") payload.toLat = toLat;
      if (typeof toLng === "number") payload.toLng = toLng;

      const res = await planLive({ data: payload });
      setPlan(res.plan);
      setMapData(res.map);
      setMode(res.mode);
      setWarning(res.warning);

      if (!opts?.skipRecent) {
        pushRecentRoute({
          from: res.plan.from || f,
          to: res.plan.to || t,
          vehicleId: vid,
          startSoc: soc,
          ...(typeof fromLat === "number" ? { fromLat } : {}),
          ...(typeof fromLng === "number" ? { fromLng } : {}),
          ...(typeof toLat === "number" ? { toLat } : {}),
          ...(typeof toLng === "number" ? { toLng } : {}),
          distanceKm: res.plan.distanceKm,
          stopsCount: res.plan.stops.length,
          mode: res.mode,
        });
        scrollToResults();
      }
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Could not plan route");
      setPlan(null);
      setMapData(null);
      setMode(null);
      if (!opts?.skipRecent) {
        scrollToResults();
      }
    } finally {
      setBusy(false);
    }
  };

  const applyRecent = (r: (typeof recent)[number]) => {
    const vid = resolveRouteVehicle(r.vehicleId).id;
    setFrom(r.from);
    setTo(r.to);
    setVehicleId(vid);
    setStartSoc(r.startSoc);
    setFromCoords(
      typeof r.fromLat === "number" && typeof r.fromLng === "number"
        ? { lat: r.fromLat, lng: r.fromLng }
        : null,
    );
    setToCoords(
      typeof r.toLat === "number" && typeof r.toLng === "number"
        ? { lat: r.toLat, lng: r.toLng }
        : null,
    );
    void runPlan({
      from: r.from,
      to: r.to,
      vehicleId: vid,
      startSoc: r.startSoc,
      ...(typeof r.fromLat === "number" ? { fromLat: r.fromLat } : {}),
      ...(typeof r.fromLng === "number" ? { fromLng: r.fromLng } : {}),
      ...(typeof r.toLat === "number" ? { toLat: r.toLat } : {}),
      ...(typeof r.toLng === "number" ? { toLng: r.toLng } : {}),
    });
  };

  const selectFrom = (loc: IndiaLocation) => {
    setFrom(loc.name);
    setFromCoords({ lat: loc.lat, lng: loc.lng });
    const dest = to.trim();
    if (dest.length < 2) return;
    void runPlan({
      from: loc.name,
      fromLat: loc.lat,
      fromLng: loc.lng,
      ...(toCoords ? { toLat: toCoords.lat, toLng: toCoords.lng } : {}),
    });
  };

  const selectTo = (loc: IndiaLocation) => {
    setTo(loc.name);
    setToCoords({ lat: loc.lat, lng: loc.lng });
    const origin = from.trim();
    if (origin.length < 2) return;
    void runPlan({
      to: loc.name,
      toLat: loc.lat,
      toLng: loc.lng,
      ...(fromCoords ? { fromLat: fromCoords.lat, fromLng: fromCoords.lng } : {}),
    });
  };

  // Only auto-plan when URL search params already include both ends (e.g. saved trip)
  useEffect(() => {
    if (!search.from || !search.to) return;
    const a = resolveIndiaLocation(search.from);
    const b = resolveIndiaLocation(search.to);
    if (a) setFromCoords({ lat: a.lat, lng: a.lng });
    if (b) setToCoords({ lat: b.lat, lng: b.lng });
    void runPlan({
      from: search.from,
      to: search.to,
      ...(a ? { fromLat: a.lat, fromLng: a.lng } : {}),
      ...(b ? { toLat: b.lat, toLng: b.lng } : {}),
      skipRecent: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative z-0 bg-canopy">
          <div className="relative z-10 mx-auto max-w-6xl overflow-visible px-5 pb-14 pt-8 text-center">
            <BannerMenu />
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <RouteIcon className="size-3.5" />
              EV Route Planner
            </span>
            <h1 className="mx-auto mt-5 max-w-2xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Plan the drive. We'll plan the charging.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Type a city (3+ letters), pick from suggestions — we plan the route and show it on
              the map.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runPlan();
              }}
              className="mt-8 rounded-3xl border border-border/60 bg-card/95 p-4 text-left shadow-lift backdrop-blur"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">From</p>
                  <PlaceTypeahead
                    value={from}
                    placeholder="Start city (type to search)"
                    onQueryChange={(v) => {
                      setFrom(v);
                      setFromCoords(null);
                    }}
                    onSelect={selectFrom}
                  />
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">To</p>
                  <PlaceTypeahead
                    value={to}
                    placeholder="Destination city (type to search)"
                    onQueryChange={(v) => {
                      setTo(v);
                      setToCoords(null);
                    }}
                    onSelect={selectTo}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <BatteryCharging className="size-4 shrink-0 text-leaf" />
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.batteryKwh} kWh · ~{v.rangeKm} km
                        {v.batterySwap ? " · battery swap" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 rounded-2xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
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
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Charge stops are planned from this % — tap Plan route after changing it.
                  </p>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {busy ? (
                    <IconicLoader size="sm" />
                  ) : (
                    <RouteIcon className="size-4" />
                  )}
                  Plan route
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={onSave}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                    (isSaved
                      ? "border-leaf/40 bg-leaf/10 text-leaf"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {isSaved ? (
                    <BookmarkCheck className="size-3.5" />
                  ) : (
                    <Bookmark className="size-3.5" />
                  )}
                  {isSaved ? "Search saved" : "Save this search"}
                </button>
                <Link
                  to="/dashboard"
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  View saved trips
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="text-[11px] text-muted-foreground">Popular:</span>
                {ROUTE_PRESETS.map((p) => (
                  <button
                    key={`${p.from}-${p.to}`}
                    type="button"
                    onClick={() => {
                      const a = resolveIndiaLocation(p.from);
                      const b = resolveIndiaLocation(p.to);
                      setFrom(p.from);
                      setTo(p.to);
                      setFromCoords(a ? { lat: a.lat, lng: a.lng } : null);
                      setToCoords(b ? { lat: b.lat, lng: b.lng } : null);
                      void runPlan({
                        from: p.from,
                        to: p.to,
                        ...(a ? { fromLat: a.lat, fromLng: a.lng } : {}),
                        ...(b ? { toLat: b.lat, toLng: b.lng } : {}),
                      });
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {p.from} → {p.to}
                  </button>
                ))}
              </div>

              {recent.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <History className="size-3.5" />
                    Recent:
                  </span>
                  {recent.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      title={`${r.from} → ${r.to}${typeof r.distanceKm === "number" ? ` · ${r.distanceKm} km` : ""}`}
                      onClick={() => applyRecent(r)}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {r.from} → {r.to}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => clearRecentRoutes()}
                    className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </section>

        <section
          id="route-details"
          ref={resultsRef}
          className="mx-auto max-w-7xl scroll-mt-28 px-5 py-14"
        >
          {warning && !busy ? (
            <p className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {warning}
            </p>
          ) : null}

          {busy && !plan ? (
            <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <IconicLoader size="lg" />
                <p className="text-sm font-medium text-muted-foreground">Planning route…</p>
              </div>
            </div>
          ) : !plan ? (
            <div className="rounded-3xl border border-dashed border-border p-14 text-center">
              <RouteIcon className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-4 font-display text-lg font-bold">No route planned yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Type start and destination, select from the list, or tap a popular corridor.
                Nothing is planned until you enter both places.
              </p>
            </div>
          ) : (
            <PlanResult
              plan={plan}
              vehicleName={vehicle.name}
              vehicleBatterySwap={vehicle.batterySwap}
              live={mode === "live"}
              mapData={mapData}
              planning={busy}
            />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Real chargers between A→B (not the SoC-required stops), spaced for the timeline. */
function pickEnRouteStations(
  corridor: RouteCorridorStation[],
  required: PlannedStop[],
  distanceKm: number,
): RouteCorridorStation[] {
  const real = corridor
    .filter((c) => !c.planned && !c.id.startsWith("planned-"))
    .filter((c) => c.atKm > 8 && c.atKm < distanceKm - 8)
    .sort((a, b) => a.atKm - b.atKm);

  const picked: RouteCorridorStation[] = [];
  for (const c of real) {
    const nearRequired = required.some((s) => Math.abs(s.atKm - c.atKm) < 18);
    if (nearRequired) continue;
    const nearPicked = picked.some((p) => Math.abs(p.atKm - c.atKm) < 55);
    if (nearPicked) continue;
    picked.push(c);
    if (picked.length >= 14) break;
  }
  return picked;
}

/**
 * Real EV chargers for Google Maps waypoints (driving route + charge pins).
 * Spreads stops along the trip; sorts by distance from origin for correct visit order.
 */
function googleMapsEvWaypoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  required: PlannedStop[],
  corridor: RouteCorridorStation[],
  distanceKm: number,
): Array<{ lat: number; lng: number }> {
  const short = distanceKm < 80;
  const maxStops = short ? 4 : 6;

  const fromPlan = required
    .filter((s) => s.lat != null && s.lng != null && Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => ({
      lat: s.lat!,
      lng: s.lng!,
      id: `plan-${Math.round(s.atKm)}`,
    }));

  const candidates = corridor.filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
  );

  const along = pickStationsAlongPath(origin, destination, candidates, {
    max: maxStops,
    // Wide slack so urban / highway detours still count as “along route”
    corridorSlackKm: short
      ? Math.max(10, distanceKm * 0.55)
      : Math.max(30, distanceKm * 0.15),
    minSeparationKm: short
      ? Math.max(1.0, distanceKm / 12)
      : Math.max(12, distanceKm / 16),
  });

  const seen = new Set<string>();
  const merged: Array<{ lat: number; lng: number }> = [];
  for (const p of [...fromPlan, ...along]) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ lat: p.lat, lng: p.lng });
  }

  return merged
    .sort(
      (a, b) =>
        haversineKm(origin.lat, origin.lng, a.lat, a.lng) -
        haversineKm(origin.lat, origin.lng, b.lat, b.lng),
    )
    .slice(0, maxStops);
}

type TimelineItem =
  | { kind: "required"; atKm: number; stop: PlannedStop; index: number }
  | { kind: "enroute"; atKm: number; station: RouteCorridorStation };

function PlanResult({
  plan,
  vehicleName,
  vehicleBatterySwap,
  live,
  mapData,
  planning,
}: {
  plan: RoutePlan;
  vehicleName: string;
  vehicleBatterySwap: boolean;
  live?: boolean;
  mapData: RouteMapPayload | null;
  planning?: boolean;
}) {
  const saving = plan.petrolCost - plan.energyCost;
  const corridorStations = (mapData?.corridorStations ?? []).filter(
    (s) => vehicleBatterySwap || s.planned || !isBatterySwapOnlyStation(s),
  );
  const mapForVehicle: RouteMapPayload | null = mapData
    ? { ...mapData, corridorStations }
    : null;
  const enRouteStations = pickEnRouteStations(corridorStations, plan.stops, plan.distanceKm);
  const evWaypoints = mapForVehicle
    ? googleMapsEvWaypoints(
        mapForVehicle.origin,
        mapForVehicle.destination,
        plan.stops,
        corridorStations,
        plan.distanceKm,
      )
    : [];
  const directionsHref = mapForVehicle
    ? directionsForRouteUrl({
        origin: {
          lat: mapForVehicle.origin.lat,
          lng: mapForVehicle.origin.lng,
        },
        destination: {
          lat: mapForVehicle.destination.lat,
          lng: mapForVehicle.destination.lng,
        },
        stops: evWaypoints,
      })
    : null;

  const timeline: TimelineItem[] = [
    ...plan.stops.map((stop, index) => ({
      kind: "required" as const,
      atKm: stop.atKm,
      stop,
      index,
    })),
    ...enRouteStations.map((station) => ({
      kind: "enroute" as const,
      atKm: station.atKm,
      station,
    })),
  ].sort((a, b) => a.atKm - b.atKm || (a.kind === "required" ? -1 : 1));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {plan.from} <ArrowRight className="inline size-5 text-leaf" /> {plan.to}
            {planning ? (
              <IconicLoader size="sm" className="ml-2 inline-grid" />
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicleName} · arriving with about {plan.arrivalSoc}% battery
            {live ? " · live route" : plan.synthetic ? " · estimated corridor" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {enRouteStations.length > 0 ? (
            <span className="rounded-full border border-sky-300 bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
              {enRouteStations.length} en-route charger
              {enRouteStations.length === 1 ? "" : "s"}
            </span>
          ) : null}
          <span className="rounded-full bg-volt-gradient px-3.5 py-1.5 text-xs font-semibold text-volt-foreground">
            {plan.stops.length === 0
              ? "No required stop"
              : `${plan.stops.length} required stop${plan.stops.length > 1 ? "s" : ""}`}
          </span>
          {directionsHref ? (
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
              title={
                evWaypoints.length
                  ? `Google Maps: driving route + ${evWaypoints.length} EV charge stop${evWaypoints.length === 1 ? "" : "s"}`
                  : "Google Maps: driving route (no corridor chargers found yet)"
              }
            >
              <Navigation className="size-3.5" />
              {evWaypoints.length
                ? `Get directions · ${evWaypoints.length} EV`
                : "Get directions"}
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        {/* Left — trip details */}
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: RouteIcon, label: "Distance", value: `${plan.distanceKm} km` },
              { icon: Clock, label: "Total time", value: `${plan.totalHours} h` },
              { icon: Timer, label: "Charging time", value: `${plan.chargingMinutes} min` },
              { icon: IndianRupee, label: "Charging cost", value: `₹${plan.energyCost}` },
              { icon: Leaf, label: "CO₂ saved", value: `${plan.co2SavedKg} kg` },
            ].map((m) => (
              <div key={m.label} className="bg-card px-4 py-4">
                <m.icon className="size-4 text-leaf" />
                <p className="mt-2 font-display text-lg font-bold">{m.value}</p>
                <p className="text-[11px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">
              <span className="size-2 rounded-full bg-amber-500" />
              Gold = required charge
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-900">
              <span className="size-2 rounded-full bg-sky-500" />
              Blue = en-route station
            </span>
          </div>

          <ol className="relative space-y-4 border-l border-dashed border-border pl-6">
            <li className="relative">
              <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <MapPin className="size-3" />
              </span>
              <p className="font-display text-sm font-bold">{plan.from}</p>
              <p className="text-xs text-muted-foreground">Departure · 0 km</p>
            </li>

            {timeline.map((item) => {
              if (item.kind === "required") {
                const s = item.stop;
                return (
                  <li key={`req-${s.name}-${s.atKm}`} className="relative">
                    <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-amber-500 text-white">
                      <BatteryCharging className="size-3" />
                    </span>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Required stop · #{item.index + 1}
                          </p>
                          <p className="mt-0.5 font-display text-sm font-bold text-amber-950">
                            {s.name}
                          </p>
                          <p className="mt-0.5 text-xs text-amber-900/70">
                            {s.city} · {s.atKm} km in · {s.powerKw} kW
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-200/80 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
                          {s.arrivalSoc}% → {s.departureSoc}%
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-amber-900/80">
                        <span className="inline-flex items-center gap-1">
                          <Timer className="size-3.5" />
                          {s.minutes} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BatteryCharging className="size-3.5" />
                          {s.kwhAdded} kWh
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IndianRupee className="size-3.5" />
                          {s.cost} at ₹{s.pricePerKwh}/kWh
                        </span>
                      </div>
                    </div>
                  </li>
                );
              }

              const s = item.station;
              const canLink = Boolean(s.id) && !s.id.startsWith("planned-");
              const card = (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 shadow-soft transition hover:border-sky-300">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                        En-route charger
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold text-sky-950">{s.name}</p>
                      <p className="mt-0.5 text-xs text-sky-900/70">
                        {s.city} · ~{s.atKm} km
                        {s.powerKw != null ? ` · ${s.powerKw} kW` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-200/80 px-2.5 py-1 text-[11px] font-semibold text-sky-950">
                      Available
                    </span>
                  </div>
                  {s.connectors.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.connectors.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="rounded-md border border-sky-200 bg-white/70 px-2 py-0.5 text-[11px] text-sky-900/80"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {s.pricePerKwh != null ? (
                    <p className="mt-2 text-xs text-sky-900/70">≈ ₹{s.pricePerKwh}/kWh</p>
                  ) : null}
                </div>
              );
              return (
                <li key={`en-${s.id}`} className="relative">
                  <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-sky-500 text-white">
                    <BatteryCharging className="size-3" />
                  </span>
                  {canLink ? (
                    <Link to="/stations/$stationId" params={{ stationId: s.id }} className="block">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </li>
              );
            })}

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

          {corridorStations.length > 0 ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h3 className="inline-flex items-center gap-2 font-display text-base font-bold">
                <BatteryCharging className="size-4 text-leaf" />
                All chargers near path
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {corridorStations.length} station
                {corridorStations.length === 1 ? "" : "s"} — blue cards are en-route, gold are
                required stops.
              </p>
              <ul className="mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {corridorStations.map((s) => {
                  const canLink = Boolean(s.id) && !s.id.startsWith("planned-");
                  const tone = s.planned
                    ? "border-amber-200 bg-amber-50/80 hover:border-amber-300"
                    : "border-sky-200 bg-sky-50/70 hover:border-sky-300";
                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold">{s.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {s.city} · ~{s.atKm} km
                            {s.powerKw != null ? ` · ${s.powerKw} kW` : ""}
                          </p>
                        </div>
                        {s.planned ? (
                          <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Required
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            En route
                          </span>
                        )}
                      </div>
                      {s.connectors.length > 0 ? (
                        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                          {s.connectors.join(" · ")}
                        </p>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={s.id}>
                      {canLink ? (
                        <Link
                          to="/stations/$stationId"
                          params={{ stationId: s.id }}
                          className={`block rounded-2xl border px-3.5 py-3 transition ${tone}`}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className={`rounded-2xl border px-3.5 py-3 ${tone}`}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Right — map (same vehicle filter as list cards) */}
        <div className="min-w-0 lg:sticky lg:top-24">
          {mapForVehicle ? (
            <div>
              <RoutePlanMap
                map={mapForVehicle}
                stops={plan.stops}
                showBatterySwap={vehicleBatterySwap}
                {...(directionsHref
                  ? {
                      directionsHref,
                      directionsLabel: evWaypoints.length
                        ? `Get directions · ${evWaypoints.length} EV`
                        : "Get directions",
                    }
                  : {})}
              />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {vehicleBatterySwap
                  ? "Green line = path · A/B ends · violet pins = battery swap · gold = required"
                  : "Green line = path · A/B ends · blue pins = plug-in chargers · gold = required"}
              </p>
            </div>
          ) : (
            <div className="grid h-[22rem] place-items-center rounded-3xl border border-dashed border-border bg-surface text-sm text-muted-foreground sm:h-[28rem]">
              Map unavailable for this plan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
