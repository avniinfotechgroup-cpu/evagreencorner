import { Layers, Locate, Minus, Plus } from "lucide-react";
import type { ChargingStation } from "@/data/stations";

interface Props {
  stations: ChargingStation[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Schematic map surface. The marker layer is provider-agnostic — swapping the
 * background for a real tile provider only requires replacing this shell.
 */
export function StationMap({ stations, activeId, onSelect }: Props) {
  const active = stations.find((s) => s.id === activeId) ?? stations[0];

  return (
    <div className="relative min-h-[26rem] overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
      {/* base */}
      <div className="absolute inset-0 grid-lines opacity-90" />
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 44 H100" stroke="var(--color-border)" strokeWidth="1.6" fill="none" />
        <path d="M52 0 V100" stroke="var(--color-border)" strokeWidth="1.6" fill="none" />
        <path d="M0 82 Q35 66 100 74" stroke="var(--color-border)" strokeWidth="1" fill="none" />
        <path d="M14 0 Q26 40 8 100" stroke="var(--color-border)" strokeWidth="1" fill="none" />
        <circle cx="80" cy="58" r="14" fill="color-mix(in oklab, var(--leaf) 16%, transparent)" />
        <circle cx="22" cy="20" r="10" fill="color-mix(in oklab, var(--sky) 14%, transparent)" />
      </svg>

      {/* markers */}
      <div className="absolute inset-0">
        {stations.map((s) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-label={s.name}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <span
                className={
                  "grid place-items-center rounded-full border-2 border-card font-display text-[10px] font-bold shadow-lift transition-all " +
                  (isActive
                    ? "size-9 bg-primary text-primary-foreground"
                    : s.available > 0
                      ? "size-7 bg-volt-gradient text-volt-foreground"
                      : "size-7 bg-muted text-muted-foreground")
                }
              >
                {s.available}
              </span>
              {isActive && (
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
              )}
            </button>
          );
        })}
      </div>

      {/* controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-1.5">
        {[Plus, Minus, Locate, Layers].map((Icon, i) => (
          <span
            key={i}
            className="grid size-9 place-items-center rounded-xl border border-border bg-card/90 text-muted-foreground shadow-soft backdrop-blur"
          >
            <Icon className="size-4" />
          </span>
        ))}
      </div>

      {/* active card */}
      {active && (
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-card/95 p-4 shadow-lift backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{active.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {active.area}, {active.city} · {active.maxPowerKw} kW · ₹{active.pricePerKwh}/kWh
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${active.name} ${active.address} ${active.city}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
