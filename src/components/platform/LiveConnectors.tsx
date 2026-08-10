import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { getLiveAvailability, type LiveAvailability } from "@/lib/availability.functions";

function timeAgo(iso: string) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.round(secs / 60)} min ago`;
}

export function LiveConnectors({
  stationId,
  fallback,
}: {
  stationId: string;
  fallback: LiveAvailability;
}) {
  const fetchLive = useServerFn(getLiveAvailability);

  const { data, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["availability", stationId],
    queryFn: () => fetchLive({ data: { stationId } }),
    // Smart caching: fresh for 20s, silent background refresh every 30s.
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev ?? fallback,
    retry: 1,
  });

  const live = data ?? fallback;
  const stale = isError;

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Connectors &amp; live availability</h2>
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
              (stale
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-secondary-foreground")
            }
          >
            <span
              className={
                "size-1.5 rounded-full " +
                (stale ? "bg-muted-foreground" : "bg-leaf animate-pulse")
              }
            />
            {stale ? "Last known reading" : `Live · ${timeAgo(new Date(dataUpdatedAt).toISOString())}`}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh availability"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface disabled:opacity-60"
          >
            {isFetching ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {live.available} of {live.total} bays free · refreshed automatically every 30 seconds.
      </p>

      <div
        className={
          "mt-4 grid gap-3 transition-opacity sm:grid-cols-2 " +
          (isFetching ? "opacity-70" : "opacity-100")
        }
      >
        {live.connectors.map((c) => (
          <div key={c.type} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">{c.type}</p>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {c.kind}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {c.bays} bay{c.bays > 1 ? "s" : ""} · up to {c.powerKw} kW
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: c.bays }).map((_, b) => (
                <span
                  key={b}
                  className={"h-2 flex-1 rounded-full " + (b < c.free ? "bg-leaf" : "bg-muted")}
                />
              ))}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Zap className="size-3" />
              {c.free > 0 ? `${c.free} available now` : `Occupied — avg wait ${c.waitMinutes} min`}
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

export type { LiveAvailability };
