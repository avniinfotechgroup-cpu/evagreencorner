import { Info, Zap } from "lucide-react";

export interface StationConnectorInfo {
  type: string;
  bays: number;
  powerKw: number | null;
  kind: "DC fast" | "AC";
}

/**
 * Connector details only. Live bay occupancy is never invented —
 * show UNKNOWN until a real-time provider feed is wired.
 */
export function LiveConnectors({
  connectors,
  totalBays,
}: {
  stationId?: string;
  connectors: StationConnectorInfo[];
  totalBays: number;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Connectors</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          Availability unknown
        </span>
      </div>

      <p className="mt-1 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Availability information unavailable. We only show live status when a
        reliable real-time source provides it. {totalBays} bay
        {totalBays === 1 ? "" : "s"} listed for this station.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {connectors.map((c) => (
          <div key={c.type} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">{c.type}</p>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {c.kind}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {c.bays} bay{c.bays > 1 ? "s" : ""} ·{" "}
              {c.powerKw != null && c.powerKw > 0 ? `up to ${c.powerKw} kW` : "Power N/A"}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: c.bays }).map((_, b) => (
                <span key={b} className="h-2 flex-1 rounded-full bg-muted" />
              ))}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Zap className="size-3" />
              Live status not available
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ConnectorsSkeleton() {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="h-5 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
        ))}
      </div>
    </section>
  );
}
