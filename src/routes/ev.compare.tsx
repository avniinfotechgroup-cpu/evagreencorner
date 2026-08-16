import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, GitCompare, Loader2, X } from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { getEvCompare } from "@/lib/vehicles/public.functions";
import type { VehicleDetail } from "@/lib/vehicles/queries";

type CompareSearch = { v?: string };

export const Route = createFileRoute("/ev/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    const out: CompareSearch = {};
    if (typeof search["v"] === "string" && search["v"].trim()) {
      out.v = search["v"].trim();
    }
    return out;
  },
  head: () => {
    const title = `Compare Electric Vehicles in India | ${siteConfig.name}`;
    const description =
      "Compare 2–4 Indian EVs on price, battery, claimed range, charging, power, dimensions and warranty.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "robots", content: "noindex,follow" },
      ],
    };
  },
  component: EvComparePage,
});

function cell(v: string | number | null | undefined, suffix = "") {
  if (v == null || v === "" || v === 0) return "—";
  return `${v}${suffix}`;
}

function EvComparePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const load = useServerFn(getEvCompare);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState("");

  const slugs = useMemo(
    () =>
      (search.v || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    [search.v],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await load({ data: { v: slugs.join(",") } });
        if (!cancelled) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugs.join(","), load]);

  const setSlugs = (next: string[]) => {
    const v = next.slice(0, 4).join(",");
    void navigate({ search: v ? { v } : {} });
  };

  const vehicles = data?.vehicles ?? [];

  const rows: Array<{
    label: string;
    get: (v: VehicleDetail) => string;
  }> = [
    {
      label: "Starting price",
      get: (v) =>
        v.startingPriceLabel
          ? `${v.startingPriceLabel}${v.lastVerifiedLabel ? ` (verified ${v.lastVerifiedLabel})` : ""}`
          : "—",
    },
    {
      label: "Battery",
      get: (v) =>
        v.batteryKwh != null
          ? `${v.batteryKwh} kWh${v.batteryChemistry ? ` · ${v.batteryChemistry}` : ""}`
          : "—",
    },
    {
      label: "Claimed range",
      get: (v) =>
        v.claimedRangeKm != null
          ? `${v.claimedRangeKm} km${v.rangeTestCycle ? ` (${v.rangeTestCycle})` : ""}`
          : "—",
    },
    { label: "Motor power", get: (v) => cell(v.motorPowerKw, " kW") },
    { label: "Torque", get: (v) => cell(v.torqueNm, " Nm") },
    { label: "Top speed", get: (v) => cell(v.topSpeedKmph, " km/h") },
    { label: "DC charging", get: (v) => cell(v.dcChargingKw, " kW") },
    { label: "Connector", get: (v) => v.connector || "—" },
    { label: "Seating", get: (v) => cell(v.seating) },
    {
      label: "Dimensions (L×W×H)",
      get: (v) =>
        v.lengthMm && v.widthMm && v.heightMm
          ? `${v.lengthMm}×${v.widthMm}×${v.heightMm} mm`
          : "—",
    },
    { label: "Kerb weight", get: (v) => cell(v.kerbWeightKg, " kg") },
    { label: "Boot / cargo", get: (v) => cell(v.bootLitre, " L") },
    {
      label: "Safety rating",
      get: (v) =>
        v.safetyRating
          ? `${v.safetyRating}${v.safetyAgency ? ` (${v.safetyAgency})` : ""}`
          : "Not available",
    },
    {
      label: "Vehicle warranty",
      get: (v) =>
        v.vehicleWarrantyYears != null ? `${v.vehicleWarrantyYears} yr` : "—",
    },
    {
      label: "Battery warranty",
      get: (v) =>
        v.batteryWarrantyYears != null ? `${v.batteryWarrantyYears} yr` : "—",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 text-center">
            <BannerMenu />
            <nav
              aria-label="Breadcrumb"
              className="mt-4 flex flex-wrap items-center justify-center gap-1 text-xs text-primary-foreground/75"
            >
              <Link to="/ev" className="hover:text-primary-foreground">
                EVs
              </Link>
              <ChevronRight className="size-3" />
              <span className="text-primary-foreground">Compare</span>
            </nav>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              <GitCompare className="size-3.5" />
              Compare 2–4 vehicles
            </span>
            <h1 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Compare electric vehicles
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
              Side-by-side specs from our database. Claimed range includes test cycle when
              known — not guaranteed real-world range.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-end">
            <label className="flex-1 text-xs">
              <span className="text-muted-foreground">Add vehicle</span>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Select…</option>
                {(data?.picker ?? [])
                  .filter((p) => !slugs.includes(p.slug))
                  .map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.brandName} {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!pick || slugs.length >= 4}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => {
                if (!pick) return;
                setSlugs([...slugs, pick]);
                setPick("");
              }}
            >
              Add to compare
            </button>
          </div>

          {slugs.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {slugs.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold"
                >
                  {s}
                  <button
                    type="button"
                    aria-label={`Remove ${s}`}
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => setSlugs(slugs.filter((x) => x !== s))}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {loading ? (
            <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading comparison…
            </p>
          ) : null}

          {!loading && vehicles.length < 2 ? (
            <p className="mt-10 text-sm text-muted-foreground">
              Select at least two vehicles to compare. Shareable URL updates as you add
              models.
            </p>
          ) : null}

          {!loading && vehicles.length >= 2 ? (
            <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="sticky left-0 z-10 bg-surface px-3 py-3 text-xs font-semibold text-muted-foreground">
                      Spec
                    </th>
                    {vehicles.map((v) => (
                      <th key={v.id} className="min-w-[160px] px-3 py-3">
                        <Link
                          to="/ev/$categorySlug/$brandSlug/$vehicleSlug"
                          params={{
                            categorySlug: v.categorySlug,
                            brandSlug: v.brandSlug,
                            vehicleSlug: v.slug,
                          }}
                          className="font-display text-sm font-bold hover:text-leaf"
                        >
                          {v.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                          {v.brandName}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/70">
                      <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                        {row.label}
                      </th>
                      {vehicles.map((v) => (
                        <td key={v.id + row.label} className="px-3 py-2.5 align-top">
                          {row.get(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
