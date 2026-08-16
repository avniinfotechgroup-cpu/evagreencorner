import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, ScrollText } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { JournalCard } from "@/components/journal/JournalCard";
import { getJournalHome } from "@/lib/journal/public.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Environment Journal — Guides, Explainers & Policy | ${siteConfig.name}`;
const DESCRIPTION =
  "Research-backed environmental guides, EV explainers and policy tracking from EVA Green Corner.";

export const Route = createFileRoute("/journal/")({
  loader: () => loadPageSeo("/journal"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({ title: TITLE, description: DESCRIPTION, path: "/journal" }),
  component: JournalHomePage,
});

function JournalHomePage() {
  const loadHome = useServerFn(getJournalHome);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadHome>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await loadHome();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load journal");
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
              <BookOpen className="size-3.5" />
              Environment Journal
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Guides, explainers & policy tracking
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Educational articles on climate, energy, EVs and sustainability — with cited
              sources and clear caveats.
            </p>
            {data ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-primary-foreground/85">
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.published} articles
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.policies} policies
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {data.stats.categories} topics
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
            <Loader2 className="size-4 animate-spin" /> Loading journal…
          </p>
        ) : null}

        {data ? (
          <>
            <section className="mx-auto max-w-6xl px-5 py-12">
              <h2 className="font-display text-2xl font-bold">Featured</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Editorially highlighted explainers and guides.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {data.featured.map((post) => (
                  <JournalCard key={post.id} post={post} />
                ))}
              </div>
            </section>

            {data.byCategory.map(({ category, posts }) => (
              <section key={category.id} className="mx-auto max-w-6xl px-5 pb-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">{category.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <JournalCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            ))}

            {data.policies.length ? (
              <section className="mx-auto max-w-6xl px-5 pb-16">
                <h2 className="font-display text-2xl font-bold">Policy tracker</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Summaries with official source links — always verify against ministry sites.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {data.policies.map((p) => (
                    <Link
                      key={p.id}
                      to="/journal/policy/$slug"
                      params={{ slug: p.slug }}
                      className="rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <ScrollText className="size-3.5 text-leaf" />
                        {p.status}
                      </span>
                      <h3 className="mt-2 font-display text-base font-bold">{p.policyName}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p.authority}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
