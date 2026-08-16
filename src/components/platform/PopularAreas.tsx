import { ArrowUpRight, TrendingUp, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { POPULAR_AREAS } from "@/data/stations";
import type { HomePopularArea } from "@/lib/platform/home-content.shared";

type Props = {
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  areas?: HomePopularArea[];
};

export function PopularAreas({
  eyebrow = "Popular cities & areas",
  heading = "Popular areas near you",
  body = "Jump into a neighbourhood — each link opens live charging stations nearby.",
  ctaLabel = "Search any city",
  areas,
}: Props) {
  const list = areas?.length ? areas : POPULAR_AREAS;

  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
          <TrendingUp className="size-3.5 text-leaf" />
          {eyebrow}
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold">{heading}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
        <Link
          to="/find-chargers"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-surface"
        >
          {ctaLabel}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((area) => (
          <Link
            key={`${area.name}-${area.city}-${area.pincode}`}
            to="/chargers"
            search={{
              lat: area.lat,
              lng: area.lng,
              q: `${area.name}, ${area.city}`,
              radius: 8,
              view: "list",
            }}
            className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-bold">{area.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {area.city} · {area.pincode}
                </p>
              </div>
              <Zap className="size-4 text-leaf transition-transform group-hover:scale-110" />
            </div>
            <p className="mt-5 text-sm font-semibold text-primary">View live chargers →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
