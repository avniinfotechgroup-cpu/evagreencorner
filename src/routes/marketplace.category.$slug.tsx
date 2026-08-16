import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, MapPin } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { getMarketplaceCategory } from "@/lib/marketplace/public.functions";

type CatSearch = { city?: string; page?: number };

export const Route = createFileRoute("/marketplace/category/$slug")({
  validateSearch: (search: Record<string, unknown>): CatSearch => {
    const out: CatSearch = {};
    if (typeof search["city"] === "string" && search["city"]) out.city = search["city"];
    const page = search["page"];
    if (typeof page === "number" && Number.isFinite(page)) out.page = page;
    else if (typeof page === "string" && page) {
      const n = Number(page);
      if (Number.isFinite(n)) out.page = n;
    }
    return out;
  },
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${label} Providers in India | ${siteConfig.name}`;
    const description = `Find verified ${label.toLowerCase()} service providers on EVA Green Corner marketplace.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: MarketplaceCategoryPage,
});

function MarketplaceCategoryPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const load = useServerFn(getMarketplaceCategory);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await load({
          data: { slug, city: search.city, page: search.page ?? 1 },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load category");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, slug, search.city, search.page]);

  const cat = data?.category;
  const result = data?.result;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 text-center">
            <BannerMenu />
            <p className="mt-4 text-xs font-semibold text-primary-foreground/80">
              <Link to="/marketplace" className="hover:underline">
                Marketplace
              </Link>
              {" / "}
              Category
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {cat?.name ?? "Category"}
            </h1>
            {cat ? (
              <p className="mx-auto mt-2 max-w-xl text-sm text-primary-foreground/80">
                {cat.description}
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : null}

        {!loading && !cat ? (
          <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-muted-foreground">
            Category not found.
          </p>
        ) : null}

        {cat?.children && cat.children.length > 0 ? (
          <section className="mx-auto max-w-6xl px-5 pt-8">
            <ul className="flex flex-wrap gap-2">
              {cat.children.map((ch) => (
                <li key={ch.id}>
                  <Link
                    to="/marketplace/category/$slug"
                    params={{ slug: ch.slug }}
                    className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-leaf"
                  >
                    {ch.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {result ? (
          <section className="mx-auto max-w-6xl px-5 py-10">
            <h2 className="font-display text-xl font-bold">
              {result.total} verified provider{result.total === 1 ? "" : "s"}
            </h2>
            {result.items.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No verified providers in this category yet.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((p) => (
                  <Link
                    key={p.id}
                    to="/marketplace/providers/$slug"
                    params={{ slug: p.slug }}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-bold">{p.businessName}</h3>
                      {p.isVerified ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          <BadgeCheck className="size-3" /> Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {p.city}
                      {p.state ? `, ${p.state}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
