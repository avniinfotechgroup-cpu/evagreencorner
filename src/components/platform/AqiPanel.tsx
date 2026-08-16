import { Activity, Gauge, Wind } from "lucide-react";
import { aqiCategory, usAqiCategory, type AirQuality } from "@/data/aqi";

interface Props {
  data: AirQuality;
  compact?: boolean;
}

export function AqiPanel({ data, compact = false }: Props) {
  const cat = data.scale === "us" ? usAqiCategory(data.aqi) : aqiCategory(data.aqi);
  const trend = data.trend.length ? data.trend : [{ day: "Now", aqi: data.aqi }];
  const max = Math.max(...trend.map((t) => t.aqi), 1);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Wind className="size-3.5 text-leaf" />
            Air quality · {data.area}
            {data.source === "live" ? (
              <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-bold text-leaf">
                LIVE
              </span>
            ) : null}
          </span>
          <div className="mt-3 flex items-end gap-3">
            <p className="font-display text-4xl font-bold leading-none">{data.aqi}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cat.cls}`}>
              {cat.label}
            </span>
          </div>
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">{cat.advice}</p>
          {data.dominant ? (
            <p className="mt-1 text-xs font-medium text-foreground">
              Dominant pollutant: {data.dominant}
            </p>
          ) : null}
        </div>

        <div className="text-right text-[11px] text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <Activity className="size-3.5 text-leaf" />
            {data.station}
          </p>
          <p className="mt-1">{data.updated}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          7-day trend
        </p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {trend.map((t, idx) => {
            const tone = data.scale === "us" ? usAqiCategory(t.aqi) : aqiCategory(t.aqi);
            return (
              <div key={`${t.day}-${idx}`} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{t.aqi}</span>
                <div
                  className={`w-full rounded-t-md ${tone.dot}`}
                  style={{ height: `${Math.max(8, (t.aqi / max) * 62)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{t.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!compact && data.pollutants.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.pollutants.map((p) => (
            <div key={p.code} className="rounded-xl border border-border bg-surface p-3">
              <p className="text-[11px] text-muted-foreground">{p.label}</p>
              <p className="mt-1 font-display text-base font-bold">
                {p.value}
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">{p.unit}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-volt-gradient"
                  style={{ width: `${Math.min(100, (p.value / p.limit) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Gauge className="size-3.5" />
        {data.scale === "us"
          ? "US EPA AQI scale (0–500)."
          : "Indian National AQI scale (CPCB), 0–500."}
      </p>
    </div>
  );
}
