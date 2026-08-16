import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Battery,
  Car,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getEvHome } from "@/lib/vehicles/public.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Electric Vehicles in India — Price, Range & Specs | ${siteConfig.name}`;
const DESCRIPTION =
  "Explore electric cars, bikes, scooters, autos, buses and commercial EVs in India. Compare price, battery, claimed range and specifications from our verified database.";

export const Route = createFileRoute("/ev/")({
  loader: () => loadPageSeo("/ev"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({ title: TITLE, description: DESCRIPTION, path: "/ev" }),
  component: EvHomePage,
});

function EvHomePage() {
  const loadHome = useServerFn(getEvHome);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadHome>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await loadHome();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load EV catalogue");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHome]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 text-center">
            <BannerMenu />
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <Car className="size-3.5" />
              Indian EV guide
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Electric vehicles in India
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Cars, scooters, autos, buses and commercial EVs — price, battery, claimed
              range and specs from our own database.
            </p>
            <div className="mt-4">
              <Link
                to="/ev/compare"
                className="inline-flex rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20"
              >
                Compare vehicles
              </Link>
            </div>

            <form
              className="mx-auto mt-7 flex max-w-xl gap-2 rounded-2xl border border-border/50 bg-card p-2 text-left shadow-lift"
              onSubmit={(e) => {
                e.preventDefault();
                const slug = data?.topCategories[0]?.slug ?? "electric-cars";
                window.location.href = `/ev/${slug}?q=${encodeURIComponent(q.trim())}`;
              }}
            >
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <Search className="size-4 text-leaf" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search Tata Nexon, Ola S1, Ather…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search electric vehicles"
                />
              </label>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Search
              </button>
            </form>

            {data ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-primary-foreground/85">
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.vehicles} vehicles
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.brands} brands
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.categories} categories
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-destructive">{error}</p>
        ) : null}

        {!data && !error ? (
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading EV catalogue…
          </p>
        ) : null}

        {data ? (
          <>
            <section className="mx-auto max-w-6xl px-5 py-12">
              <h2 className="font-display text-2xl font-bold">Browse by category</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Database-driven categories — new types can be added from Admin without code
                changes.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.topCategories.map((c) => (
                  <Link
                    key={c.id}
                    to="/ev/$categorySlug"
                    params={{ categorySlug: c.slug }}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                        <Battery className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-display text-sm font-bold">{c.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {c.description}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold text-leaf">
                          {c.vehicleCount} listed
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="border-y border-border bg-surface">
              <div className="mx-auto max-w-6xl px-5 py-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="size-3.5 text-leaf" /> Featured
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold">
                      Popular electric vehicles
                    </h2>
                  </div>
                  <Link
                    to="/ev/$categorySlug"
                    params={{ categorySlug: "electric-cars" }}
                    className="text-xs font-semibold text-leaf hover:underline"
                  >
                    View all cars
                  </Link>
                </div>
                {data.featured.length === 0 ? (
                  <p className="mt-8 text-sm text-muted-foreground">
                    No featured vehicles yet. Add and publish vehicles from Admin → EV
                    Management.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.featured.map((v) => (
                      <VehicleCard key={v.id} vehicle={v} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {data.brands.length > 0 ? (
              <section className="mx-auto max-w-6xl px-5 py-12">
                <h2 className="font-display text-2xl font-bold">Brands</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explore models by manufacturer.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {data.brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        to="/ev/$categorySlug"
                        params={{ categorySlug: "electric-cars" }}
                        search={{ brand: b.slug }}
                        className="inline-flex rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-leaf"
                      >
                        {b.name}
                        <span className="ml-1.5 text-muted-foreground">
                          ({b.vehicleCount})
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mx-auto max-w-6xl px-5 pb-16">
              <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
                <p className="font-semibold text-foreground">Data disclaimer</p>
                <p className="mt-2 leading-relaxed">
                  Vehicle specifications, prices and availability may vary by variant, city
                  and manufacturer updates. Claimed range figures include the test cycle when
                  known and are not guaranteed real-world range. We are not affiliated with
                  vehicle manufacturers unless stated. Prefer “last verified” dates on each
                  vehicle page.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
