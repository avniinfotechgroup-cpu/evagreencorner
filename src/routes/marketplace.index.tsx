import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Leaf,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import {
  getMarketplaceHome,
  searchMarketplaceProviders,
} from "@/lib/marketplace/public.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Green & Clean-Energy Services Marketplace | ${siteConfig.name}`;
const DESCRIPTION =
  "Find verified solar, EV charging, waste, water and green consulting providers across India. Request quotes through EVA Green Corner.";

export const Route = createFileRoute("/marketplace/")({
  loader: () => loadPageSeo("/marketplace"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({ title: TITLE, description: DESCRIPTION, path: "/marketplace" }),
  component: MarketplaceHomePage,
});

function MarketplaceHomePage() {
  const loadHome = useServerFn(getMarketplaceHome);
  const searchFn = useServerFn(searchMarketplaceProviders);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadHome>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [serviceQ, setServiceQ] = useState("");
  const [locationQ, setLocationQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Awaited<
    ReturnType<typeof searchFn>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await loadHome();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load marketplace");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHome]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await searchFn({
        data: {
          q: serviceQ.trim(),
          city: locationQ.trim() || undefined,
          verifiedOnly: true,
          page: 1,
          limit: 12,
        },
      });
      setSearchResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const providers = searchResult?.items ?? data?.providers ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 text-center">
            <BannerMenu />
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <Leaf className="size-3.5" />
              Lead marketplace
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Find Trusted Green & Clean-Energy Services
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Connect with verified solar, EV charging, waste, water and sustainability
              providers across India — request a quote in one step.
            </p>

            <form
              className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border/50 bg-card p-2 text-left shadow-lift sm:flex-row"
              onSubmit={onSearch}
            >
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <Search className="size-4 shrink-0 text-leaf" />
                <input
                  value={serviceQ}
                  onChange={(e) => setServiceQ(e.target.value)}
                  placeholder="Service — solar, EV charger, RWH…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search services"
                />
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <MapPin className="size-4 shrink-0 text-leaf" />
                <input
                  value={locationQ}
                  onChange={(e) => setLocationQ(e.target.value)}
                  placeholder="City — Pune, Bengaluru…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="City or location"
                />
              </label>
              <button
                type="submit"
                disabled={searching}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {searching ? "…" : "Search"}
              </button>
            </form>

            {data ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-primary-foreground/85">
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.providers} verified providers
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
            <Loader2 className="size-4 animate-spin" /> Loading marketplace…
          </p>
        ) : null}

        {data ? (
          <>
            <section className="mx-auto max-w-6xl px-5 py-12">
              <h2 className="font-display text-2xl font-bold">Popular categories</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse green & clean-energy services matched to verified local providers.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.popularCategories.map((c) => (
                  <Link
                    key={c.id}
                    to="/marketplace/category/$slug"
                    params={{ slug: c.slug }}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift"
                  >
                    <h3 className="font-display text-sm font-bold">{c.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-leaf">
                      {c.providerCount} verified
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="border-y border-border bg-surface">
              <div className="mx-auto max-w-6xl px-5 py-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="size-3.5 text-leaf" />{" "}
                      {searchResult ? "Search results" : "Verified providers"}
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold">
                      {searchResult
                        ? `${searchResult.total} matching providers`
                        : "Trusted partners near you"}
                    </h2>
                  </div>
                </div>

                {providers.length === 0 ? (
                  <p className="mt-8 text-sm text-muted-foreground">
                    No verified providers match yet. Try another city or category.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {providers.map((p) => (
                      <Link
                        key={p.id}
                        to="/marketplace/providers/$slug"
                        params={{ slug: p.slug }}
                        className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-sm font-bold">
                            {p.businessName}
                          </h3>
                          {p.isVerified ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                              <BadgeCheck className="size-3" /> Verified
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.city}
                          {p.state ? `, ${p.state}` : ""}
                          {p.yearsExperience != null
                            ? ` · ${p.yearsExperience}+ yrs`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                        {p.serviceNames.length ? (
                          <p className="mt-3 text-[11px] text-leaf">
                            {p.serviceNames.slice(0, 2).join(" · ")}
                          </p>
                        ) : null}
                        <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
                          {p.contactHint}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-5 py-12">
              <h2 className="font-display text-2xl font-bold">How it works</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Simple lead matching — your contact details stay private from public pages.
              </p>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    n: "1",
                    t: "Describe your need",
                    d: "Pick a category or search by service and city.",
                  },
                  {
                    n: "2",
                    t: "Request a quote",
                    d: "Share project details once — we match verified providers.",
                  },
                  {
                    n: "3",
                    t: "Get connected",
                    d: "Matched partners receive your lead; you keep a reference number.",
                  },
                ].map((step) => (
                  <li
                    key={step.n}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {step.n}
                    </span>
                    <h3 className="mt-3 font-display text-sm font-bold">{step.t}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{step.d}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mx-auto max-w-6xl px-5 pb-16">
              <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
                <p className="font-semibold text-foreground">Marketplace note</p>
                <p className="mt-2 leading-relaxed">
                  Only providers with verification_status verified show a Verified badge.
                  Public profiles never display phone or email — use Request Quote to
                  contact. Sample listings marked “DEMO SEED DATA” are fictional and for
                  product demonstration only.
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
