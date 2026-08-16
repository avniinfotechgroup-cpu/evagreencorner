import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Briefcase, Car, Handshake, Loader2 } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { JournalCard } from "@/components/journal/JournalCard";
import { RichTextContent } from "@/components/editor/RichTextContent";
import { getJournalPost } from "@/lib/journal/public.functions";
import type { JournalPostDetail } from "@/lib/journal/queries";
import { absoluteUrl } from "@/lib/seo/site";
import { htmlToPlainText } from "@/lib/html-plain";

export const Route = createFileRoute("/journal/$slug")({
  loader: async ({ params }) => {
    try {
      return await getJournalPost({ data: { slug: params.slug } });
    } catch {
      return { post: null as JournalPostDetail | null, related: [] };
    }
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    const fallbackName = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title =
      post?.seoTitle?.trim() ||
      (post
        ? `${post.title} | Environment Journal | ${siteConfig.name}`
        : `${fallbackName} | Environment Journal | ${siteConfig.name}`);
    const description =
      post?.seoDescription?.trim() ||
      post?.excerpt?.trim() ||
      `Read ${post?.title ?? fallbackName} on EVA Green Corner Environment Journal.`;
    const keywords =
      post?.seoKeywords?.trim() || post?.seoFocusKeyword?.trim() || undefined;
    const canonical =
      post?.canonicalUrl?.trim() ||
      (post ? absoluteUrl(`/journal/${post.slug}`) : absoluteUrl(`/journal/${params.slug}`));
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: JournalArticlePage,
});

function shouldShowCrossLinks(categorySlug: string | null) {
  if (!categorySlug) return false;
  const s = categorySlug.toLowerCase();
  return s.includes("ev") || s.includes("energy") || s.includes("solar");
}

function JournalArticlePage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const load = useServerFn(getJournalPost);
  const [post, setPost] = useState<JournalPostDetail | null>(loaderData?.post ?? null);
  const [related, setRelated] = useState(loaderData?.related ?? []);
  const [loading, setLoading] = useState(!loaderData?.post);
  const [notFound, setNotFound] = useState(Boolean(loaderData && !loaderData.post));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!loaderData?.post || loaderData.post.slug !== slug) setLoading(true);
      try {
        const res = await load({ data: { slug } });
        if (cancelled) return;
        if (!res.post) {
          setNotFound(true);
          setPost(null);
        } else {
          setPost(res.post);
          setRelated(res.related);
          setNotFound(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load article");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, load, loaderData?.post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading article…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="font-display text-2xl font-bold">Article not found</h1>
          <Link to="/journal" className="mt-6 inline-block text-sm font-semibold text-primary">
            ← Back to journal
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || undefined,
    author: {
      "@type": "Person",
      name: post.authorName || "EVA Green Corner Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    mainEntityOfPage: `${siteConfig.appUrl}/journal/${post.slug}`,
    articleSection: post.categoryName || undefined,
    wordCount: htmlToPlainText(post.content).split(/\s+/).filter(Boolean).length,
  };

  const showLinks = shouldShowCrossLinks(post.categorySlug);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
              {post.categoryName ? (
                <>
                  / <span className="text-primary-foreground/85">{post.categoryName}</span>{" "}
                </>
              ) : null}
              / <span className="text-primary-foreground">{post.title}</span>
            </nav>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <BookOpen className="size-3.5" />
              {post.contentType}
            </span>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {post.authorName} · {post.readingTime} min read
              {post.publishedAt
                ? ` · ${new Date(post.publishedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`
                : ""}
            </p>
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-3xl px-5 py-6 text-sm text-destructive">{error}</p>
        ) : null}

        <article className="mx-auto max-w-3xl px-5 py-12">
          {post.excerpt ? (
            <p className="rounded-3xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-soft">
              {post.excerpt}
            </p>
          ) : null}
          <div className="mt-8">
            <RichTextContent html={post.content} />
          </div>

          {post.sources.length ? (
            <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-xl font-bold">Sources</h2>
              <ul className="mt-4 space-y-3">
                {post.sources.map((s) => (
                  <li key={s.id} className="text-sm">
                    {s.url ? (
                      <a
                        href={s.url}
                        target={s.url.startsWith("http") ? "_blank" : undefined}
                        rel={s.url.startsWith("http") ? "noreferrer" : undefined}
                        className="font-semibold text-primary hover:underline"
                      >
                        {s.title}
                      </a>
                    ) : (
                      <span className="font-semibold">{s.title}</span>
                    )}
                    {s.publisher ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {s.publisher}
                        {s.accessedAt ? ` · accessed ${s.accessedAt}` : ""}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showLinks ? (
            <section className="mt-10">
              <h2 className="font-display text-xl font-bold">Explore related modules</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Link
                  to="/marketplace"
                  className="rounded-3xl border border-border bg-card p-4 text-sm shadow-soft hover:shadow-lift"
                >
                  <Handshake className="size-4 text-leaf" />
                  <p className="mt-2 font-display font-bold">Marketplace</p>
                  <p className="mt-1 text-xs text-muted-foreground">Green demand & providers</p>
                </Link>
                <Link
                  to="/job-and-internship"
                  className="rounded-3xl border border-border bg-card p-4 text-sm shadow-soft hover:shadow-lift"
                >
                  <Briefcase className="size-4 text-leaf" />
                  <p className="mt-2 font-display font-bold">Green Jobs</p>
                  <p className="mt-1 text-xs text-muted-foreground">Careers & internships</p>
                </Link>
                <Link
                  to="/ev"
                  className="rounded-3xl border border-border bg-card p-4 text-sm shadow-soft hover:shadow-lift"
                >
                  <Car className="size-4 text-leaf" />
                  <p className="mt-2 font-display font-bold">EV Guide</p>
                  <p className="mt-1 text-xs text-muted-foreground">Vehicles & specs</p>
                </Link>
              </div>
            </section>
          ) : null}
        </article>

        {related.length ? (
          <section className="mx-auto max-w-6xl px-5 pb-16">
            <h2 className="font-display text-2xl font-bold">Related reading</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <JournalCard key={r.id} post={r} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
