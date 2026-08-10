import { Leaf } from "lucide-react";
import { PLATFORM_MODULES, siteConfig } from "@/config/platform";

const GROUPS: { key: string; label: string }[] = [
  { key: "mobility", label: "Mobility" },
  { key: "calculators", label: "Calculators" },
  { key: "environment", label: "Environment" },
  { key: "marketplace", label: "Marketplace" },
  { key: "content", label: "Content" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-canopy text-primary-foreground">
                <Leaf className="size-4.5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-lg font-bold">{siteConfig.name}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.tagline} A modular environmental platform — charging, air quality,
              footprints and green services in one place.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{siteConfig.supportEmail}</p>
          </div>

          {GROUPS.slice(0, 3).map((group) => (
            <div key={group.key}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {PLATFORM_MODULES.filter((m) => m.group === group.key).map((m) => (
                  <li key={m.id}>
                    <a href={m.href} className="text-sm text-surface-foreground hover:text-primary">
                      {m.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </span>
          <span>Modules are configuration-driven — new services plug into the same core.</span>
        </div>
      </div>
    </footer>
  );
}
