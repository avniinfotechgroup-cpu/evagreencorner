import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Clock,
  IndianRupee,
  List,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Star,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchNearbyStations } from "@/lib/ev/stations.functions";
import { cacheStation, cacheStations } from "@/lib/ev/station-cache";
import type { EvStation } from "@/lib/ev/types";
import { IconicLoader } from "@/components/platform/IconicLoader";
import { getStationsCommunitySummary } from "@/lib/community/reviews.functions";
import { ReviewPopup, type ReviewTarget } from "./ReviewPopup";
import { StationMap } from "./StationMap";
import type { VehicleChargeMode } from "./StationMapView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLUG_IN_FILTERS = ["All", "Fast DC", "CCS2", "Type 2", "Open 24×7"] as const;
const SWAP_FILTERS = ["All", "Battery swap", "EV bike / 2W", "Open 24×7"] as const;
type QuickFilter = (typeof PLUG_IN_FILTERS)[number] | (typeof SWAP_FILTERS)[number];

export type { VehicleChargeMode };

export const RADIUS_OPTIONS = [1, 2, 5, 10, 20] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];

export type ResultsView = "list" | "map";

function matchesFilter(station: EvStation, filter: QuickFilter) {
  switch (filter) {
    case "Fast DC":
      return station.maxPowerKw != null && station.maxPowerKw >= 50;
    case "CCS2":
      return station.connectors.some((c) => c.toLowerCase().includes("ccs"));
    case "Type 2":
      return station.connectors.some((c) => c.toLowerCase().includes("type 2"));
    case "Battery swap":
      return station.batterySwap || station.serviceType !== "plug_in";
    case "EV bike / 2W":
      return (
        station.batterySwap ||
        station.vehicleAccess.twoWheelers === "yes" ||
        station.vehicleAccess.threeWheelers === "yes"
      );
    case "Open 24×7":
      return station.open24 === true;
    default:
      return true;
  }
}

function matchesVehicleMode(station: EvStation, mode: VehicleChargeMode) {
  if (mode === "battery_swap") {
    return station.batterySwap || station.serviceType !== "plug_in";
  }
  // Cars: hide swap-only sites (Nexon etc. cannot swap)
  return station.serviceType !== "battery_swap";
}

function serviceBadge(station: EvStation) {
  if (station.serviceType === "battery_swap") return "Battery swap";
  if (station.serviceType === "both") return "Plug-in + Battery swap";
  return "Plug-in charging";
}

function isUnknownOperator(operator: string) {
  const o = operator.trim().toLowerCase();
  return !o || o === "unknown operator" || o === "unknown";
}

function hoursLabel(station: EvStation) {
  if (station.open24 === true) return "24×7 open";
  if (station.openingHours) return station.openingHours;
  return "24×7 open";
}

function connectorLabels(station: EvStation): string[] {
  const raw = station.connectors.filter((c) => c && c.toLowerCase() !== "not specified");
  if (raw.length) return raw;
  if (station.batterySwap && station.serviceType === "battery_swap") {
    return ["Battery swap pack"];
  }
  return ["Plug-in charging (cable)"];
}

function vehicleChips(station: EvStation): string[] {
  const chips: string[] = [];
  if (station.serviceType === "plug_in") chips.push("Cable / plug-in charging");
  if (station.serviceType === "battery_swap") chips.push("Battery swap station");
  if (station.serviceType === "both") {
    chips.push("Plug-in charging");
    chips.push("Battery swap");
  }
  if (station.batterySwap || station.vehicleAccess.twoWheelers === "yes") {
    chips.push("EV bikes / 2-wheelers");
  }
  if (station.vehicleAccess.threeWheelers === "yes") chips.push("EV loaders / 3W");
  if (station.vehicleAccess.cars === "yes") chips.push("Cars");
  return [...new Set(chips)];
}

type Props = {
  coords: { lat: number; lng: number };
  placeLabel: string;
  radiusKm: RadiusKm;
  onRadiusChange?: (km: RadiusKm) => void;
  /** Desktop home: side-by-side. Mobile chargers page: tabbed. */
  layout: "split" | "tabs";
  view?: ResultsView;
  onViewChange?: (view: ResultsView) => void;
};

