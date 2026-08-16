import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usAqiCategory, type AqiMapPin } from "@/data/aqi";

export type AqiMapViewProps = {
  lat: number;
  lng: number;
  pins: AqiMapPin[];
  onSelectPin?: (pin: AqiMapPin) => void;
  className?: string;
};

function pinHtml(aqi: number) {
  const accent = usAqiCategory(aqi).accent;
  return `<div style="
    width:44px;height:44px;border-radius:9999px;
    display:grid;place-items:center;
    background:${accent};
    color:#fff;font-weight:700;font-size:13px;
    border:3px solid rgba(255,255,255,0.92);
    box-shadow:0 8px 20px rgba(0,0,0,0.45);
    font-family:inherit;
  ">${aqi}</div>`;
}

export function AqiMapView({ lat, lng, pins, onSelectPin, className }: AqiMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectPin);
  onSelectRef.current = onSelectPin;

  // Create map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([lat, lng], 11);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const invalidate = () => map.invalidateSize({ animate: false });
    const t1 = window.setTimeout(invalidate, 50);
    const t2 = window.setTimeout(invalidate, 300);
    const t3 = window.setTimeout(invalidate, 800);
    window.addEventListener("resize", invalidate);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => invalidate())
        : null;
    ro?.observe(el);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", invalidate);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  // Pan when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], map.getZoom() || 11, { animate: true });
    window.setTimeout(() => map.invalidateSize({ animate: false }), 100);
  }, [lat, lng]);

  // Pins
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    for (const pin of pins) {
      const icon = L.divIcon({
        className: "aqi-map-pin",
        html: pinHtml(pin.aqi),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon });
      marker.bindTooltip(`${pin.label}: ${pin.aqi} AQI`, {
        direction: "top",
        offset: [0, -18],
      });
      marker.on("click", () => onSelectRef.current?.(pin));
      marker.addTo(layer);
    }

    if (pins.length > 1) {
      try {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.35), { maxZoom: 12, animate: true });
      } catch {
        /* ignore */
      }
    }
  }, [pins]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full"}
      style={{ minHeight: "100%" }}
      aria-label="Air quality map"
    />
  );
}
