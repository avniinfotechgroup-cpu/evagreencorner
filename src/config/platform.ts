/**
 * Central platform configuration.
 *
 * Every module of the platform is registered here. Adding a new module
 * (calculator, directory, content system, marketplace...) means adding one
 * entry to `PLATFORM_MODULES` — no core code changes required.
 *
 * Values can be overridden per environment via Vite env vars, e.g.
 *   VITE_BRAND_NAME="EcoGrid"
 *   VITE_ENABLED_MODULES="ev-finder,route-planner,aqi"
 */

const env = import.meta.env as Record<string, string | undefined>;

export const siteConfig = {
  name: env["VITE_BRAND_NAME"] ?? "EVA Green Corner",
  tagline: env["VITE_BRAND_TAGLINE"] ?? "Your green corner for EV & clean living.",
  defaultCountry: env["VITE_DEFAULT_COUNTRY"] ?? "IN",
  defaultCity: env["VITE_DEFAULT_CITY"] ?? "Bengaluru",
  supportEmail: env["VITE_SUPPORT_EMAIL"] ?? "hello@evagreencorner.com",
  appUrl: env["VITE_APP_URL"] ?? "https://evagreencorner.com",
  mapProvider: env["VITE_MAP_PROVIDER"] ?? "static",
};

export type ModuleStatus = "live" | "beta" | "soon";
export type ModuleGroup = "mobility" | "environment" | "calculators" | "marketplace" | "content";

export interface PlatformModule {
  id: string;
  title: string;
  description: string;
  group: ModuleGroup;
  status: ModuleStatus;
  href: string;
  icon: string;
}

/** Registry — append to extend the platform. */
export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: "ev-finder",
    title: "Find Charging Stations",
    description: "Connector types, tariffs and station details near any pincode or area.",
    group: "mobility",
    status: "live",
    href: "/find-chargers",
    icon: "Zap",
  },
  {
    id: "route-planner",
    title: "EV Route Planner",
    description: "Plan long drives with charge stops matched to your battery and connector.",
    group: "mobility",
    status: "live",
    href: "/route-planner",
    icon: "Route",
  },
  {
    id: "aqi",
    title: "Air Quality (AQI)",
    description: "Hyper-local pollutant breakdown, forecasts and health advisories.",
    group: "environment",
    status: "live",
    href: "/air-quality",
    icon: "Wind",
  },
  {
    id: "carbon",
    title: "Carbon Footprint",
    description: "Measure household and travel emissions, then track them down.",
    group: "calculators",
    status: "live",
    href: "/carbon-calculator",
    icon: "Footprints",
  },
  {
    id: "water",
    title: "Water Footprint",
    description: "Direct and virtual water use across diet, home and lifestyle.",
    group: "calculators",
    status: "live",
    href: "/water-calculator",
    icon: "Droplets",
  },
  {
    id: "directory",
    title: "EV Services",
    description: "EV repair, dealers, battery, conversion and charging installation partners.",
    group: "marketplace",
    status: "live",
    href: "/directory",
    icon: "Wrench",
  },
  {
    id: "green-services",
    title: "Green Services",
    description: "Solar, recycling, waste, water, energy efficiency, ESG and green building.",
    group: "marketplace",
    status: "live",
    href: "/marketplace",
    icon: "Leaf",
  },
  {
    id: "solar",
    title: "Solar Calculator",
    description: "Rooftop potential, payback period and subsidy estimates by location.",
    group: "calculators",
    status: "live",
    href: "/solar-calculator",
    icon: "Sun",
  },
  {
    id: "ev-vehicles",
    title: "Electric Vehicle Store",
    description:
      "Electric cars, scooters, autos, buses and commercial EVs — price, range and specs.",
    group: "mobility",
    status: "live",
    href: "/ev",
    icon: "Car",
  },
  {
    id: "leads",
    title: "Lead Marketplace",
    description: "Connect verified green demand with vetted local providers.",
    group: "marketplace",
    status: "live",
    href: "/marketplace",
    icon: "Handshake",
  },
  {
    id: "jobs",
    title: "Job and Internship",
    description: "Climate careers, apprenticeships and campus programmes.",
    group: "marketplace",
    status: "live",
    href: "/job-and-internship",
    icon: "Briefcase",
  },
  {
    id: "articles",
    title: "EV Green Blog",
    description: "Research-backed guides, explainers and policy tracking.",
    group: "content",
    status: "live",
    href: "/journal",
    icon: "BookOpen",
  },
];

export const enabledModules = (() => {
  const list = env['VITE_ENABLED_MODULES'];
  if (!list) return PLATFORM_MODULES;
  const allow = new Set(list.split(",").map((s) => s.trim()));
  return PLATFORM_MODULES.filter((m) => allow.has(m.id));
})();
