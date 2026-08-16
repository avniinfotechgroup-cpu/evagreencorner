import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Loader2, MapPin } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { JobCard, JOB_TYPE_LABEL, REMOTE_LABEL } from "@/components/jobs/JobCard";
import { RichTextContent } from "@/components/editor/RichTextContent";
import { applyToJob, getJobDetail } from "@/lib/jobs/public.functions";
import { useAuth } from "@/lib/community/useAuth";
import type { JobDetail } from "@/lib/jobs/queries";

export const Route = createFileRoute("/job-and-internship/$slug")({
  loader: async ({ params }) => {
    try {
      return await getJobDetail({ data: { slug: params.slug } });
    } catch {
      return { job: null as JobDetail | null, related: [], alreadyApplied: false };
    }
  },
  head: ({ loaderData, params }) => {
    const job = loaderData?.job;
    const fallbackName = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title =
      job?.seoTitle?.trim() ||
      (job
        ? `${job.title} | ${JOB_TYPE_LABEL[job.jobType] ?? job.jobType} | ${siteConfig.name}`
        : `${fallbackName} | Green Jobs | ${siteConfig.name}`);
    const description =
      job?.seoDescription?.trim() ||
      (job
        ? `${job.title} at ${job.organizationName}${job.city ? ` — ${job.city}` : ""}. Apply via ${siteConfig.name}.`
        : `Green career opportunity: ${fallbackName}. Apply via EVA Green Corner Jobs.`);
    const keywords = job?.seoKeywords?.trim() || job?.seoFocusKeyword?.trim() || undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: JobDetailPage,
});

function JobDetailPage() {
  const { slug } = Route.useParams();
  const { token, user, ready } = useAuth();
  const load = useServerFn(getJobDetail);
  const applyFn = useServerFn(applyToJob);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [related, setRelated] = useState<Awaited<ReturnType<typeof load>>["related"]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumePath, setResumePath] = useState("");
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load({ data: { slug, token } });
        if (cancelled) return;
        if (!res.job) {
          setNotFound(true);
          setJob(null);
        } else {
          setJob(res.job);
          setRelated(res.related);
          setAlreadyApplied(res.alreadyApplied);
          setNotFound(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, load, token, ready]);

  async function submitApply(e: FormEvent) {
    e.preventDefault();
    if (!job || !token) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      await applyFn({
        data: {
          token,
          jobId: job.id,
          coverLetter,
          resumePath,
        },
      });
      setAlreadyApplied(true);
      setApplyMsg("Application submitted.");
    } catch (err) {
      setApplyMsg(err instanceof Error ? err.message : "Could not apply");
    } finally {
      setApplying(false);
    }
  }

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading role…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="font-display text-2xl font-bold">Job not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This listing may be unpublished or expired.
          </p>
          <Link to="/job-and-internship" className="mt-6 inline-block text-sm font-semibold text-primary">
            ← Back to jobs
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isOpen = job.status === "published";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-8">
            <BannerMenu />
            <nav className="text-xs text-primary-foreground/70">
              <Link to="/" className="hover:text-primary-foreground">
                Home
              </Link>{" "}
              /{" "}
              <Link to="/job-and-internship" className="hover:text-primary-foreground">
                Jobs
              </Link>{" "}
              / <span className="text-primary-foreground">{job.title}</span>
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/85">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-foreground/25 px-3 py-1">
                <Briefcase className="size-3.5" />
                {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
              </span>
              <span className="rounded-full border border-primary-foreground/25 px-3 py-1">
                {REMOTE_LABEL[job.remoteType] ?? job.remoteType}
              </span>
              {job.verified ? (
                <span className="rounded-full border border-primary-foreground/25 px-3 py-1">
                  Verified listing
                </span>
              ) : null}
              {job.status === "expired" ? (
                <span className="rounded-full border border-primary-foreground/25 px-3 py-1">
                  Expired
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 max-w-3xl text-balance font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {job.title}
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/80">
              {job.organizationName}
              {job.categoryName ? ` · ${job.categoryName}` : ""}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-foreground/75">
              <MapPin className="size-4" />
              {job.location || `${job.city}, ${job.state}`}
            </p>
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-6xl px-5 py-6 text-sm text-destructive">{error}</p>
        ) : null}

        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
          <div className="space-y-8">
            <Block title="About the role" body={job.description} />
            <Block title="Responsibilities" body={job.responsibilities} />
            <Block title="Requirements" body={job.requirements} />
            {job.qualification ? <Block title="Qualification" body={job.qualification} /> : null}
            {job.jobType === "internship" ? (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Internship details</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  {job.durationMonths != null ? (
                    <Row label="Duration" value={`${job.durationMonths} months`} />
                  ) : null}
                  {job.mode ? <Row label="Mode" value={job.mode} /> : null}
                  {job.specialization ? (
                    <Row label="Specialization" value={job.specialization} />
                  ) : null}
                  {job.eligibility ? <Row label="Eligibility" value={job.eligibility} /> : null}
                  <Row
                    label="Certificate"
                    value={job.certificateOffered ? "Offered" : "Not specified"}
                  />
                  {job.stipendMonthly != null ? (
                    <Row
                      label="Stipend"
                      value={`₹${job.stipendMonthly.toLocaleString("en-IN")} / month`}
                    />
                  ) : (
                    <Row label="Stipend" value="Not listed" />
                  )}
                </dl>
              </div>
            ) : null}
            {job.skills ? (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold">Skills</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.skills}</p>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">At a glance</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row
                  label="Experience"
                  value={
                    job.experienceMin != null || job.experienceMax != null
                      ? `${job.experienceMin ?? 0}–${job.experienceMax ?? "?"} years`
                      : "Not specified"
                  }
                />
                <Row
                  label="Compensation"
                  value={
                    job.salaryMin != null || job.salaryMax != null
                      ? `${job.salaryMin != null ? `₹${job.salaryMin.toLocaleString("en-IN")}` : "?"}${
                          job.salaryMax != null
                            ? ` – ₹${job.salaryMax.toLocaleString("en-IN")}`
                            : ""
                        }${job.salaryType ? ` (${job.salaryType})` : ""}`
                      : "Not listed"
                  }
                />
                {job.deadline ? (
                  <Row
                    label="Deadline"
                    value={new Date(job.deadline).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                ) : null}
              </dl>
              {job.source === "demo-seed" ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Demo seed listing for EVA Green Corner — not a live vacancy.
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Organisation</h2>
              <p className="mt-2 text-sm font-semibold">{job.organizationName}</p>
              {job.organizationDescription ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {job.organizationDescription}
                </p>
              ) : null}
              {job.organizationWebsite ? (
                <a
                  href={job.organizationWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Website →
                </a>
              ) : null}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold">Apply</h2>
              {!isOpen ? (
                <p className="mt-2 text-sm text-muted-foreground">This role is not open.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {job.applicationUrl ? (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                    >
                      Apply now →
                    </a>
                  ) : null}
                  {job.applicationEmail ? (
                    <a
                      href={`mailto:${job.applicationEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}
                      className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface"
                    >
                      Email {job.applicationEmail}
                    </a>
                  ) : null}
                  {!job.applicationUrl && !job.applicationEmail ? (
                    !user ? (
                      <p className="text-sm text-muted-foreground">
                        <Link to="/login" className="font-semibold text-primary hover:underline">
                          Sign in
                        </Link>{" "}
                        to apply on EVA Green Corner.
                      </p>
                    ) : alreadyApplied ? (
                      <p className="text-sm text-leaf">You have already applied.</p>
                    ) : (
                      <form className="space-y-3" onSubmit={(e) => void submitApply(e)}>
                        <label className="block text-xs font-semibold">
                          Resume link or path
                          <input
                            value={resumePath}
                            onChange={(e) => setResumePath(e.target.value)}
                            placeholder="https://… or file note"
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </label>
                        <label className="block text-xs font-semibold">
                          Cover letter
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={5}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={applying}
                          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {applying ? "Submitting…" : "Submit application"}
                        </button>
                      </form>
                    )
                  ) : null}
                  {job.applicationUrl && user && !alreadyApplied ? (
                    <details className="rounded-xl border border-border bg-surface/40 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                        Or apply on EVA Green Corner
                      </summary>
                      <form className="mt-3 space-y-3" onSubmit={(e) => void submitApply(e)}>
                        <label className="block text-xs font-semibold">
                          Resume link or path
                          <input
                            value={resumePath}
                            onChange={(e) => setResumePath(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </label>
                        <label className="block text-xs font-semibold">
                          Cover letter
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={4}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={applying}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                          {applying ? "Submitting…" : "Submit on EVA"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {alreadyApplied && job.applicationUrl ? (
                    <p className="text-xs text-leaf">You already applied on EVA Green Corner.</p>
                  ) : null}
                  {applyMsg ? (
                    <p className="text-xs text-muted-foreground">{applyMsg}</p>
                  ) : null}
                </div>
              )}
            </div>
          </aside>
        </section>

        {related.length ? (
          <section className="mx-auto max-w-6xl px-5 pb-16">
            <h2 className="font-display text-2xl font-bold">Related roles</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <JobCard key={r.id} job={r} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
        <RichTextContent html={body} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
