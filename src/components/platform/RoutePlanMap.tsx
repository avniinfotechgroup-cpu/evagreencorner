import { useEffect, useState, type ComponentType } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { PlannedStop, RouteMapPayload } from "@/data/routePlanner";

export type RoutePlanMapProps = {
  map: RouteMapPayload;
  stops: PlannedStop[];
  /** When false, battery-swap-only pins are hidden (cars like Nexon). */
  showBatterySwap?: boolean;
  /** Google Maps directions URL — shown as a bottom-center map CTA when set. */
  directionsHref?: string;
  directionsLabel?: string;
};

const loadView = createClientOnlyFn(() => import("./RoutePlanMapView"));

export function RoutePlanMap(props: RoutePlanMapProps) {
  const [View, setView] = useState<ComponentType<RoutePlanMapProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pending = loadView();
    if (!pending) return;
    void pending.then((mod) => {
      if (!cancelled) setView(() => mod.RoutePlanMapView as ComponentType<RoutePlanMapProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!View) {
    return (
      <div className="grid h-[28rem] place-items-center rounded-3xl border border-border bg-surface text-sm text-muted-foreground shadow-soft lg:h-[min(70vh,36rem)]">
        Loading route map…
      </div>
    );
  }

  return <View {...props} />;
}
