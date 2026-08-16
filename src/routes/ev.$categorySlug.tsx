import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Filter, Loader2, Search } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getEvCategoryPage } from "@/lib/vehicles/public.functions";

type EvCategorySearch = {
  brand?: string;
  q?: string;
  sort?: "latest" | "popular" | "price-low" | "price-high" | "range-high";
  min_range?: number;
  max_price?: number;
  status?: string;
  page?: number;
};

export const Route = createFileRoute("/ev/$categorySlug")({
  validateSearch: (search: Record<string, unknown>): EvCategorySearch => {
    const out: EvCategorySearch = {};
    if (typeof search["brand"] === "string" && search["brand"]) {
      out.brand = search["brand"];
    }
    if (typeof search["q"] === "string" && search["q"]) {
      out.q = search["q"];
    }
    const sort = search["sort"];
    if (
      sort === "latest" ||
      sort === "popular" ||
      sort === "price-low" ||
      sort === "price-high" ||
      sort === "range-high"
    ) {
      out.sort = sort;
    }
    const minRange = search["min_range"];
    if (typeof minRange === "number" && Number.isFinite(minRange)) {
      out.min_range = minRange;
    } else if (typeof minRange === "string" && minRange) {
      const n = Number(minRange);
      if (Number.isFinite(n)) out.min_range = n;
    }
    const maxPrice = search["max_price"];
    if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
      out.max_price = maxPrice;
    } else if (typeof maxPrice === "string" && maxPrice) {
      const n = Number(maxPrice);
      if (Number.isFinite(n)) out.max_price = n;
    }
    if (typeof search["status"] === "string" && search["status"]) {
      out.status = search["status"];
    }
    const page = search["page"];
    if (typeof page === "number" && Number.isFinite(page)) {
      out.page = page;
    } else if (typeof page === "string" && page) {
      const n = Number(page);
      if (Number.isFinite(n)) out.page = n;
    }
    return out;
  },
  head: ({ params, match }) => {
    const label = params.categorySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${label} in India — Price, Range & Specs | ${siteConfig.name}`;
    const description = `Browse ${label.toLowerCase()} available in India. Filter by brand, price and claimed range. Specs from our verified EV database.`;
    const s = (match.search ?? {}) as EvCategorySearch;
    const thinFilter = Boolean(
      s.brand || s.q || s.min_range || s.max_price || s.status || (s.page && s.page > 1),
    );
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(thinFilter ? [{ name: "robots", content: "noindex,follow" }] : []),
      ],
    };
  },
  component: EvCategoryPage,
});

function EvCategoryPage() {
  const { categorySlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const load = useServerFn(getEvCategoryPage);

  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState(search.q ?? "");
  const [brand, setBrand] = useState(search.brand ?? "");
  const [sort, setSort] = useState(search.sort ?? "popular");
  const [minRange, setMinRange] = useState(search.min_range?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(search.max_price?.toString() ?? "");
  const [status, setStatus] = useState(search.status ?? "");

  useEffect(() => {
    setQ(search.q ?? "");
    setBrand(search.brand ?? "");
    setSort(search.sort ?? "popular");
    setMinRange(search.min_range?.toString() ?? "");
    setMaxPrice(search.max_price?.toString() ?? "");
    setStatus(search.status ?? "");
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load({
          data: {
            categorySlug,
            brand: search.brand,
            q: search.q,
            sort: search.sort ?? "popular",
            minRange: search.min_range,
            maxPrice: search.max_price,
            status: search.status,
            page: search.page ?? 1,
          },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load vehicles");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, search, load]);

  const applyFilters = () => {
    const next: EvCategorySearch = {};
    if (brand) next.brand = brand;
    if (q.trim()) next.q = q.trim();
    if (sort && sort !== "popular") next.sort = sort;
    if (minRange) next.min_range = Number(minRange);
    if (maxPrice) next.max_price = Number(maxPrice);
    if (status) next.status = status;
    void navigate({ search: next });
  };

  const heading = useMemo(
    () => data?.category?.name ?? categorySlug.replace(/-/g, " "),
    [data, categorySlug],
  );

  if (!loading && data && !data.category) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Category not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This EV category does not exist or is inactive.
          </p>
          <Link to="/ev" className="mt-6 inline-flex text-sm font-semibold text-leaf">
            Back to EV home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 text-center">
            <BannerMenu />
            <nav
              aria-label="Breadcrumb"
              className="mt-4 flex flex-wrap items-center justify-center gap-1 text-xs text-primary-foreground/75"
            >
              <Link to="/ev" className="hover:text-primary-foreground">
                EVs
              </Link>
              <ChevronRight className="size-3" />
              <span className="text-primary-foreground">{heading}</span>
            </nav>
            <h1 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {heading} in India
            </h1>
            {data?.category?.description ? (
              <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
                {data.category.description}
              </p>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data?.result
                ? `${data.result.meta.total} vehicle${data.result.meta.total === 1 ? "" : "s"}`
                : "—"}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold md:hidden"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="size-3.5" />
              Filters & sort
            </button>
          </div>

          <div
            className={
              "mt-4 grid gap-6 lg:grid-cols-[240px_1fr] " +
              (showFilters ? "" : "max-md:[&>aside]:hidden")
            }
          >
            <aside className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Filters
              </h2>
              <div className="mt-3 space-y-3">
                <label className="block text-xs">
                  <span className="text-muted-foreground">Search</span>
                  <span className="mt-1 flex items-center gap-2 rounded-xl border border-border px-2.5 py-2">
                    <Search className="size-3.5 text-leaf" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </span>
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Brand</span>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                  >
                    <option value="">All brands</option>
                    {(data?.brands ?? []).map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) =>
                      setSort(e.target.value as NonNullable<EvCategorySearch["sort"]>)
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                  >
                    <option value="popular">Popular</option>
                    <option value="latest">Latest</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="range-high">Range: high to low</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Min claimed range (km)</span>
                  <input
                    type="number"
                    min={0}
                    value={minRange}
                    onChange={(e) => setMinRange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Max price (INR)</span>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-2.5 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="available">Available</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Apply
                </button>
              </div>
            </aside>

            <div>
              {loading ? (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {!loading && data?.result?.items.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <p className="font-display text-lg font-bold">
                    No electric vehicles found matching your filters.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Try:</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>Increasing your price range</li>
                    <li>Selecting another brand</li>
                    <li>Removing one or more filters</li>
                  </ul>
                </div>
              ) : null}
              {!loading && data?.result && data.result.items.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {data.result.items.map((v) => (
                    <VehicleCard key={v.id} vehicle={v} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
