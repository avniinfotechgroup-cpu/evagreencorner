import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Code2,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Leaf,
  Menu,
  Plus,
  Shield,
  Store,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/platform";

export type AdminTab =
  | "stations"
  | "add"
  | "import"
  | "directory"
  | "ev"
  | "marketplace"
  | "jobs"
  | "journal"
  | "home"
  | "cms"
  | "scripts"
  | "nav"
  | "redeems";

type NavItem = {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Charging",
    items: [
      { id: "stations", label: "Station list", icon: Zap },
      { id: "add", label: "Add station", icon: Plus },
      { id: "import", label: "Import Excel/CSV", icon: FileSpreadsheet },
    ],
  },
  {
    label: "EV services",
    items: [{ id: "directory", label: "Manage EV services", icon: Wrench }],
  },
  {
    label: "Catalog",
    items: [
      { id: "ev", label: "EV vehicles", icon: LayoutDashboard },
      { id: "marketplace", label: "Marketplace", icon: Store },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "home", label: "Home page", icon: Home },
      { id: "jobs", label: "Job and Internship", icon: Briefcase },
      { id: "journal", label: "Blog", icon: BookOpen },
      { id: "cms", label: "Modules & SEO", icon: Leaf },
      { id: "scripts", label: "Analytics & scripts", icon: Code2 },
      { id: "nav", label: "Menu visibility", icon: Menu },
    ],
  },
  {
    label: "Finance",
    items: [{ id: "redeems", label: "Cash redeems", icon: Shield }],
  },
];

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  stations: {
    title: "Station list",
    subtitle: "Search, filter, paginate and bulk-manage curated chargers.",
  },
  add: {
    title: "Add station",
    subtitle: "Create a single curated charging station.",
  },
  import: {
    title: "Import stations",
    subtitle: "Upload Excel or CSV to add multiple stations.",
  },
  directory: {
    title: "Manage EV services",
    subtitle: "Categories, SEO, Excel import, filters and bulk delete.",
  },
  ev: {
    title: "EV vehicles",
    subtitle: "Brands, models, publish status and imports.",
  },
  marketplace: {
    title: "Marketplace",
    subtitle: "Providers, leads and verification.",
  },
  home: {
    title: "Home page CMS",
    subtitle: "Edit hero, intro, modules copy, popular areas, FAQs and bottom CTA.",
  },
  jobs: {
    title: "Job and Internship",
    subtitle: "Add manually or Excel, filter, paginate and bulk-manage listings.",
  },
  journal: {
    title: "Blog",
    subtitle: "Add or edit posts, Yoast-style SEO, Excel import, filters and bulk delete.",
  },
  cms: {
    title: "Modules & SEO",
    subtitle: "Manage SEO for every URL — title, description, keywords — plus modules.",
  },
  scripts: {
    title: "Analytics & scripts",
    subtitle: "Google Analytics, Tag Manager, custom head/body tags and JSON-LD schema.",
  },
  nav: {
    title: "Menu visibility",
    subtitle: "Show or hide EV services / Green services and their categories.",
  },
  redeems: {
    title: "Cash redeems",
    subtitle: "Approve or reject reward cashouts.",
  },
};

type Stats = {
  stations?: number;
  activeStations?: number;
  directory?: number;
  evs?: number;
  pendingRedeems?: number;
};

type Props = {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  stats?: Stats;
  children: ReactNode;
};

export function AdminShell({ tab, onTabChange, stats, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = TAB_TITLES[tab];

  const Nav = (
    <nav className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground">{siteConfig.name}</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-surface hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-90" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {(stats?.stations != null || stats?.directory != null) && (
        <div className="space-y-1.5 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          {stats.stations != null ? <p>Stations: {stats.stations}</p> : null}
          {stats.activeStations != null ? <p>Active: {stats.activeStations}</p> : null}
          {stats.directory != null ? <p>EV services: {stats.directory}</p> : null}
          {stats.evs != null ? <p>Published EVs: {stats.evs}</p> : null}
          {stats.pendingRedeems != null ? (
            <p>Pending redeems: {stats.pendingRedeems}</p>
          ) : null}
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface/40">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
          {Nav}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-bold">Menu</p>
                <button
                  type="button"
                  className="rounded-lg border border-border p-1.5"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)] overflow-y-auto">{Nav}</div>
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-wrap items-start gap-3">
              <button
                type="button"
                className="mt-0.5 inline-flex rounded-xl border border-border p-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin menu"
              >
                <Menu className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl font-bold sm:text-2xl">{meta.title}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{meta.subtitle}</p>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
