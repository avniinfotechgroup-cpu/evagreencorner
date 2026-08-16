import { useEffect, useState, type ComponentType } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { StationMapViewProps } from "./StationMapView";

const loadStationMapView = createClientOnlyFn(() => import("./StationMapView"));

/**
 * Loads Leaflet map only in the browser.
 */
export function StationMap(props: StationMapViewProps) {
  const [View, setView] = useState<ComponentType<StationMapViewProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pending = loadStationMapView();
    if (!pending) return;
    void pending.then((mod) => {
      if (!cancelled) setView(() => mod.StationMapView as ComponentType<StationMapViewProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!View) {
    return (
      <div className="relative grid h-[26rem] place-items-center overflow-hidden rounded-3xl border border-border bg-surface text-sm text-muted-foreground shadow-soft">
        Loading map…
      </div>
    );
  }

  return <View {...props} />;
}
