import * as Icons from "lucide-react";
import { enabledModules, type PlatformModule } from "@/config/platform";

const STATUS_STYLE: Record<PlatformModule["status"], string> = {
  live: "bg-volt-gradient text-volt-foreground",
  beta: "bg-sky/20 text-foreground",
  soon: "bg-muted text-muted-foreground",
};

function ModuleIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Sparkles;
  return <Icon className="size-5" strokeWidth={2} />;
}

export function ModuleGrid() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Icons.LayoutGrid className="size-3.5 text-leaf" />
            One platform, many modules
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold">
            Everything green, under one roof
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each module is registered in a single configuration file, so new calculators,
            directories or content systems plug in without touching the core.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {enabledModules.map((m) => (
            <a
              key={m.id}
              href={m.href}
              className="group flex gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ModuleIcon name={m.icon} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-bold">{m.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[m.status]}`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {m.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
