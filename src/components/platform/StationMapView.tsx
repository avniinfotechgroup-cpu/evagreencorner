import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EvStation } from "@/lib/ev/types";

/** Cars/SUVs use plug-in; scooters/3W may use battery swap. */
export type VehicleChargeMode = "plug_in" | "battery_swap";

export interface StationMapViewProps {
  stations: EvStation[];
  activeId: string;
  onSelect: (id: string) => void;
  center?: { lat: number; lng: number } | undefined;
  radiusKm?: number;
  zoom?: number;
  /** Same as list: hide swap-only pins for cars; show swap pins for 2W/3W mode */
  vehicleMode?: VehicleChargeMode;
}

function isSwapStation(station: EvStation) {
  return station.serviceType === "battery_swap" || station.serviceType === "both"
    ? station.serviceType === "battery_swap"
    : station.batterySwap;
}

function pinIcon(active: boolean, station: EvStation) {
  const swap = isSwapStation(station);
  const bg = active
    ? "#0f172a"
    : swap
      ? "#7c3aed"
      : station.maxPowerKw != null && station.maxPowerKw >= 50
        ? "#059669"
        : "#0ea5e9";
  const size = active ? 34 : 28;
  const label = swap
    ? "SW"
    : station.maxPowerKw == null
      ? "EV"
      : station.maxPowerKw >= 100
        ? "DC"
        : station.maxPowerKw >= 50
          ? "F"
          : "AC";
  const radius = swap ? "6px" : "9999px";

  return L.divIcon({
    className: "ev-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:${radius};
      background:${bg};color:#fff;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font:700 10px/1 system-ui,sans-serif;
      box-shadow:0 6px 16px rgba(15,23,42,.28);
    ">${label}</div>`,
  });
}

export function StationMapView({
  stations,
  activeId,
  onSelect,
  center,
  radiusKm,
  zoom = 13,
  vehicleMode = "plug_in",
}: StationMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const visibleStations = useMemo(() => {
    if (vehicleMode === "battery_swap") {
      return stations.filter((s) => s.batterySwap || s.serviceType !== "plug_in");
    }
    return stations.filter((s) => s.serviceType !== "battery_swap");
  }, [stations, vehicleMode]);

  const active = visibleStations.find((s) => s.id === activeId) ?? visibleStations[0];
  const mapCenter =
    center ?? (active ? { lat: active.lat, lng: active.lng } : { lat: 20.5937, lng: 78.9629 });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([mapCenter.lat, mapCenter.lng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.setTimeout(onResize, 80);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (center && radiusKm) {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: "#059669",
        fillColor: "#059669",
        fillOpacity: 0.08,
        weight: 1.5,
      }).addTo(map);
    }

    for (const station of visibleStations) {
      const swap = isSwapStation(station);
      const marker = L.marker([station.lat, station.lng], {
        icon: pinIcon(station.id === activeId, station),
        title: station.name,
      });
      marker.on("click", () => onSelectRef.current(station.id));
      marker.bindPopup(
        `<strong>${station.name}</strong><br/>${
          swap ? "Battery swap · " : "Plug-in · "
        }${station.distanceKm} km · ${station.connectors.slice(0, 2).join(", ")}`,
      );
      group.addLayer(marker);
    }

    map.invalidateSize();

    if (visibleStations.length > 0) {
      const bounds = L.latLngBounds(
        visibleStations.map((s) => [s.lat, s.lng] as [number, number]),
      );
      if (center) bounds.extend([center.lat, center.lng]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else if (center) {
      map.setView([center.lat, center.lng], zoomForRadius(radiusKm ?? 10));
    }
  }, [visibleStations, activeId, center, radiusKm, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    map.panTo([active.lat, active.lng]);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative z-0 isolate h-[26rem] overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
      <div ref={containerRef} className="absolute inset-0 z-0 size-full" />

      {active && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10">
          <div className="pointer-events-auto rounded-2xl border border-border bg-white p-4 shadow-lift dark:bg-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{active.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {active.distanceKm} km ·{" "}
                  {active.maxPowerKw != null ? `${active.maxPowerKw} kW` : "Power N/A"} ·{" "}
                  {active.connectors.slice(0, 2).join(", ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${active.lat},${active.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-primary px-3.5 py-2 text-center text-xs font-semibold text-primary-foreground"
                >
                  Directions
                </a>
                <a
                  href={`/stations/${encodeURIComponent(active.id)}`}
                  className="rounded-xl border border-border bg-white px-3.5 py-2 text-center text-xs font-semibold dark:bg-card"
                >
                  Details
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function zoomForRadius(radiusKm: number) {
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}