export function NearbyChargersPanel({
  coords,
  placeLabel,
  radiusKm,
  onRadiusChange,
  layout,
  view = "list",
  onViewChange,
}: Props) {
  const [vehicleMode, setVehicleMode] = useState<VehicleChargeMode>("plug_in");
  const [filter, setFilter] = useState<QuickFilter>("All");
  const [activeId, setActiveId] = useState("");
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const quickFilters = vehicleMode === "battery_swap" ? SWAP_FILTERS : PLUG_IN_FILTERS;

  const fetchNearby = useServerFn(searchNearbyStations);
  const fetchCommunity = useServerFn(getStationsCommunitySummary);
  const queryClient = useQueryClient();

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["nearby-stations", placeLabel, coords.lat, coords.lng, radiusKm],
    queryFn: () =>
      fetchNearby({
        data: {
          lat: coords.lat,
          lng: coords.lng,
          radiusKm,
          limit: 100,
          placeLabel,
        },
      }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const results = useMemo(() => {
    const list = data?.stations ?? [];
    return list
      .filter((s) => s.distanceKm <= radiusKm)
      .filter((s) => matchesVehicleMode(s, vehicleMode))
      .filter((s) => matchesFilter(s, filter));
  }, [data?.stations, filter, radiusKm, vehicleMode]);

  const stationIds = useMemo(() => results.map((s) => s.id), [results]);

  const { data: communityData, refetch: refetchCommunity } = useQuery({
    queryKey: ["station-community-summary", stationIds.join("|")],
    queryFn: () => fetchCommunity({ data: { stationIds } }),
    enabled: stationIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const communityById = communityData?.summaries ?? {};

  useEffect(() => {
    if (data?.stations?.length) cacheStations(data.stations);
  }, [data?.stations]);

  useEffect(() => {
    if (!results.length) {
      setActiveId("");
      return;
    }
    if (!results.some((s) => s.id === activeId)) {
      setActiveId(results[0]!.id);
    }
  }, [results, activeId]);

  const sourceLabel =
    data?.source === "openchargemap"
      ? "Open Charge Map"
      : data?.source
        ? "OpenStreetMap"
        : null;
  const initialLoading = isFetching && !data;
  const refreshing = isFetching && Boolean(data);

  const chip = (active: boolean, on: () => void, label: string, key: string) => (
    <button
      key={key}
      type="button"
      onClick={on}
      className={
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "border-transparent bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-white text-muted-foreground hover:border-leaf/40 hover:text-foreground dark:bg-background")
      }
    >
      {label}
    </button>
  );

  const filters = (
    <div className="rounded-3xl border border-border bg-white p-4 shadow-lift dark:bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold text-foreground">Filter chargers</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Near <span className="font-semibold text-foreground">{placeLabel}</span>
            {" · "}
            {vehicleMode === "battery_swap" ? "Battery swap / 2W–3W" : "Cars · plug-in"}
          </p>
        </div>
        {refreshing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <IconicLoader size="sm" />
            Updating…
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3.5">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Vehicle
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "plug_in" as const, label: "Car / plug-in" },
                { id: "battery_swap" as const, label: "Battery swap (2W/3W)" },
              ] as const
            ).map((m) =>
              chip(
                vehicleMode === m.id,
                () => {
                  setVehicleMode(m.id);
                  setFilter("All");
                },
                m.label,
                m.id,
              ),
            )}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Distance
          </p>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((km) =>
              chip(radiusKm === km, () => onRadiusChange?.(km), `${km} km`, `r-${km}`),
            )}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </p>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) =>
              chip(filter === f, () => setFilter(f), f, f),
            )}
          </div>
        </div>
      </div>

      {(data?.warning || isError) && (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-950">
          {data?.warning ||
            (error instanceof Error ? error.message : "Could not load stations.")}
          {isError ? (
            <button type="button" onClick={() => refetch()} className="ml-2 font-semibold underline">
              Retry
            </button>
          ) : null}
        </p>
      )}
    </div>
  );

  const heading = (
    <div className="flex flex-wrap items-start justify-between gap-2 pb-3">
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold text-foreground">
          Charging stations near {placeLabel}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Within {radiusKm} km
          {filter !== "All" ? ` · ${filter}` : ""}
          {sourceLabel ? ` · ${sourceLabel}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {initialLoading ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <IconicLoader size="sm" />
            Searching…
          </span>
        ) : (
          <span className="rounded-full bg-leaf/15 px-2.5 py-1 text-[11px] font-bold text-leaf">
            {results.length} found
          </span>
        )}
      </div>
    </div>
  );

  const skeleton = (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-border bg-surface px-4 py-3.5"
        >
          <div className="h-3.5 w-2/3 rounded bg-border/80" />
          <div className="mt-2 h-3 w-1/2 rounded bg-border/60" />
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-14 rounded-full bg-border/50" />
            <div className="h-5 w-16 rounded-full bg-border/50" />
          </div>
        </li>
      ))}
    </ul>
  );

  const list = (
    <div className="relative">
      {initialLoading ? (
        skeleton
      ) : (
        <ul className="max-h-[min(70vh,36rem)] space-y-2.5 overflow-y-auto pr-1">
          {results.map((s) => (
            <li key={s.id}>
              <StationResultCard
                station={s}
                active={activeId === s.id}
                {...(communityById[s.id] ? { community: communityById[s.id] } : {})}
                onSelect={() => setActiveId(s.id)}
                onReview={() => {
                  setReviewTarget({ stationId: s.id, stationName: s.name });
                  setReviewOpen(true);
                }}
              />
            </li>
          ))}
          {results.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <MapPin className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No stations in this view</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a larger distance, switch vehicle type, or clear the type filter.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {radiusKm < 20
                  ? chip(false, () => onRadiusChange?.(20), "Try 20 km", "try-20")
                  : null}
                {filter !== "All"
                  ? chip(false, () => setFilter("All"), "Clear type filter", "clear-f")
                  : null}
              </div>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );

  const map = (
    <div className="relative">
      <StationMap
        stations={results}
        activeId={activeId}
        onSelect={setActiveId}
        center={data ? { lat: data.place.lat, lng: data.place.lng } : coords}
        radiusKm={radiusKm}
        vehicleMode={vehicleMode}
      />
      {initialLoading ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl bg-white dark:bg-card">
          <div className="rounded-2xl border border-border bg-white px-4 py-3 text-center shadow-soft dark:bg-card">
            <IconicLoader size="md" className="mx-auto" />
            <p className="mt-2 text-xs font-semibold text-foreground">Loading map pins…</p>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="mt-5 space-y-4">
        {filters}

        {layout === "tabs" ? (
          <Tabs
            value={view}
            onValueChange={(v) => onViewChange?.(v as ResultsView)}
            className="w-full"
          >
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-muted p-1">
              <TabsTrigger
                value="list"
                className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft"
              >
                <List className="mr-1.5 size-4" />
                Station list
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-soft"
              >
                <MapIcon className="mr-1.5 size-4" />
                Map view
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-4 rounded-3xl border border-border bg-white p-4 shadow-lift dark:bg-card">
              {heading}
              {list}
            </TabsContent>
            <TabsContent value="map" className="mt-4 space-y-3">
              <div className="rounded-3xl border border-border bg-white px-4 py-3 shadow-lift dark:bg-card">
                {heading}
              </div>
              {map}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="rounded-3xl border border-border bg-white p-4 shadow-lift dark:bg-card">
              {heading}
              {list}
            </div>
            <div className="min-w-0">{map}</div>
          </div>
        )}
      </div>

      <ReviewPopup
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={reviewTarget}
        onSubmitted={() => {
          void refetchCommunity();
          void queryClient.invalidateQueries({ queryKey: ["station-community"] });
        }}
      />
    </>
  );
}

type CommunitySummary = {
  avgRating: number;
  reviewCount: number;
  trustScore: number;
};

function StationResultCard({
  station: s,
  active,
  community,
  onSelect,
  onReview,
}: {
  station: EvStation;
  active: boolean;
  community?: CommunitySummary;
  onSelect: () => void;
  onReview: () => void;
}) {
  const hasReviews = (community?.reviewCount ?? 0) > 0;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={
        "w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors " +
        (active
          ? "border-primary/50 bg-leaf/10"
          : "border-border bg-white hover:bg-surface dark:bg-background")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold">{s.name}</h3>
          {!isUnknownOperator(s.operator) ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{s.operator}</p>
          ) : null}
          <p className="mt-1 text-xs text-foreground/80">
            {s.fullAddress || s.address}
            {s.addressFromGeocode ? " · approx. address" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {s.distanceKm} km
          </span>
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
              (s.batterySwap
                ? "bg-volt-gradient text-volt-foreground"
                : "bg-secondary text-secondary-foreground")
            }
          >
            {serviceBadge(s)}
          </span>
          {s.source === "curated" ? (
            <span className="rounded-full bg-leaf/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              Our list
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {hasReviews && community ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <Star className="size-3.5 fill-current text-leaf" />
              {community.avgRating.toFixed(1)}
              <span className="font-medium text-muted-foreground">
                ({community.reviewCount} {community.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </span>
            {community.trustScore > 0 ? (
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                Trust {community.trustScore}
              </span>
            ) : null}
          </>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Star className="size-3.5" />
            No reviews yet
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Navigation className="size-3.5 text-leaf" />
          {s.distanceKm} km away
        </span>
        {s.maxPowerKw != null ? (
          <span className="inline-flex items-center gap-1">
            <BatteryCharging className="size-3.5 text-leaf" />
            {s.maxPowerKw} kW
          </span>
        ) : null}
        {s.pricePerKwh != null ? (
          <span className="inline-flex items-center gap-1">
            <IndianRupee className="size-3.5 text-leaf" />
            {s.pricePerKwh === 0 ? "Free" : `₹${s.pricePerKwh}/kWh`}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5 text-leaf" />
          {hoursLabel(s)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {connectorLabels(s).map((c) => (
          <span
            key={c}
            className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
          >
            {c}
          </span>
        ))}
        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {s.total} charging {s.total === 1 ? "point" : "points"} (guns/bays)
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {vehicleChips(s).map((chip) => (
          <span
            key={chip}
            className="rounded-md border border-leaf/30 bg-leaf/10 px-2 py-0.5 text-[11px] font-medium text-foreground"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/stations/$stationId"
          params={{ stationId: s.id }}
          onClick={(e) => {
            e.stopPropagation();
            cacheStation(s);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground hover:bg-accent"
        >
          View details
          <ArrowRight className="size-3.5" />
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReview();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/10 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-leaf/20"
        >
          <MessageSquarePlus className="size-3.5 text-leaf" />
          {hasReviews ? "Rate / review" : "Be first to review"}
        </button>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
        >
          <Navigation className="size-3.5" />
          Directions
        </a>
      </div>
    </div>
  );
}
