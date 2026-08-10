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
  name: env['VITE_BRAND_NAME'] ?? "Verdiq",
  tagline: env['VITE_BRAND_TAGLINE'] ?? "Charge smart. Live green.",
  defaultCountry: env['VITE_DEFAULT_COUNTRY'] ?? "IN",
  defaultCity: env['VITE_DEFAULT_CITY'] ?? "Bengaluru",
  supportEmail: env['VITE_SUPPORT_EMAIL'] ?? "hello@verdiq.example",
  mapProvider: env['VITE_MAP_PROVIDER'] ?? "static",
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
    title: "EV Charging Finder",
    description: "Live availability, connector types and tariffs near any pincode or area.",
    group: "mobility",
    status: "live",
    href: "/",
    icon: "Zap",
  },
  {
    id: "route-planner",
    title: "EV Route Planner",
    description: "Plan long drives with charge stops matched to your battery and connector.",
    group: "mobility",
    status: "beta",
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
    id: "green-home",
    title: "Green Home Score",
    description: "Rate your home on energy, water, waste and material efficiency.",
    group: "calculators",
    status: "beta",
    href: "/green-home-score",
    icon: "Home",
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
    id: "directory",
    title: "Green Services Directory",
    description: "Verified installers, recyclers, EV workshops and sustainability firms.",
    group: "marketplace",
    status: "beta",
    href: "/directory",
    icon: "Building2",
  },
  {
    id: "leads",
    title: "Lead Marketplace",
    description: "Connect verified green demand with vetted local providers.",
    group: "marketplace",
    status: "soon",
    href: "/marketplace",
    icon: "Handshake",
  },
  {
    id: "jobs",
    title: "Green Jobs & Internships",
    description: "Climate careers, apprenticeships and campus programmes.",
    group: "marketplace",
    status: "soon",
    href: "/jobs",
    icon: "Briefcase",
  },
  {
    id: "articles",
    title: "Environment Journal",
    description: "Research-backed guides, explainers and policy tracking.",
    group: "content",
    status: "soon",
    href: "/journal",
    icon: "BookOpen",
  },
  {
    id: "local",
    title: "Location Insights",
    description: "SEO landing pages for every city with local environmental data.",
    group: "content",
    status: "beta",
    href: "/locations",
    icon: "MapPinned",
  },
];

export const enabledModules = (() => {
  const list = env['VITE_ENABLED_MODULES'];
  if (!list) return PLATFORM_MODULES;
  const allow = new Set(list.split(",").map((s) => s.trim()));
  return PLATFORM_MODULES.filter((m) => allow.has(m.id));
})();
