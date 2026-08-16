/**
 * Canonical list of site URLs managed in Admin → Modules & SEO → Page SEO.
 * ensureManagedPagesSeo() inserts missing rows without overwriting edits.
 */
export type ManagedPageSeo = {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  noindex?: boolean;
  group: string;
};

export const MANAGED_PAGE_SEO: ManagedPageSeo[] = [
  {
    path: "/",
    group: "Core",
    title: "EVA Green Corner — EV Charging Map, Route Planner & Green Tools India",
    description:
      "Find live EV charging stations, plan charge stops, check AQI, and use solar, carbon and water tools across India.",
    keywords: "EV charging, route planner, solar calculator, AQI, green tools India",
  },
  {
    path: "/find-chargers",
    group: "Core",
    title: "Find EV Charging Stations Near You | EVA Green Corner",
    description: "Search live EV charging stations by city, pincode or GPS across India.",
    keywords: "EV charger near me, charging stations India, CCS2, Type 2",
  },
  {
    path: "/route-planner",
    group: "Core",
    title: "EV Route Planner — charge stops, cost & time | EVA Green Corner",
    description:
      "Plan electric car trips with required charging stops based on your vehicle battery and start charge.",
    keywords: "EV route planner, charge stops, electric car trip India",
  },
  {
    path: "/solar-calculator",
    group: "Calculators",
    title: "Rooftop Solar Calculator — size, savings & payback | EVA Green Corner",
    description:
      "Estimate rooftop solar using India DISCOM tariff benchmarks and PVGIS sun hours.",
    keywords: "rooftop solar calculator, solar payback, DISCOM tariff",
  },
  {
    path: "/carbon-calculator",
    group: "Calculators",
    title: "Carbon Footprint Calculator | EVA Green Corner",
    description:
      "Estimate household and travel CO₂e and compare with a typical Indian household.",
    keywords: "carbon footprint calculator India, CO2e, household emissions",
  },
  {
    path: "/water-calculator",
    group: "Calculators",
    title: "Water Footprint Calculator | EVA Green Corner",
    description: "Estimate direct and virtual water use across home and diet.",
    keywords: "water footprint calculator, virtual water, India",
  },
  {
    path: "/air-quality",
    group: "Calculators",
    title: "Air Quality (AQI) | EVA Green Corner",
    description:
      "Check Indian National AQI by neighbourhood with pollutant breakdown and health advice.",
    keywords: "AQI India, air quality, PM2.5, National AQI",
  },
  {
    path: "/directory",
    group: "Services",
    title: "Green Services Directory | EVA Green Corner",
    description:
      "Find EV workshops, solar installers, recyclers and green service providers.",
    keywords: "EV repair, solar installer, green services directory",
  },
  {
    path: "/marketplace",
    group: "Services",
    title: "Green Lead Marketplace | EVA Green Corner",
    description: "Connect verified green demand with local service providers.",
    keywords: "green marketplace, solar leads, EV charging install",
  },
  {
    path: "/ev",
    group: "EV Store",
    title: "Electric Vehicles in India — Price, Range & Specs | EVA Green Corner",
    description:
      "Browse electric cars, scooters and commercial EVs with specs and pricing references.",
    keywords: "electric vehicles India, EV price, EV range, electric scooter",
  },
  {
    path: "/ev/compare",
    group: "EV Store",
    title: "Compare Electric Vehicles | EVA Green Corner",
    description: "Compare EV models side by side for range, battery and pricing.",
    keywords: "compare EVs India, EV comparison",
    noindex: true,
  },
  {
    path: "/job-and-internship",
    group: "Careers",
    title: "Job and Internship | EVA Green Corner",
    description: "Climate careers, renewables roles and internships in India.",
    keywords: "green jobs, climate internship, solar jobs India",
  },
  {
    path: "/journal",
    group: "Content",
    title: "Environment Journal | EVA Green Corner",
    description: "Research-backed guides, explainers and policy tracking.",
    keywords: "EV blog, environment journal, green policy India",
  },
  {
    path: "/rewards",
    group: "Account",
    title: "Green Rewards | EVA Green Corner",
    description: "Track points and redeem rewards for green actions.",
    keywords: "green rewards, eco points",
  },
  {
    path: "/login",
    group: "Account",
    title: "Login | EVA Green Corner",
    description: "Sign in to EVA Green Corner to save trips, apply for jobs and manage rewards.",
    keywords: "login, sign in",
    noindex: true,
  },
  {
    path: "/dashboard",
    group: "Account",
    title: "Dashboard | EVA Green Corner",
    description: "Your EVA Green Corner account dashboard.",
    noindex: true,
  },
  {
    path: "/chargers",
    group: "Core",
    title: "EV Chargers Map | EVA Green Corner",
    description: "Explore EV charging points on the map.",
    keywords: "EV chargers map",
    noindex: true,
  },
];

export function managedPageByPath(path: string): ManagedPageSeo | undefined {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return MANAGED_PAGE_SEO.find((p) => p.path === normalized);
}
