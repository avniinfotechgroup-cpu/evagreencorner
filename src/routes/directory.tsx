import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import {
  DIRECTORY_CATEGORY_OPTIONS,
  searchDirectory,
} from "@/lib/community/directory-public.functions";
import { JsonLd } from "@/lib/seo/JsonLd";
import { absoluteUrl, buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Green Services Directory | ${siteConfig.name}`;
const DESCRIPTION =
  "Find live EV workshops, solar installers, recyclers and green service providers near you in India.";

type Provider = {
  id: string;
  name: string;
  categoryLabel: string;
  city: string;
  state: string;
  area: string;
  phone: string;
  website: string;
  verified: boolean;
  description?: string;
};

export const Route = createFileRoute("/directory")({
  validateSearch: (s: Record<string, unknown>) => ({
    category:
      typeof s.category === "string" && s.category.length > 0 ? s.category : undefined,
  }),
  // SSR first paint so Googlebot sees providers in HTML (not only after JS fetch)
  loader: async ({ location }) => {
    const category =
      typeof location.search === "object" &&
      location.search &&
      "category" in location.search &&
      typeof (location.search as { category?: string }).category === "string"
        ? (location.search as { category: string }).category
        : "all";
    const seo = await loadPageSeo("/directory").catch(() => null);
    try {
      const dir = await searchDirectory({ data: { q: "", city: "", category } });
      return { ...dir, seo };
    } catch {
      return {
        providers: [] as Provider[],
        categories: [...DIRECTORY_CATEGORY_OPTIONS],
        seo,
      };
    }
  },
  head: ({ loaderData }) => {
    const count = loaderData?.providers?.length ?? 0;
    if (loaderData?.seo?.head) {
      const base = loaderData.seo;
      const description =
        count > 0
          ? `${base.description} Browse ${count} listed providers.`
          : base.description;
      return buildPageHead({
        title: base.title,
        description,
        path: "/directory",
        ...(base.keywords ? { keywords: base.keywords } : {}),
        ...(base.noindex ? { noindex: true } : {}),
      });
    }
    const description =
      count > 0 ? `${DESCRIPTION} Browse ${count} listed providers.` : DESCRIPTION;
    return buildPageHead({
      title: TITLE,
      description,
      path: "/directory",
    });
  },
  component: DirectoryPage,
});

function DirectoryPage() {
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const fetchDirectory = useServerFn(searchDirectory);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(search.category ?? "all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>(
    (initial.providers as Provider[]) ?? [],
  );

  useEffect(() => {
    if (search.category && search.category !== category) {
      setCategory(search.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.category]);

  const load = async (opts?: { q?: string; city?: string; category?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDirectory({
        data: {
          q: opts?.q ?? q,
          city: opts?.city ?? city,
          category: opts?.category ?? category,
        },
      });
      setProviders(res.providers as Provider[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load directory");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // Live filter as user types — skip first paint (SSR loader already filled HTML for Google)
  const filtersReady = useRef(false);
  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      return;
    }
    const t = window.setTimeout(() => {
      void load();
    }, 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, category]);

  const directoryLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/directory"),
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: absoluteUrl("/") },
    about: {
      "@type": "Thing",
      name: "Green service providers in India",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={directoryLd} />
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 text-center">
            <BannerMenu />
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <Building2 className="size-3.5" />
              Live directory
            </span>
            <h1 className="mx-auto mt-5 max-w-2xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Find green service providers
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Search EV workshops, solar installers, recyclers and home-energy partners.
            </p>

            <form
              className="mt-7 grid gap-2 rounded-3xl border border-border/50 bg-card p-3 text-left shadow-lift sm:grid-cols-[1fr_1fr_auto_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                void load();
              }}
            >
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                <Search className="size-4 text-leaf" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or keyword"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                <MapPin className="size-4 text-leaf" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City / area (e.g. Delhi, Noida)"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="all">All categories</option>
                {DIRECTORY_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10">
          {loading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading providers…
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <p className="text-sm text-muted-foreground">{providers.length} providers</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold">{p.name}</h2>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {p.categoryLabel}
                    </p>
                  </div>
                  {p.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold">
                      <ShieldCheck className="size-3" />
                      Verified
                    </span>
                  ) : null}
                </div>
                {p.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-muted-foreground">
                  {[p.area, p.city, p.state].filter(Boolean).join(", ") || "India"}
                </p>
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    <Phone className="size-3.5" />
                    {p.phone}
                  </a>
                ) : null}
                {p.website ? (
                  <a
                    href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs font-semibold text-muted-foreground underline"
                  >
                    Website
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {!loading && !providers.length ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
              <p className="font-display text-base font-bold">No providers matched</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try “Noida”, “Delhi”, “Mumbai”, or clear filters. Add more from Admin →
                Directory.
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Open admin
              </Link>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
