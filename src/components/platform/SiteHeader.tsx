import { Leaf, MapPin, Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/platform";

const NAV = [
  { label: "Charging", href: "/" },
  { label: "Route Planner", href: "/route-planner" },
  { label: "Locations", href: "/locations" },
  { label: "Solar", href: "/solar-calculator" },
  { label: "Calculators", href: "/carbon-calculator" },
  { label: "Directory", href: "/directory" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-canopy text-primary-foreground">
            <Leaf className="size-4.5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">{siteConfig.name}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <MapPin className="size-3.5 text-leaf" />
            {siteConfig.defaultCity}
          </span>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            <Bookmark className="size-4 text-leaf" />
            <span className="hidden sm:inline">My saves</span>
            {savedCount > 0 && (
              <span className="rounded-md bg-secondary px-1.5 text-[11px] text-secondary-foreground">
                {savedCount}
              </span>
            )}
          </Link>
          <a
            href="/directory"
            className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 md:inline-block"
          >
            List your station
          </a>
          <button
            type="button"
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-lg border border-border text-foreground lg:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
