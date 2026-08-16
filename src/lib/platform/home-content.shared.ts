import { POPULAR_AREAS } from "@/data/stations";

export type HomeFaq = { q: string; a: string };

export type HomePopularArea = {
  name: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
};

export type HomeContent = {
  heroTagline: string;
  heroHeadline: string;
  heroSubcopy: string;
  heroImageUrl: string;
  heroImageAlt: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  introHeading: string;
  introBody: string;
  modulesEyebrow: string;
  modulesHeading: string;
  modulesBody: string;
  popularEyebrow: string;
  popularHeading: string;
  popularBody: string;
  popularCtaLabel: string;
  popularAreas: HomePopularArea[];
  faqHeading: string;
  faqs: HomeFaq[];
  bottomHeading: string;
  bottomBody: string;
  bottomPrimaryLabel: string;
  bottomPrimaryHref: string;
  bottomSecondaryLabel: string;
  bottomSecondaryHref: string;
  updatedAt: string;
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroTagline: "Your green corner for EV & clean living.",
  heroHeadline: "EVA Green Corner",
  heroSubcopy:
    "India's map for trusted EV charging, smarter routes, cleaner air insights and practical green calculators — built for drivers, fleets and homes.",
  heroImageUrl: "",
  heroImageAlt: "EV charging and green mobility across India",
  primaryCtaLabel: "Find chargers near me",
  primaryCtaHref: "/find-chargers",
  secondaryCtaLabel: "Plan an EV route",
  secondaryCtaHref: "/route-planner",
  introHeading: "One platform for EV charging and greener living",
  introBody:
    "Whether you need a CCS2 charger in Bengaluru, a Delhi–Jaipur charge plan, rooftop solar sizing, or a quick AQI check before an outdoor stop — EVA Green Corner brings mobility and environment tools together with clear, crawlable pages Google and users can trust.",
  modulesEyebrow: "One platform, many modules",
  modulesHeading: "Everything green, under one roof",
  modulesBody:
    "Each module is registered in a single configuration file, so new calculators, directories or content systems plug in without touching the core.",
  popularEyebrow: "Popular cities & areas",
  popularHeading: "Popular areas near you",
  popularBody: "Jump into a neighbourhood — each link opens live charging stations nearby.",
  popularCtaLabel: "Search any city",
  popularAreas: POPULAR_AREAS.map((a) => ({ ...a })),
  faqHeading: "Frequently asked questions",
  faqs: [
    {
      q: "What is EVA Green Corner?",
      a: "EVA Green Corner is an India-focused platform to find EV charging stations, plan routes with charge stops, check air quality, and use solar, carbon and water calculators — plus EV listings, green jobs and services.",
    },
    {
      q: "How do I find EV charging stations near me?",
      a: "Open Find chargers, enter a city or pincode, or use current location. Results show live stations on a list and map with connectors and distance.",
    },
    {
      q: "Is the charging station data real?",
      a: "Yes. Station locations come from live OpenStreetMap and Open Charge Map sources — not fake availability claims.",
    },
    {
      q: "Can I plan a long EV trip?",
      a: "Use the EV Route Planner: set origin, destination, vehicle and battery %, then get suggested charge stops and a Google Maps directions link.",
    },
    {
      q: "Does EVA Green Corner show air quality?",
      a: "Yes. The Air Quality page shows live AQI, pollutants and weather for Indian cities to help you plan outdoor stops.",
    },
  ],
  bottomHeading: "Ready to find a charger or plan your next EV trip?",
  bottomBody:
    "Start with live stations near you, then use route, AQI and calculator tools to drive cleaner.",
  bottomPrimaryLabel: "Find chargers",
  bottomPrimaryHref: "/find-chargers",
  bottomSecondaryLabel: "Check air quality",
  bottomSecondaryHref: "/air-quality",
  updatedAt: "",
};

export function normalizeHomeContent(input: Partial<HomeContent>): HomeContent {
  const d = DEFAULT_HOME_CONTENT;
  const areas = Array.isArray(input.popularAreas) ? input.popularAreas : d.popularAreas;
  const faqs = Array.isArray(input.faqs) ? input.faqs : d.faqs;
  return {
    heroTagline: String(input.heroTagline ?? d.heroTagline).slice(0, 120),
    heroHeadline: String(input.heroHeadline ?? d.heroHeadline).slice(0, 160),
    heroSubcopy: String(input.heroSubcopy ?? d.heroSubcopy).slice(0, 600),
    heroImageUrl: String(input.heroImageUrl ?? d.heroImageUrl).slice(0, 500),
    heroImageAlt: String(input.heroImageAlt ?? d.heroImageAlt).slice(0, 200),
    primaryCtaLabel: String(input.primaryCtaLabel ?? d.primaryCtaLabel).slice(0, 80),
    primaryCtaHref: String(input.primaryCtaHref ?? d.primaryCtaHref).slice(0, 200),
    secondaryCtaLabel: String(input.secondaryCtaLabel ?? d.secondaryCtaLabel).slice(0, 80),
    secondaryCtaHref: String(input.secondaryCtaHref ?? d.secondaryCtaHref).slice(0, 200),
    introHeading: String(input.introHeading ?? d.introHeading).slice(0, 200),
    introBody: String(input.introBody ?? d.introBody).slice(0, 1200),
    modulesEyebrow: String(input.modulesEyebrow ?? d.modulesEyebrow).slice(0, 80),
    modulesHeading: String(input.modulesHeading ?? d.modulesHeading).slice(0, 200),
    modulesBody: String(input.modulesBody ?? d.modulesBody).slice(0, 600),
    popularEyebrow: String(input.popularEyebrow ?? d.popularEyebrow).slice(0, 80),
    popularHeading: String(input.popularHeading ?? d.popularHeading).slice(0, 200),
    popularBody: String(input.popularBody ?? d.popularBody).slice(0, 600),
    popularCtaLabel: String(input.popularCtaLabel ?? d.popularCtaLabel).slice(0, 80),
    popularAreas: areas
      .slice(0, 24)
      .map((a) => ({
        name: String(a?.name ?? "").slice(0, 80),
        city: String(a?.city ?? "").slice(0, 80),
        pincode: String(a?.pincode ?? "").slice(0, 12),
        lat: Number(a?.lat) || 0,
        lng: Number(a?.lng) || 0,
      }))
      .filter((a) => a.name && a.city),
    faqHeading: String(input.faqHeading ?? d.faqHeading).slice(0, 200),
    faqs: faqs
      .slice(0, 20)
      .map((f) => ({
        q: String(f?.q ?? "").slice(0, 240),
        a: String(f?.a ?? "").slice(0, 1200),
      }))
      .filter((f) => f.q && f.a),
    bottomHeading: String(input.bottomHeading ?? d.bottomHeading).slice(0, 200),
    bottomBody: String(input.bottomBody ?? d.bottomBody).slice(0, 600),
    bottomPrimaryLabel: String(input.bottomPrimaryLabel ?? d.bottomPrimaryLabel).slice(0, 80),
    bottomPrimaryHref: String(input.bottomPrimaryHref ?? d.bottomPrimaryHref).slice(0, 200),
    bottomSecondaryLabel: String(input.bottomSecondaryLabel ?? d.bottomSecondaryLabel).slice(0, 80),
    bottomSecondaryHref: String(input.bottomSecondaryHref ?? d.bottomSecondaryHref).slice(0, 200),
    updatedAt: String(input.updatedAt ?? ""),
  };
}
