import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  adminGetPlatformCms,
  adminSetModuleFlag,
  adminUpsertRouteVehicle,
  adminUpsertSolarLocation,
} from "@/lib/platform/cms.functions";
import { AdminPageSeoManager } from "@/components/admin/AdminPageSeoManager";

type Props = {
  token: string;
  onMsg: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

type CmsData = Awaited<ReturnType<typeof adminGetPlatformCms>>;

export function AdminModulesSeoPanel({ token, onMsg, onError }: Props) {
  const loadCms = useServerFn(adminGetPlatformCms);
  const saveModule = useServerFn(adminSetModuleFlag);
  const saveSolar = useServerFn(adminUpsertSolarLocation);
  const saveVehicle = useServerFn(adminUpsertRouteVehicle);

  const [data, setData] = useState<CmsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<"seo" | "modules" | "solar" | "vehicles">("seo");

  const refresh = async () => {
    setLoading(true);
    onError(null);
    try {
      const res = await loadCms({ data: { token } });
      setData(res);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load CMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && !data) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading modules & SEO…
      </p>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["seo", "Page SEO"],
            ["modules", "Modules on/off"],
            ["solar", "Solar locations"],
            ["vehicles", "Route vehicles"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold " +
              (sub === id
                ? "border-transparent bg-volt-gradient text-volt-foreground"
                : "border-border text-muted-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "seo" ? (
        <AdminPageSeoManager
          token={token}
          pages={data.pages}
          busy={busy}
          setBusy={setBusy}
          onMsg={onMsg}
          onError={onError}
          onRefresh={refresh}
        />
      ) : null}

      {sub === "modules" ? (
        <ul className="space-y-2">
          {data.modules.map((m) => (
            <li
              key={m.module_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-display text-sm font-bold">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {m.module_id} · {m.href}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void saveModule({
                    data: { token, moduleId: m.module_id, enabled: !m.enabled },
                  })
                    .then(() => {
                      onMsg(`${m.title} ${m.enabled ? "disabled" : "enabled"}`);
                      return refresh();
                    })
                    .catch((err) =>
                      onError(err instanceof Error ? err.message : "Update failed"),
                    )
                    .finally(() => setBusy(false));
                }}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold " +
                  (m.enabled
                    ? "bg-leaf/15 text-leaf"
                    : "bg-muted text-muted-foreground")
                }
              >
                {m.enabled ? "Enabled" : "Disabled"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {sub === "solar" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Edit DISCOM tariff, sun-hour benchmarks and installed ₹/kW used by the solar
            calculator.
          </p>
          {data.solar.map((l) => (
            <form
              key={l.slug}
              className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                void saveSolar({
                  data: {
                    token,
                    slug: l.slug,
                    name: String(fd.get("name") || l.name),
                    state: String(fd.get("state") || l.state),
                    discom: String(fd.get("discom") || l.discom),
                    lat: Number(fd.get("lat")),
                    lng: Number(fd.get("lng")),
                    sunHours: Number(fd.get("sunHours")),
                    tariff: Number(fd.get("tariff")),
                    costPerKw: Number(fd.get("costPerKw")),
                    gridCo2: Number(fd.get("gridCo2")),
                    notes: String(fd.get("notes") || ""),
                    active: true,
                  },
                })
                  .then(() => {
                    onMsg(`Solar location ${l.slug} saved`);
                    return refresh();
                  })
                  .catch((err) =>
                    onError(err instanceof Error ? err.message : "Save failed"),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <p className="sm:col-span-2 font-display text-sm font-bold">{l.slug}</p>
              {(
                [
                  ["name", "City", l.name],
                  ["state", "State", l.state],
                  ["discom", "DISCOM", l.discom],
                  ["lat", "Lat", String(l.lat)],
                  ["lng", "Lng", String(l.lng)],
                  ["sunHours", "Sun hrs/day", String(l.sunHours)],
                  ["tariff", "₹/kWh", String(l.tariff)],
                  ["costPerKw", "₹/kW installed", String(l.costPerKw)],
                  ["gridCo2", "kg CO₂/kWh", String(l.gridCo2)],
                ] as const
              ).map(([name, label, value]) => (
                <label key={name} className="text-[11px] font-semibold text-muted-foreground">
                  {label}
                  <input
                    name={name}
                    defaultValue={value}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              ))}
              <label className="sm:col-span-2 text-[11px] font-semibold text-muted-foreground">
                Notes
                <input
                  name="notes"
                  defaultValue={l.notes ?? ""}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="sm:col-span-2 w-fit rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Save location
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {sub === "vehicles" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Route planner vehicle catalog — battery (kWh) and planning range (km). Mark battery
            swap only for swap-network scooters / 3W.
          </p>
          {data.vehicles.map((v) => (
            <form
              key={v.id}
              className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                void saveVehicle({
                  data: {
                    token,
                    id: v.id,
                    name: String(fd.get("name") || v.name),
                    brand: String(fd.get("brand") || ""),
                    segment: String(fd.get("segment") || ""),
                    batteryKwh: Number(fd.get("batteryKwh")),
                    rangeKm: Number(fd.get("rangeKm")),
                    connector: String(fd.get("connector") || "CCS2"),
                    batterySwap: fd.get("batterySwap") === "on",
                    active: true,
                  },
                })
                  .then(() => {
                    onMsg(`Vehicle ${v.id} saved`);
                    return refresh();
                  })
                  .catch((err) =>
                    onError(err instanceof Error ? err.message : "Save failed"),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <p className="sm:col-span-2 font-mono text-xs font-semibold text-leaf">{v.id}</p>
              {(
                [
                  ["name", "Name", v.name],
                  ["brand", "Brand", v.brand ?? ""],
                  ["segment", "Segment", v.segment ?? ""],
                  ["batteryKwh", "Battery kWh", String(v.batteryKwh)],
                  ["rangeKm", "Range km", String(v.rangeKm)],
                  ["connector", "Connector", v.connector],
                ] as const
              ).map(([name, label, value]) => (
                <label key={name} className="text-[11px] font-semibold text-muted-foreground">
                  {label}
                  <input
                    name={name}
                    defaultValue={value}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              ))}
              <label className="inline-flex items-center gap-2 text-xs sm:col-span-2">
                <input
                  name="batterySwap"
                  type="checkbox"
                  defaultChecked={v.batterySwap}
                />
                Battery swap vehicle
              </label>
              <button
                type="submit"
                disabled={busy}
                className="sm:col-span-2 w-fit rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Save vehicle
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
