import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { isBatterySwapOnlyStation, type PlannedStop, type RouteMapPayload } from "@/data/routePlanner";

type Props = {
  map: RouteMapPayload;
  stops: PlannedStop[];
  showBatterySwap?: boolean;
  directionsHref?: string;
  directionsLabel?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function endIcon(kind: "start" | "end") {
  const bg = kind === "start" ? "#059669" : "#0f172a";
  const label = kind === "start" ? "A" : "B";
  return L.divIcon({
    className: "ev-pin",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bg};color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 12px/1 system-ui,sans-serif;box-shadow:0 6px 16px rgba(15,23,42,.28)">${label}</div>`,
  });
}

function stopIcon(n: number) {
  return L.divIcon({
    className: "ev-pin",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#d97706;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 11px/1 system-ui,sans-serif;box-shadow:0 6px 16px rgba(15,23,42,.28)">${n}</div>`,
  });
}

function plugInIcon() {
  return L.divIcon({
    className: "ev-pin",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:#0ea5e9;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(14,165,233,.45)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>`,
  });
}

function swapIcon() {
  return L.divIcon({
    className: "ev-pin",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:6px;background:#7c3aed;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 9px/1 system-ui,sans-serif;box-shadow:0 4px 12px rgba(124,58,237,.45)">SW</div>`,
  });
}

export function RoutePlanMapView({
  map,
  stops,
  showBatterySwap = false,
  directionsHref,
  directionsLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([map.origin.lat, map.origin.lng], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(m);

    mapRef.current = m;
    setMapReady(true);
    const onResize = () => m.invalidateSize();
    window.setTimeout(onResize, 80);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      m.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;

    const overlays: L.Layer[] = [];
    m.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) return;
      overlays.push(layer);
    });
    for (const layer of overlays) {
      m.removeLayer(layer);
    }

    const latLngs = map.geometry.map((p) => [p.lat, p.lng] as [number, number]);
    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: "#059669",
        weight: 5,
        opacity: 0.85,
        lineJoin: "round",
      }).addTo(m);
    }

    const corridor = (map.corridorStations ?? []).filter(
      (c) => showBatterySwap || c.planned || !isBatterySwapOnlyStation(c),
    );
    const plannedKeys = new Set(
      stops
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => `${s.lat!.toFixed(4)},${s.lng!.toFixed(4)}`),
    );

    for (const c of corridor) {
      if (c.planned) continue;
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      if (plannedKeys.has(key)) continue;

      const isSwap =
        isBatterySwapOnlyStation(c) || Boolean(c.batterySwap && c.serviceType !== "plug_in");
      if (!showBatterySwap && isSwap) continue;

      const power = c.powerKw != null ? `${c.powerKw} kW` : "Power N/A";
      const plugs = c.connectors.length ? escapeHtml(c.connectors.join(", ")) : "Connectors N/A";
      const link =
        c.id && !c.id.startsWith("planned-")
          ? `<br/><a href="/stations/${encodeURIComponent(c.id)}">View station</a>`
          : "";
      const kindLabel = isSwap
        ? `<span style="color:#7c3aed">Battery swap</span>`
        : `<span style="color:#0284c7">Plug-in charger</span>`;

      L.marker([c.lat, c.lng], {
        icon: isSwap ? swapIcon() : plugInIcon(),
        opacity: 0.95,
        zIndexOffset: isSwap ? 250 : 200,
      })
        .bindPopup(
          `<strong>${escapeHtml(c.name)}</strong><br/>${kindLabel}<br/>${escapeHtml(c.city)} · ~${c.atKm} km along route<br/>${power} · ${plugs}${link}`,
        )
        .addTo(m);
    }

    L.marker([map.origin.lat, map.origin.lng], { icon: endIcon("start") })
      .bindPopup(`<strong>Start</strong><br/>${escapeHtml(map.origin.label)}`)
      .addTo(m);
    L.marker([map.destination.lat, map.destination.lng], { icon: endIcon("end") })
      .bindPopup(`<strong>Destination</strong><br/>${escapeHtml(map.destination.label)}`)
      .addTo(m);

    stops.forEach((s, i) => {
      if (s.lat == null || s.lng == null) return;
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return;
      L.marker([s.lat, s.lng], { icon: stopIcon(i + 1), zIndexOffset: 600 })
        .bindPopup(
          `<strong>${escapeHtml(s.name)}</strong><br/>${escapeHtml(s.city)}<br/>At ${s.atKm} km · ${s.powerKw} kW<br/><em>Required charge stop</em>`,
        )
        .addTo(m);
    });

    const points: [number, number][] = [
      [map.origin.lat, map.origin.lng],
      [map.destination.lat, map.destination.lng],
      ...stops
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => [s.lat!, s.lng!] as [number, number]),
      ...corridor
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
        .map((c) => [c.lat, c.lng] as [number, number]),
    ].filter((p): p is [number, number] => Number.isFinite(p[0]) && Number.isFinite(p[1]));

    if (points.length >= 1) {
      const bounds = L.latLngBounds(points);
      m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
    window.setTimeout(() => m.invalidateSize(), 50);
  }, [map, stops, mapReady, showBatterySwap]);

  return (
    <div className="relative h-[28rem] overflow-hidden rounded-3xl border border-border bg-surface shadow-soft sm:h-[32rem] lg:h-[min(70vh,36rem)]">
      <div ref={containerRef} className="absolute inset-0 z-0 size-full" />
      {directionsHref ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <a
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
          >
            <Navigation className="size-4" />
            {directionsLabel ?? "Get directions"}
          </a>
        </div>
      ) : null}
    </div>
  );
}
