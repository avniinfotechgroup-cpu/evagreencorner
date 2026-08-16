import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Loader2, Search } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { JobCard, JOB_TYPE_LABEL, REMOTE_LABEL } from "@/components/jobs/JobCard";
import { getJobsHome, searchJobsPublic } from "@/lib/jobs/public.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Green Jobs & Internships in India | ${siteConfig.name}`;
const DESCRIPTION =
  "Find climate, renewable energy, EV, ESG and sustainability careers and internships across India.";

export const Route = createFileRoute("/job-and-internship/")({
  loader: () => loadPageSeo("/job-and-internship"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({ title: TITLE, description: DESCRIPTION, path: "/job-and-internship" }),
  component: JobsHomePage,
});

function JobsHomePage() {
  const loadHome = useServerFn(getJobsHome);
  const searchFn = useServerFn(searchJobsPublic);
  const [home, setHome] = useState<Awaited<ReturnType<typeof loadHome>> | null>(null);
  const [searchResult, setSearchResult] = useState<Awaited<
    ReturnType<typeof searchFn>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [jobType, setJobType] = useState("");
  const [city, setCity] = useState("");
  const [remoteType, setRemoteType] = useState("");
  const [internshipOnly, setInternshipOnly] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await loadHome();
        if (!cancelled) setHome(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load jobs");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHome]);

  async function runSearch(page = 1) {
    setSearching(true);
    setError(null);
    try {
      const res = await searchFn({
        data: {
          q,
          categorySlug: categorySlug || undefined,
          jobType: jobType || undefined,
          city: city || undefined,
          remoteType: remoteType || undefined,
          internshipOnly: internshipOnly || undefined,
          page,
          limit: 20,
          sort: "latest",
        },
      });
      setSearchResult(res);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const categories = home?.categories ?? searchResult?.categories ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 text-center">
            <BannerMenu />
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <Briefcase className="size-3.5" />
              Green careers
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold text-primary-foreground sm:text-5xl">
              Find Your Next Green Career
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Climate tech, renewables, EV & mobility, ESG and sustainability roles — plus
              internships for students.
            </p>

            <form
              className="mx-auto mt-7 max-w-2xl space-y-3 rounded-3xl border border-border/50 bg-card p-3 text-left shadow-lift"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch(1);
              }}
            >
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                <Search className="size-4 text-leaf" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search solar, ESG, EV charging…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search green jobs"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  aria-label="Category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  aria-label="Job type"
                >
                  <option value="">All types</option>
                  {Object.entries(JOB_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={remoteType}
                  onChange={(e) => setRemoteType(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  aria-label="Remote type"
                >
                  <option value="">Any location mode</option>
                  {Object.entries(REMOTE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  aria-label="City"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={internshipOnly}
                    onChange={(e) => setInternshipOnly(e.target.checked)}
                    className="rounded border-border"
                  />
                  Internships only
                </label>
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {searching ? "Searching…" : "Search jobs"}
                </button>
              </div>
            </form>

            {home ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-primary-foreground/85">
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {home.stats.published} open roles
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {home.stats.internships} internships
                </span>
                <span className="rounded-full border border-primary-foreground/20 px-3 py-1">
                  {home.stats.orgs} organisations
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-destructive">{error}</p>
        ) : null}

        {!home && !error ? (
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading green jobs…
          </p>
        ) : null}

        {hasSearched && searchResult ? (
          <section className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="font-display text-2xl font-bold">
              Search results ({searchResult.result.total})
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {searchResult.result.items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            {!searchResult.result.items.length ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No matching roles. Try clearing filters.
              </p>
            ) : null}
            {searchResult.result.totalPages > 1 ? (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={searchResult.result.page <= 1 || searching}
                  onClick={() => void runSearch(searchResult.result.page - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-muted-foreground">
                  Page {searchResult.result.page} of {searchResult.result.totalPages}
                </span>
                <button
                  type="button"
                  disabled={
                    searchResult.result.page >= searchResult.result.totalPages || searching
                  }
                  onClick={() => void runSearch(searchResult.result.page + 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {home && !hasSearched ? (
          <>
            <section className="mx-auto max-w-6xl px-5 py-12">
              <h2 className="font-display text-2xl font-bold">Featured roles</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Highlighted openings across climate and green industries.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {home.featured.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-5 pb-12">
              <h2 className="font-display text-2xl font-bold">Internships</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Campus and early-career programmes in environment and energy.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {home.internships.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {!home.internships.length ? (
                <p className="mt-4 text-sm text-muted-foreground">No internships listed yet.</p>
              ) : null}
            </section>

            <section className="mx-auto max-w-6xl px-5 pb-16">
              <h2 className="font-display text-2xl font-bold">Browse by category</h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {home.categories
                  .filter((c) => c.jobCount > 0)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategorySlug(c.slug);
                        setHasSearched(false);
                        void (async () => {
                          setCategorySlug(c.slug);
                          setSearching(true);
                          try {
                            const res = await searchFn({
                              data: { categorySlug: c.slug, page: 1, limit: 20 },
                            });
                            setSearchResult(res);
                            setHasSearched(true);
                          } finally {
                            setSearching(false);
                          }
                        })();
                      }}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-leaf/40 hover:bg-leaf/5"
                    >
                      {c.name}
                      <span className="ml-1.5 text-muted-foreground">({c.jobCount})</span>
                    </button>
                  ))}
              </div>
              <p className="mt-8 text-xs text-muted-foreground">
                Sample listings may be demo seed data. Prefer employer career pages for live
                vacancies.{" "}
                <Link to="/journal" className="text-primary hover:underline">
                  Read Environment Journal
                </Link>
              </p>
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
