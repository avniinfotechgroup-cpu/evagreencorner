import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Leaf, Zap } from "lucide-react";
import heroImage from "@/assets/hero-charging.jpg";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { ModuleGrid } from "@/components/platform/ModuleGrid";
import { PopularAreas } from "@/components/platform/PopularAreas";
import { AnimatedHeroBackdrop } from "@/components/platform/AnimatedHeroBackdrop";
import { JsonLd } from "@/lib/seo/JsonLd";
import { absoluteUrl, buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";
import { getPublicHomeContent } from "@/lib/platform/cms.functions";
import { DEFAULT_HOME_CONTENT, type HomeContent } from "@/lib/platform/home-content.shared";

const TITLE = `${siteConfig.name} — EV Charging Map, Route Planner & Green Tools India`;
const DESCRIPTION =
  "EVA Green Corner helps India find live EV charging stations, plan charge stops, check air quality, estimate carbon & water footprint, size rooftop solar, and explore EVs, jobs and green services.";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [seo, homeRes] = await Promise.all([
      loadPageSeo("/"),
      getPublicHomeContent().catch(() => ({ home: DEFAULT_HOME_CONTENT })),
    ]);
    return { seo, home: homeRes.home };
  },
  head: ({ loaderData }) =>
    loaderData?.seo?.head ??
    buildPageHead({ title: TITLE, description: DESCRIPTION, path: "/" }),
  component: HomePage,
});

function HomePage() {
  const { home } = Route.useLoaderData();
  const content: HomeContent = home ?? DEFAULT_HOME_CONTENT;
  const heroSrc = content.heroImageUrl?.trim() || heroImage;
  const faqs = content.faqs?.length ? content.faqs : DEFAULT_HOME_CONTENT.faqs;

  const webSiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/find-chargers")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    email: siteConfig.supportEmail,
    description: DESCRIPTION,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={webSiteLd} />
      <JsonLd data={orgLd} />
      <JsonLd data={faqLd} />
      <SiteHeader />

      <main>
        <section className="relative overflow-x-clip overflow-y-visible">
          <AnimatedHeroBackdrop imageSrc={heroSrc} alt={content.heroImageAlt} />

          <div className="relative z-10 mx-auto max-w-6xl overflow-visible px-5 pb-16 pt-8 text-center sm:pt-10">
            <BannerMenu />
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-primary-foreground/75">
              <Leaf className="size-3.5 text-volt" />
              {content.heroTagline}
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance font-display text-3xl font-bold leading-[1.1] text-primary-foreground sm:text-4xl md:text-5xl">
              {content.heroHeadline}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
              {content.heroSubcopy}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={content.primaryCtaHref || "/find-chargers"}
                className="inline-flex items-center gap-2 rounded-2xl bg-volt-gradient px-6 py-3.5 text-sm font-semibold text-volt-foreground shadow-soft"
              >
                <Zap className="size-4" />
                {content.primaryCtaLabel}
                <ArrowRight className="size-4" />
              </a>
              <a
                href={content.secondaryCtaHref || "/route-planner"}
                className="inline-flex items-center gap-2 rounded-2xl border border-primary-foreground/35 px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
              >
                {content.secondaryCtaLabel}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-14 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{content.introHeading}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {content.introBody}
          </p>
        </section>

        <ModuleGrid
          eyebrow={content.modulesEyebrow}
          heading={content.modulesHeading}
          body={content.modulesBody}
        />

        <PopularAreas
          eyebrow={content.popularEyebrow}
          heading={content.popularHeading}
          body={content.popularBody}
          ctaLabel={content.popularCtaLabel}
          areas={content.popularAreas}
        />

        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{content.faqHeading}</h2>
          <dl className="mt-8 space-y-5 text-left">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <dt className="font-display text-base font-bold">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-canopy px-8 py-14 text-center">
            <div className="absolute inset-0 grid-lines opacity-20" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-primary-foreground">
                {content.bottomHeading}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80">
                {content.bottomBody}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a
                  href={content.bottomPrimaryHref || "/find-chargers"}
                  className="rounded-xl bg-volt-gradient px-6 py-3 text-sm font-semibold text-volt-foreground"
                >
                  {content.bottomPrimaryLabel}
                </a>
                <a
                  href={content.bottomSecondaryHref || "/air-quality"}
                  className="rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {content.bottomSecondaryLabel}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
