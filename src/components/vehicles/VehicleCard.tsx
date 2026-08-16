import { Link } from "@tanstack/react-router";
import { Battery, Gauge, PlugZap, IndianRupee } from "lucide-react";
import type { VehicleListItem } from "@/lib/vehicles/queries";

type Props = {
  vehicle: VehicleListItem;
};

export function VehicleCard({ vehicle: v }: Props) {
  const detailParams = {
    categorySlug: v.categorySlug,
    brandSlug: v.brandSlug,
    vehicleSlug: v.slug,
  };

  return (
    <article className="ev-vehicle-card flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <Link
        to="/ev/$categorySlug/$brandSlug/$vehicleSlug"
        params={detailParams}
        className="block aspect-[16/10] overflow-hidden bg-surface"
      >
        {v.primaryImageUrl ? (
          <img
            src={v.primaryImageUrl}
            alt={v.primaryImageAlt || `${v.name} exterior`}
            className="size-full object-cover transition duration-300 hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-leaf/20 via-surface to-primary/10 text-muted-foreground">
            <Gauge className="size-10 opacity-50" aria-hidden />
            <span className="px-3 text-center text-xs font-semibold text-foreground/70">
              {v.name}
            </span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {v.brandName} · {v.categoryName}
        </p>
        <h3 className="mt-1 font-display text-base font-bold leading-snug">
          <Link
            to="/ev/$categorySlug/$brandSlug/$vehicleSlug"
            params={detailParams}
            className="hover:text-leaf"
          >
            {v.name}
          </Link>
        </h3>
        {v.shortDescription ? (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {v.shortDescription}
          </p>
        ) : null}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {v.startingPriceLabel ? (
            <div className="rounded-xl bg-surface px-2.5 py-2">
              <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <IndianRupee className="size-3" /> From
              </dt>
              <dd className="mt-0.5 font-semibold">{v.startingPriceLabel}</dd>
            </div>
          ) : null}
          {v.claimedRangeKm != null ? (
            <div className="rounded-xl bg-surface px-2.5 py-2">
              <dt className="text-[10px] text-muted-foreground">Claimed range</dt>
              <dd className="mt-0.5 font-semibold">
                {v.claimedRangeKm} km
                {v.rangeTestCycle ? (
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {v.rangeTestCycle}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {v.batteryKwh != null ? (
            <div className="rounded-xl bg-surface px-2.5 py-2">
              <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Battery className="size-3" /> Battery
              </dt>
              <dd className="mt-0.5 font-semibold">{v.batteryKwh} kWh</dd>
            </div>
          ) : null}
          {v.dcChargingKw != null || v.motorPowerKw != null ? (
            <div className="rounded-xl bg-surface px-2.5 py-2">
              <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <PlugZap className="size-3" />
                {v.dcChargingKw != null ? "DC charge" : "Power"}
              </dt>
              <dd className="mt-0.5 font-semibold">
                {v.dcChargingKw != null
                  ? `${v.dcChargingKw} kW`
                  : `${v.motorPowerKw} kW`}
              </dd>
            </div>
          ) : null}
        </dl>

        {v.lastVerifiedLabel ? (
          <p className="mt-3 text-[10px] text-muted-foreground">
            Last verified: {v.lastVerifiedLabel}
          </p>
        ) : (
          <p className="mt-3 text-[10px] text-muted-foreground">Information not verified</p>
        )}

        <Link
          to="/ev/$categorySlug/$brandSlug/$vehicleSlug"
          params={detailParams}
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
