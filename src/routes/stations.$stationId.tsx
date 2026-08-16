import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BatteryCharging,
  Car,
  Clock,
  Fuel,
  IndianRupee,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Phone,
  PlugZap,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { StationMap } from "@/components/platform/StationMap";
import { LiveConnectors } from "@/components/platform/LiveConnectors";
import { SaveStationButton } from "@/components/platform/SaveStationButton";
import { StationCommunityPanel } from "@/components/platform/StationCommunityPanel";
import { ReviewPopup } from "@/components/platform/ReviewPopup";
import { getStationById } from "@/lib/ev/stations.functions";
import { cacheStation, getCachedStation } from "@/lib/ev/station-cache";
import type { EvStation, YesNoUnknown } from "@/lib/ev/types";

export const Route = createFileRoute("/stations/$stationId")({
  head: ({ params }) => ({
    meta: [
      { title: `EV charging station ${params.stationId} | ${siteConfig.name}` },
      { name: "description", content: "EV charging station details, connectors, timings and directions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StationDetail,
});

function labelYn(v: YesNoUnknown) {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "Not available";
}

function StationDetail() {
  const { stationId } = Route.useParams();
  const fetchStation = useServerFn(getStationById);
  const [station, setStation] = useState<EvStation | null>(() => getCachedStation(stationId));
  const [loading, setLoading] = useState(!getCachedStation(stationId));
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedStation(stationId);
    if (cached) {
      setStation(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void fetchStation({ data: { id: stationId } })
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          cacheStation(remote);
          setStation(remote);
          setError(null);
        } else if (!cached) {
          setError("Station not found or temporarily unavailable.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : "Could not load station details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stationId, fetchStation]);

  if (loading && !station) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading station details…
        </div>
      </Shell>
    );
  }

  if (!station) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Station not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error || "This charging point may have been removed or the link is invalid."}
          </p>
          <Link
            to="/find-chargers"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Search stations
          </Link>
        </div>
      </Shell>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving&dir_action=navigate`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

  const connectors = station.connectors.map((type, i) => {
    const bays = Math.max(
      1,
      i === station.connectors.length - 1
        ? station.total - Math.floor(station.total / Math.max(1, station.connectors.length)) * i
        : Math.floor(station.total / Math.max(1, station.connectors.length)),
    );
    const dc =
      /ccs|chademo|gb\/t|bharat dc/i.test(type) ||
      (station.maxPowerKw != null && station.maxPowerKw >= 50);
    return {
      type,
      bays,
      powerKw: station.maxPowerKw,
      kind: (dc ? "DC fast" : "AC") as "DC fast" | "AC",
    };
  });

  const serviceLabel =
    station.serviceType === "battery_swap"
      ? "Battery swap station"
      : station.serviceType === "both"
        ? "Plug-in charging + battery swap"
        : "Plug-in EV charging";

  const vehicleLines = [
    { label: "Cars / 4-wheelers", value: labelYn(station.vehicleAccess.cars) },
    { label: "EV bikes / 2-wheelers", value: labelYn(station.vehicleAccess.twoWheelers) },
    {
      label: "EV loaders / 3-wheelers",
      value: labelYn(station.vehicleAccess.threeWheelers),
    },
    { label: "Buses", value: labelYn(station.vehicleAccess.buses) },
    { label: "Trucks", value: labelYn(station.vehicleAccess.trucks) },
  ];

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Link
          to="/find-chargers"
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
                    {[
                      station.operator &&
                      station.operator.toLowerCase() !== "unknown operator"
                        ? station.operator
                        : null,
                      serviceLabel,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <h1 className="mt-1 font-display text-3xl font-bold">{station.name}</h1>
                  <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" />
                    {station.fullAddress || station.address}
                  </p>
                  {station.addressFromGeocode ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Approximate address from map coordinates (source had no street address).
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-semibold " +
                      (station.batterySwap
                        ? "bg-volt-gradient text-volt-foreground"
                        : "bg-secondary text-secondary-foreground")
                    }
                  >
                    {station.serviceType === "battery_swap"
                      ? "Battery swap"
                      : station.serviceType === "both"
                        ? "Plug-in + Battery swap"
                        : "Plug-in charging"}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Availability unknown
                  </span>
                </div>
              </div>

              <div
                className={
                  "mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border " +
                  (station.pricePerKwh != null
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3")
                }
              >
                {[
                  {
                    icon: PlugZap,
                    label: "Charging points (guns/bays)",
                    value: String(station.total),
                  },
                  ...(station.maxPowerKw != null
                    ? [
                        {
                          icon: BatteryCharging,
                          label: "Max power",
                          value: `${station.maxPowerKw} kW`,
                        },
                      ]
                    : []),
                  ...(station.pricePerKwh != null
                    ? [
                        {
                          icon: IndianRupee,
                          label: "Per unit",
                          value:
                            station.pricePerKwh === 0
                              ? "Free"
                              : `₹${station.pricePerKwh}/kWh`,
                        },
                      ]
                    : []),
                  {
                    icon: Clock,
                    label: "Timing",
                    value:
                      station.open24 === true || !station.openingHours
                        ? "24×7 open"
                        : station.openingHours,
                  },
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
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <Navigation className="size-4" />
                  Get directions
                </a>
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-leaf/40 bg-leaf/10 px-5 py-3 text-sm font-semibold text-foreground hover:bg-leaf/20"
                >
                  <MessageSquarePlus className="size-4 text-leaf" />
                  Rate / review
                </button>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-surface"
                >
                  <MapPin className="size-4 text-leaf" />
                  Open in Google Maps
                </a>
                {station.phone ? (
                  <a
                    href={`tel:${station.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-surface"
                  >
                    <Phone className="size-4 text-leaf" />
                    Call
                  </a>
                ) : null}
                <SaveStationButton stationId={station.id} name={station.name} />
              </div>
            </div>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Address</h2>
              <p className="mt-2 text-sm font-medium text-foreground">
                {station.fullAddress || station.address}
              </p>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Area: {station.area || "N/A"}</p>
                <p>City: {station.city || "N/A"}</p>
                <p>State: {station.state || "N/A"}</p>
                <p>Pincode: {station.pincode || "N/A"}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Coordinates: {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
              </p>
              {station.addressFromGeocode ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  This address was generated from GPS coordinates because the station listing did
                  not include a full street address.
                </p>
              ) : null}
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Zap className="size-4 text-leaf" />
                Service type
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{serviceLabel}</p>
              {station.batterySwap ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Battery swap is useful for EV bikes and some EV loaders / 3-wheelers — you exchange
                  a depleted pack for a charged one instead of waiting to plug in. Vendor/operator:{" "}
                  <span className="font-semibold text-foreground">{station.operator}</span>.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Plug-in charging point. Connector standards listed below.
                </p>
              )}
            </section>

            <LiveConnectors connectors={connectors} totalBays={station.total} />

            <StationCommunityPanel stationId={station.id} stationName={station.name} />

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Car className="size-4 text-leaf" />
                Vehicles supported (cars, bikes, loaders)
              </h2>
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {vehicleLines.map((row) => (
                  <li key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Based on source tags. Compatible connectors: {station.connectors.join(", ")}.
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Charges per unit</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {station.pricePerKwh != null
                  ? station.pricePerKwh === 0
                    ? "Free charging"
                    : `₹${station.pricePerKwh} per kWh`
                  : "Pricing not available from the data source."}
              </p>
              {station.pricingNote ? (
                <p className="mt-2 text-xs text-muted-foreground">Source note: {station.pricingNote}</p>
              ) : null}
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Users className="size-4 text-leaf" />
                Rush / busyness
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{station.rushNote}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We never invent rush or live occupancy without a reliable feed.
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Clock className="size-4 text-leaf" />
                EV station timing
              </h2>
              <p className="mt-3 text-sm font-semibold">
                {station.open24 === true || !station.openingHours
                  ? "24×7 open"
                  : station.openingHours}
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <Fuel className="size-4 text-leaf" />
                Petrol / Diesel / CNG at same place?
              </h2>
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {[
                  { label: "Petrol", value: labelYn(station.fuelCoLocation.petrol) },
                  { label: "Diesel", value: labelYn(station.fuelCoLocation.diesel) },
                  { label: "CNG", value: labelYn(station.fuelCoLocation.cng) },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
              {station.fuelCoLocation.fuelStationName ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Related fuel point: {station.fuelCoLocation.fuelStationName}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {station.fuelCoLocation.note ||
                  "No confirmed fuel station co-location in source data."}
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-leaf" />
                Source:{" "}
                {station.source === "openchargemap" ? "Open Charge Map" : "OpenStreetMap"}
                {station.lastUpdated
                  ? ` · Updated ${new Date(station.lastUpdated).toLocaleString()}`
                  : ""}
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <StationMap
              stations={[station]}
              activeId={station.id}
              onSelect={() => {}}
              center={{ lat: station.lat, lng: station.lng }}
              zoom={16}
            />
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-base font-bold">Directions</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Opens Google Maps turn-by-turn navigation to this charger.
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-volt-gradient px-4 py-3 text-sm font-semibold text-volt-foreground"
              >
                <Navigation className="size-4" />
                Navigate with Google Maps
              </a>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-base font-bold">Heading further?</h2>
              <Link
                to="/route-planner"
                search={{ from: undefined, to: undefined, vehicle: undefined, soc: undefined }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface"
              >
                <Zap className="size-4 text-leaf" />
                Open route planner
              </Link>
            </div>
          </div>
        </div>
      </main>
      <ReviewPopup
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={{ stationId: station.id, stationName: station.name }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
