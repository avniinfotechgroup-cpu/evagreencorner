import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import heroImage from "@/assets/hero-charging.jpg";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { StationFinder } from "@/components/platform/StationFinder";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { PopularAreas } from "@/components/platform/PopularAreas";
import { AnimatedHeroBackdrop } from "@/components/platform/AnimatedHeroBackdrop";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Find EV Charging Stations Near You | ${siteConfig.name}`;
const DESCRIPTION =
  "Search live EV charging stations by city, pincode or GPS. Compare connectors, distance and maps across India.";

export const Route = createFileRoute("/find-chargers")({
  loader: () => loadPageSeo("/find-chargers"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/find-chargers",
    }),
  component: FindChargersPage,
});

function FindChargersPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-x-clip overflow-y-visible">
          <AnimatedHeroBackdrop
            imageSrc={heroImage}
            alt="Electric vehicle charging under a solar canopy"
          />

          <div className="relative z-10 mx-auto max-w-6xl overflow-visible px-5 pb-12 pt-8 text-center sm:pt-10">
            <BannerMenu />
            <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-primary-foreground/70">
              <Leaf className="size-3.5 text-volt" />
              {siteConfig.tagline}
            </p>
            <h1 className="mx-auto mt-2 max-w-3xl text-balance font-display text-3xl font-bold leading-[1.08] text-primary-foreground sm:text-4xl md:text-[3.25rem]">
              Find an EV charging station near you
            </h1>
            <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-primary-foreground/78">
              Search by city, pincode or landmark — or use your current location.
            </p>

            <div className="mx-auto mt-6 max-w-6xl text-left">
              <StationFinder />
            </div>
          </div>
        </section>

        <PopularAreas />
      </main>

      <SiteFooter />
    </div>
  );
}
