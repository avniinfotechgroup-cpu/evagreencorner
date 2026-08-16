import type { LucideIcon } from "lucide-react";
import {
  Battery,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  ChevronDown,
  Droplets,
  Factory,
  Footprints,
  Leaf,
  Recycle,
  Route as RouteIcon,
  Sun,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";

export type NavHref =
  | "/"
  | "/find-chargers"
  | "/route-planner"
  | "/solar-calculator"
  | "/directory"
  | "/marketplace"
  | "/marketplace/category/$slug"
  | "/ev"
  | "/job-and-internship"
  | "/journal"
  | "/carbon-calculator";

export type NavChild = {
  /** Stable id for admin visibility toggles */
  id: string;
  label: string;
  title: string;
  href: NavHref;
  params?: { slug: string };
  search?: Record<string, string>;
  icon: LucideIcon;
};

export type NavItem = {
  id: string;
  label: string;
  title: string;
  href: NavHref;
  params?: { slug: string };
  icon: LucideIcon;
  /** Dropdown children (EV Services / Green Services) */
  children?: NavChild[];
};

/**
 * Primary site menu — EVA Green Corner
 * Matches product IA: tools + EV Services + Green Services + store/jobs/blog.
 */
export const MAIN_NAV: NavItem[] = [
  {
    id: "find-chargers",
    label: "Find chargers",
    title: "Find EV charging stations near you",
    href: "/find-chargers",
    icon: Zap,
  },
  {
    id: "route-planner",
    label: "Route planner",
    title: "EV route planner with charge stops",
    href: "/route-planner",
    icon: RouteIcon,
  },
  {
    id: "solar-calculator",
    label: "Solar calculator",
    title: "Rooftop solar calculator",
    href: "/solar-calculator",
    icon: Sun,
  },
  {
    id: "ev-services",
    label: "EV services",
    title: "EV repair, dealers, battery, conversion & charging install",
    href: "/directory",
    icon: Wrench,
    children: [
      {
        id: "ev_repair",
        label: "EV Repair",
        title: "EV workshops and repair",
        href: "/directory",
        search: { category: "ev_repair" },
        icon: Wrench,
      },
      {
        id: "ev_store",
        label: "EV Store",
        title: "Electric vehicle store — cars, scooters & dealers",
        href: "/directory",
        search: { category: "ev_store" },
        icon: Car,
      },
      {
        id: "ev_battery",
        label: "EV Battery",
        title: "EV battery & storage solutions",
        href: "/directory",
        search: { category: "ev_battery" },
        icon: Battery,
      },
      {
        id: "ev_conversion",
        label: "EV Conversion",
        title: "Vehicle EV conversion services",
        href: "/directory",
        search: { category: "ev_conversion" },
        icon: Factory,
      },
      {
        id: "charging_installation",
        label: "Charging Installation",
        title: "Home & workplace EV charger installation",
        href: "/directory",
        search: { category: "charging_installation" },
        icon: Zap,
      },
    ],
  },
  {
    id: "green-services",
    label: "Green services",
    title: "Solar, recycling, water, ESG and green building",
    href: "/marketplace",
    icon: Leaf,
    children: [
      {
        id: "solar",
        label: "Solar",
        title: "Solar design, install and O&M",
        href: "/marketplace/category/$slug",
        params: { slug: "solar" },
        icon: Sun,
      },
      {
        id: "recycling-pickup",
        label: "Recycling",
        title: "Recycling pickup and dry waste",
        href: "/marketplace/category/$slug",
        params: { slug: "recycling-pickup" },
        icon: Recycle,
      },
      {
        id: "waste-management",
        label: "Waste Management",
        title: "Waste management solutions",
        href: "/marketplace/category/$slug",
        params: { slug: "waste-management" },
        icon: Trash2,
      },
      {
        id: "water-solutions",
        label: "Water Management",
        title: "Rainwater, greywater and water efficiency",
        href: "/marketplace/category/$slug",
        params: { slug: "water-solutions" },
        icon: Droplets,
      },
      {
        id: "energy-audit",
        label: "Energy Efficiency",
        title: "Home and industrial energy audits",
        href: "/marketplace/category/$slug",
        params: { slug: "energy-audit" },
        icon: Zap,
      },
      {
        id: "green-consulting",
        label: "Carbon & ESG",
        title: "Carbon footprint and ESG / net-zero advisory",
        href: "/marketplace/category/$slug",
        params: { slug: "green-consulting" },
        icon: Footprints,
      },
      {
        id: "green-building",
        label: "Green Building",
        title: "Green building consulting and ratings",
        href: "/marketplace/category/$slug",
        params: { slug: "green-building" },
        icon: Building2,
      },
    ],
  },
  {
    id: "jobs",
    label: "Job and Internship",
    title: "Green jobs and internships",
    href: "/job-and-internship",
    icon: Briefcase,
  },
  {
    id: "blog",
    label: "EV Green Blog",
    title: "EV Green Blog — guides and policy",
    href: "/journal",
    icon: BookOpen,
  },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.children?.length) {
    if (item.id === "ev-services" && (pathname === "/directory" || pathname.startsWith("/directory/"))) {
      return true;
    }
    if (item.id === "green-services" && pathname === "/marketplace") {
      return true;
    }
    return item.children.some((c) => isNavChildActive(pathname, c));
  }
  return pathMatches(pathname, item.href, item.params?.slug);
}

export function isNavChildActive(pathname: string, child: NavChild): boolean {
  return pathMatches(pathname, child.href, child.params?.slug);
}

function pathMatches(pathname: string, href: string, slug?: string) {
  if (href === "/find-chargers") {
    return (
      pathname === "/" ||
      pathname === "/find-chargers" ||
      pathname.startsWith("/chargers") ||
      pathname.startsWith("/stations")
    );
  }
  if (href === "/marketplace/category/$slug" && slug) {
    return pathname === `/marketplace/category/${slug}` || pathname.startsWith(`/marketplace/category/${slug}/`);
  }
  if (href === "/marketplace") {
    return pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  }
  if (href === "/ev") {
    return pathname === "/ev" || pathname.startsWith("/ev/");
  }
  if (href === "/directory") {
    return pathname === "/directory" || pathname.startsWith("/directory/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Chevron used in dropdown triggers */
export const NavChevron = ChevronDown;
