import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { z } from "zod";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import {
  NearbyChargersPanel,
  RADIUS_OPTIONS,
  type RadiusKm,
  type ResultsView,
} from "@/components/platform/NearbyChargersPanel";

const searchSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  q: z.string().optional().default("Selected location"),
  radius: z.coerce.number().optional().default(10),
  view: z.enum(["list", "map"]).optional().default("list"),
});

export const Route = createFileRoute("/chargers")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      {
        title: `Nearby chargers | ${siteConfig.name}`,
      },
      {
        name: "description",
        content:
          "Browse nearby EV charging stations in Station list or Map view. Compare connectors, distance and reviews.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChargersPage,
});

function ChargersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const initialRadius = (RADIUS_OPTIONS.includes(search.radius as RadiusKm)
    ? search.radius
    : 10) as RadiusKm;

  const [radiusKm, setRadiusKm] = useState<RadiusKm>(initialRadius);
  const view: ResultsView = search.view === "map" ? "map" : "list";
  const placeLabel = search.q?.trim() || "Selected location";
  const hasCoords =
    typeof search.lat === "number" &&
    typeof search.lng === "number" &&
    Number.isFinite(search.lat) &&
    Number.isFinite(search.lng);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-canopy">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-8 text-center sm:px-5">
          <BannerMenu />
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary-foreground">
            Nearby chargers
          </h1>
          {hasCoords ? (
            <p className="mt-2 inline-flex items-start justify-center gap-1.5 text-sm text-primary-foreground/80">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Showing results near{" "}
                <span className="font-semibold text-primary-foreground">{placeLabel}</span>
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-primary-foreground/80">
              Choose a city on home, then open Station list or Map view here.
            </p>
          )}
        </div>
      </section>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-5">
        <Link
          to="/find-chargers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to search
        </Link>

        {hasCoords ? (
          <NearbyChargersPanel
            coords={{ lat: search.lat!, lng: search.lng! }}
            placeLabel={placeLabel}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            layout="tabs"
            view={view}
            onViewChange={(next) => {
              void navigate({
                search: (prev) => ({ ...prev, view: next }),
                replace: true,
              });
            }}
          />
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <MapPin className="mx-auto size-7 text-leaf" />
            <p className="mt-3 font-display text-base font-bold">No location selected</p>
            <Link
              to="/find-chargers"
              className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Search chargers
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
