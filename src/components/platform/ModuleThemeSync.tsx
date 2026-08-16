import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export type ModuleTheme =
  | "chargers"
  | "routes"
  | "solar"
  | "directory"
  | "ev"
  | "marketplace"
  | "jobs"
  | "journal"
  | "aqi"
  | "default";

export function themeFromPath(pathname: string): ModuleTheme {
  if (pathname.startsWith("/route-planner")) return "routes";
  if (pathname.startsWith("/solar-calculator")) return "solar";
  if (pathname.startsWith("/air-quality")) return "aqi";
  if (pathname.startsWith("/carbon-calculator") || pathname.startsWith("/water-calculator")) {
    return "aqi";
  }
  if (pathname.startsWith("/directory")) return "directory";
  if (pathname.startsWith("/ev")) return "ev";
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/job-and-internship") || pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname === "/" || pathname.startsWith("/find-chargers") || pathname.startsWith("/chargers") || pathname.startsWith("/stations")) {
    return "chargers";
  }
  return "default";
}

/** Syncs CSS theme tokens on <html data-module="..."> when the route changes. */
export function ModuleThemeSync() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const theme = themeFromPath(pathname);
    document.documentElement.dataset["module"] = theme;
    return () => {
      // keep last theme on unmount of this component only if root remounts
    };
  }, [pathname]);

  return null;
}
