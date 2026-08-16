import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScrollText } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { getJournalPolicy } from "@/lib/journal/public.functions";
import type { JournalPolicy } from "@/lib/journal/queries";

export const Route = createFileRoute("/journal/policy/$slug")({
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${name} | Policy Tracker | ${siteConfig.name}`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Policy summary for ${name}. Verify against official government sources.`,
        },
        { property: "og:title", content: title },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: JournalPolicyPage,
});

function JournalPolicyPage() {
  const { slug } = Route.useParams();
  const load = useServerFn(getJournalPolicy);
  const [policy, setPolicy] = useState<JournalPolicy | null>(null);
  const [linkedTitle, setLinkedTitle] = useState<string | null>(null);
  const [linkedSlug, setLinkedSlug] = useState<string | null>(null);
  const [related, setRelated] = useState<JournalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await load({ data: { slug } });
        if (cancelled) return;
        if (!res.policy) {
          setNotFound(true);
          setPolicy(null);
        } else {
          setPolicy(res.policy);
          setLinkedTitle(res.linkedPost?.title ?? null);
          setLinkedSlug(res.linkedPost?.slug ?? null);
          setRelated(res.relatedPolicies);
          setNotFound(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading policy…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !policy) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="font-display text-2xl font-bold">Policy not found</h1>
          <Link to="/journal" className="mt-6 inline-block text-sm font-semibold text-primary">
            ← Back to journal
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
          <div className="mx-auto max-w-3xl px-5 pb-12 pt-8">
            <BannerMenu />
            <nav className="text-xs text-primary-foreground/70">
              <Link to="/" className="hover:text-primary-foreground">
                Home
              </Link>{" "}
              /{" "}
              <Link to="/journal" className="hover:text-primary-foreground">
                Journal
              </Link>{" "}
              / Policy / <span className="text-primary-foreground">{policy.policyName}</span>
            </nav>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <ScrollText className="size-3.5" />
              {policy.status}
            </span>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {policy.policyName}
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {policy.authority}
              {policy.policyType ? ` · ${policy.policyType}` : ""} · {policy.country}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-6 px-5 py-12">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold">Summary</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {policy.summary}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold">Key dates</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground">Announced</dt>
                <dd className="font-medium">{policy.announcementDate ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground">Effective</dt>
                <dd className="font-medium">{policy.effectiveDate ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{policy.status}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-bold">Official sources</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Always verify the latest text on the authority website before relying on this
              summary.
            </p>
            {policy.officialSource ? (
              <p className="mt-4 text-sm">{policy.officialSource}</p>
            ) : null}
            {policy.documentUrl ? (
              <a
                href={policy.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Open document / portal →
              </a>
            ) : null}
          </div>

          {linkedSlug && linkedTitle ? (
            <p className="text-sm text-muted-foreground">
              Related article:{" "}
              <Link
                to="/journal/$slug"
                params={{ slug: linkedSlug }}
                className="font-semibold text-primary hover:underline"
              >
                {linkedTitle}
              </Link>
            </p>
          ) : null}

          {related.length ? (
            <div>
              <h2 className="font-display text-xl font-bold">Other policies</h2>
              <ul className="mt-4 space-y-2">
                {related.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/journal/policy/$slug"
                      params={{ slug: p.slug }}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {p.policyName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
