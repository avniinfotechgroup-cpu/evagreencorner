import { useEffect, useState, type ComponentType } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { AqiMapViewProps } from "./AqiMapView";
import { IconicLoader } from "./IconicLoader";

const loadView = createClientOnlyFn(() => import("./AqiMapView"));

export function AqiMap(props: AqiMapViewProps) {
  const [View, setView] = useState<ComponentType<AqiMapViewProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pending = loadView();
    if (!pending) return;
    void pending.then((mod) => {
      if (!cancelled) setView(() => mod.AqiMapView as ComponentType<AqiMapViewProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!View) {
    return (
      <div className="grid h-full min-h-[calc(100vh-4rem)] w-full place-items-center bg-[#0b1220]">
        <IconicLoader size="md" label="Loading map…" />
      </div>
    );
  }

  return <View {...props} className={props.className ?? "h-full min-h-[calc(100vh-4rem)] w-full"} />;
}
