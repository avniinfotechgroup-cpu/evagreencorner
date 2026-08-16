import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2 } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getEvVehiclePage } from "@/lib/vehicles/public.functions";
import type { VehicleDetail } from "@/lib/vehicles/queries";

export const Route = createFileRoute("/ev/$categorySlug_/$brandSlug/$vehicleSlug")({
  head: ({ params }) => {
    const name = params.vehicleSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${name} Price, Range, Battery & Specifications in India | ${siteConfig.name}`;
    const description = `Check ${name} price, battery capacity, claimed range, charging time, motor power, variants, features and specifications in India.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        {
          rel: "canonical",
          href: `${siteConfig.appUrl}/ev/${params.categorySlug}/${params.brandSlug}/${params.vehicleSlug}/`,
        },
      ],
    };
  },
  component: EvVehicleDetailPage,
});

function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function EvVehicleDetailPage() {
  const { categorySlug, brandSlug, vehicleSlug } = Route.useParams();
  const load = useServerFn(getEvVehiclePage);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [similar, setSimilar] = useState<Awaited<
    ReturnType<typeof load>
  >["similar"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load({ data: { vehicleSlug } });
        if (cancelled) return;
        if (!res.vehicle) {
          setNotFound(true);
          setVehicle(null);
        } else {
          setVehicle(res.vehicle);
          setSimilar(res.similar);
          setNotFound(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load vehicle");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleSlug, load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading vehicle…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !vehicle) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Vehicle not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error || "This vehicle is unpublished, deleted, or the URL is incorrect."}
          </p>
          <Link to="/ev" className="mt-6 inline-flex text-sm font-semibold text-leaf">
            Back to EV home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const v = vehicle;
  const faqJson =
    v.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: v.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const productJson = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: v.name,
    brand: { "@type": "Brand", name: v.brandName },
    description: v.seoDescription || v.shortDescription,
    ...(v.startingPrice
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: v.startingPrice,
            availability:
              v.status === "available"
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-8">
            <BannerMenu />
            <nav
              aria-label="Breadcrumb"
              className="mt-4 flex flex-wrap items-center gap-1 text-xs text-primary-foreground/75"
            >
              <Link to="/ev" className="hover:text-primary-foreground">
                EVs
              </Link>
              <ChevronRight className="size-3" />
              <Link
                to="/ev/$categorySlug"
                params={{ categorySlug }}
                className="hover:text-primary-foreground"
              >
                {v.categoryName}
              </Link>
              <ChevronRight className="size-3" />
              <span className="text-primary-foreground">{v.name}</span>
            </nav>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
              {v.brandName} · {v.categoryName}
            </p>
            <h1 className="mt-2 max-w-3xl text-balance font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              {v.name}
            </h1>
            {v.shortDescription ? (
              <p className="mt-3 max-w-2xl text-sm text-primary-foreground/80">
                {v.shortDescription}
              </p>
            ) : null}

            {(v.images.length > 0 || v.primaryImageUrl) && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-primary-foreground/20 bg-primary-foreground/5">
                <img
                  src={v.images.find((i) => i.isPrimary)?.url || v.images[0]?.url || v.primaryImageUrl || ""}
                  alt={
                    v.images.find((i) => i.isPrimary)?.alt ||
                    v.images[0]?.alt ||
                    v.primaryImageAlt ||
                    `${v.name} exterior`
                  }
                  className="mx-auto max-h-[360px] w-full object-cover"
                  loading="eager"
                />
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {v.startingPriceLabel ? (
                <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-primary-foreground">
                  <p className="text-[11px] opacity-75">Starting from</p>
                  <p className="mt-1 font-display text-xl font-bold">
                    {v.startingPriceLabel}
                  </p>
                </div>
              ) : null}
              {v.claimedRangeKm != null ? (
                <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-primary-foreground">
                  <p className="text-[11px] opacity-75">Claimed range</p>
                  <p className="mt-1 font-display text-xl font-bold">
                    {v.claimedRangeKm} km
                  </p>
                  {v.rangeTestCycle ? (
                    <p className="text-[11px] opacity-75">Test cycle: {v.rangeTestCycle}</p>
                  ) : null}
                </div>
              ) : null}
              {v.batteryKwh != null ? (
                <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-primary-foreground">
                  <p className="text-[11px] opacity-75">Battery</p>
                  <p className="mt-1 font-display text-xl font-bold">{v.batteryKwh} kWh</p>
                </div>
              ) : null}
              {v.motorPowerKw != null ? (
                <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3 text-primary-foreground">
                  <p className="text-[11px] opacity-75">Motor power</p>
                  <p className="mt-1 font-display text-xl font-bold">{v.motorPowerKw} kW</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-10">
          {v.images.length > 1 ? (
            <section className="mb-10">
              <h2 className="font-display text-xl font-bold">Gallery</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {v.images.map((img) => (
                  <figure
                    key={img.url + img.alt}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              {v.description ? (
                <section>
                  <h2 className="font-display text-xl font-bold">Overview</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {v.description}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-xl font-bold">Specifications</h2>
                <dl className="mt-3">
                  <SpecRow
                    label="Battery capacity"
                    value={v.batteryKwh != null ? `${v.batteryKwh} kWh` : null}
                  />
                  <SpecRow label="Battery chemistry" value={v.batteryChemistry || null} />
                  <SpecRow
                    label="Claimed range"
                    value={
                      v.claimedRangeKm != null
                        ? `${v.claimedRangeKm} km${v.rangeTestCycle ? ` (${v.rangeTestCycle})` : ""}`
                        : null
                    }
                  />
                  <SpecRow
                    label="Real-world range"
                    value={
                      v.realWorldRangeKm != null ? `${v.realWorldRangeKm} km` : null
                    }
                  />
                  <SpecRow
                    label="Motor power"
                    value={v.motorPowerKw != null ? `${v.motorPowerKw} kW` : null}
                  />
                  <SpecRow
                    label="Torque"
                    value={v.torqueNm != null ? `${v.torqueNm} Nm` : null}
                  />
                  <SpecRow
                    label="Top speed"
                    value={v.topSpeedKmph != null ? `${v.topSpeedKmph} km/h` : null}
                  />
                  <SpecRow
                    label="DC fast charging"
                    value={v.dcChargingKw != null ? `${v.dcChargingKw} kW` : null}
                  />
                  <SpecRow label="Connector" value={v.connector || null} />
                  <SpecRow
                    label="Seating"
                    value={v.seating != null ? `${v.seating}` : null}
                  />
                  <SpecRow
                    label="Safety rating"
                    value={
                      v.safetyRating
                        ? `${v.safetyRating}${v.safetyAgency ? ` (${v.safetyAgency})` : ""}`
                        : "Not available"
                    }
                  />
                </dl>
                {v.rangeNotes ? (
                  <p className="mt-3 text-xs text-muted-foreground">{v.rangeNotes}</p>
                ) : null}
              </section>

              {v.variants.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-bold">Variants</h2>
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-surface text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Variant</th>
                          <th className="px-3 py-2">Battery</th>
                          <th className="px-3 py-2">Range</th>
                          <th className="px-3 py-2">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.variants.map((vr) => (
                          <tr key={vr.id} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">{vr.name}</td>
                            <td className="px-3 py-2">
                              {vr.batteryKwh != null ? `${vr.batteryKwh} kWh` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {vr.rangeKm != null ? `${vr.rangeKm} km` : "—"}
                            </td>
                            <td className="px-3 py-2">{vr.priceLabel ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {(v.vehicleWarrantyYears != null || v.batteryWarrantyYears != null) && (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-display text-xl font-bold">Warranty</h2>
                  <dl className="mt-3">
                    <SpecRow
                      label="Vehicle"
                      value={
                        v.vehicleWarrantyYears != null
                          ? `${v.vehicleWarrantyYears} years${v.vehicleWarrantyKm ? ` / ${v.vehicleWarrantyKm.toLocaleString("en-IN")} km` : ""}`
                          : null
                      }
                    />
                    <SpecRow
                      label="Battery"
                      value={
                        v.batteryWarrantyYears != null
                          ? `${v.batteryWarrantyYears} years${v.batteryWarrantyKm ? ` / ${v.batteryWarrantyKm.toLocaleString("en-IN")} km` : ""}`
                          : null
                      }
                    />
                  </dl>
                  {v.warrantyNotes ? (
                    <p className="mt-2 text-xs text-muted-foreground">{v.warrantyNotes}</p>
                  ) : null}
                </section>
              )}

              {v.faqs.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-bold">
                    Frequently asked questions
                  </h2>
                  <div className="mt-4 space-y-3">
                    {v.faqs.map((f) => (
                      <details
                        key={f.question}
                        className="rounded-2xl border border-border bg-card px-4 py-3"
                      >
                        <summary className="cursor-pointer text-sm font-semibold">
                          {f.question}
                        </summary>
                        <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
                <p className="font-semibold">Source & verification</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {v.sourceName || "Source not listed"}
                </p>
                {v.lastVerifiedLabel ? (
                  <p className="mt-2 text-xs">
                    Last verified: <strong>{v.lastVerifiedLabel}</strong>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Information not verified
                  </p>
                )}
                {v.priceSource ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Price source: {v.priceSource}
                  </p>
                ) : null}
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Specs and prices may vary by variant and city. Claimed range is not
                  guaranteed real-world range.
                </p>
              </div>
              <Link
                to="/ev/$categorySlug"
                params={{ categorySlug: v.categorySlug }}
                search={{ brand: brandSlug }}
                className="block rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-leaf"
              >
                More {v.brandName} EVs →
              </Link>
              <Link
                to="/ev/$categorySlug"
                params={{ categorySlug: v.categorySlug }}
                className="block rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-leaf"
              >
                All {v.categoryName} →
              </Link>
            </aside>
          </div>

          {similar.length > 0 ? (
            <section className="mt-12">
              <h2 className="font-display text-xl font-bold">Similar vehicles</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {similar.map((s) => (
                  <VehicleCard key={s.id} vehicle={s} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJson) }}
      />
      {faqJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}
        />
      ) : null}

      <SiteFooter />
    </div>
  );
}
