import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { siteConfig } from "@/config/platform";
import {
  adminAddStation,
  adminBulkDeleteStations,
  adminDeleteStation,
  adminGetDashboard,
  adminImportStationsCsv,
  adminToggleStation,
  adminUpdateRedeemStatus,
} from "@/lib/community/admin.functions";
import { adminListDirectory } from "@/lib/community/directory.functions";
import { AdminEvServicesPanel } from "@/components/platform/AdminEvServicesPanel";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import {
  adminAddBrand,
  adminAddVehicle,
  adminEvDashboard,
  adminImportEvCsv,
  adminPreviewEvCsv,
  adminRefreshEvSitemap,
  adminRunEvJobs,
  adminRunEvSync,
  adminSoftDeleteVehicle,
  adminToggleVehiclePublish,
  adminUploadVehicleImage,
} from "@/lib/vehicles/admin.functions";
import {
  adminMarketplaceDashboard,
  adminSetProviderVerification,
  adminUpdateLeadStatus,
} from "@/lib/marketplace/admin.functions";
import {
  adminJobsDashboard,
} from "@/lib/jobs/admin.functions";
import { AdminJobsPanel } from "@/components/admin/AdminJobsPanel";
import { AdminJournalPanel } from "@/components/admin/AdminJournalPanel";
import { adminJournalDashboard } from "@/lib/journal/admin.functions";
import { useAuth } from "@/lib/community/useAuth";
import { AdminModulesSeoPanel } from "@/components/admin/AdminModulesSeoPanel";
import { AdminNavVisibilityPanel } from "@/components/admin/AdminNavVisibilityPanel";
import { AdminHomePanel } from "@/components/admin/AdminHomePanel";
import { AdminAnalyticsPanel } from "@/components/admin/AdminAnalyticsPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `Admin panel | ${siteConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tab = AdminTab;

function AdminPage() {
  const { user, token, ready } = useAuth();
  const fetchDash = useServerFn(adminGetDashboard);
  const addStation = useServerFn(adminAddStation);
  const importCsv = useServerFn(adminImportStationsCsv);
  const deleteStation = useServerFn(adminDeleteStation);
  const bulkDeleteStations = useServerFn(adminBulkDeleteStations);
  const toggleStation = useServerFn(adminToggleStation);
  const updateRedeem = useServerFn(adminUpdateRedeemStatus);
  const fetchDirectory = useServerFn(adminListDirectory);
  const fetchEv = useServerFn(adminEvDashboard);
  const addVehicle = useServerFn(adminAddVehicle);
  const toggleVehicle = useServerFn(adminToggleVehiclePublish);
  const deleteVehicle = useServerFn(adminSoftDeleteVehicle);
  const addBrand = useServerFn(adminAddBrand);
  const previewCsv = useServerFn(adminPreviewEvCsv);
  const importCsvEv = useServerFn(adminImportEvCsv);
  const runSync = useServerFn(adminRunEvSync);
  const runJobs = useServerFn(adminRunEvJobs);
  const refreshSitemap = useServerFn(adminRefreshEvSitemap);
  const uploadImage = useServerFn(adminUploadVehicleImage);
  const fetchMarketplace = useServerFn(adminMarketplaceDashboard);
  const setProviderVerification = useServerFn(adminSetProviderVerification);
  const updateLeadStatus = useServerFn(adminUpdateLeadStatus);
  const fetchJobsDash = useServerFn(adminJobsDashboard);
  const fetchJournalDash = useServerFn(adminJournalDashboard);

  const [tab, setTab] = useState<Tab>("stations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stationQuery, setStationQuery] = useState("");
  const [stationStatus, setStationStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );
  const [stationPage, setStationPage] = useState(1);
  const [stationPageSize, setStationPageSize] = useState(10);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [dash, setDash] = useState<Awaited<ReturnType<typeof fetchDash>> | null>(
    null,
  );
  const [directory, setDirectory] = useState<Awaited<
    ReturnType<typeof fetchDirectory>
  > | null>(null);
  const [evDash, setEvDash] = useState<Awaited<ReturnType<typeof fetchEv>> | null>(
    null,
  );
  const [mktDash, setMktDash] = useState<Awaited<
    ReturnType<typeof fetchMarketplace>
  > | null>(null);
  const [jobsDash, setJobsDash] = useState<Awaited<
    ReturnType<typeof fetchJobsDash>
  > | null>(null);
  const [journalDash, setJournalDash] = useState<Awaited<
    ReturnType<typeof fetchJournalDash>
  > | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [csvText, setCsvText] = useState("");

  const [form, setForm] = useState({
    name: "",
    operator: "",
    address: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    lat: "",
    lng: "",
    connectors: "CCS2, Type 2",
    maxPowerKw: "",
    pricePerKwh: "",
    totalPoints: "2",
    open24: true,
    phone: "",
    notes: "",
    batterySwap: false,
  });

  const [evForm, setEvForm] = useState({
    brandId: "",
    categoryId: "",
    name: "",
    modelName: "",
    shortDescription: "",
    status: "available" as
      | "upcoming"
      | "available"
      | "discontinued"
      | "temporarily_unavailable",
    batteryKwh: "",
    batteryChemistry: "LFP",
    claimedRangeKm: "",
    rangeTestCycle: "MIDC",
    motorPowerKw: "",
    startingPrice: "",
    priceSource: "",
    isFeatured: false,
    published: true,
  });
  const [newBrandName, setNewBrandName] = useState("");
  const [evCsvText, setEvCsvText] = useState("");
  const [evCsvPreview, setEvCsvPreview] = useState<{
    validCount: number;
    errorCount: number;
    rows: Array<{ row: number; ok: boolean; errors: string[] }>;
  } | null>(null);
  const [imgVehicleId, setImgVehicleId] = useState("");
  const [imgAlt, setImgAlt] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [res, dir, ev] = await Promise.all([
        fetchDash({ data: { token } }),
        fetchDirectory({ data: { token } }),
        fetchEv({ data: { token } }),
      ]);
      setDash(res);
      setDirectory(dir);
      setEvDash(ev);
      setEvForm((f) => ({
        ...f,
        brandId: f.brandId || ev.brands[0]?.id || "",
        categoryId:
          f.categoryId ||
          ev.categories.find((c) => !c.parentId)?.id ||
          ev.categories[0]?.id ||
          "",
      }));
    } catch (err) {
      setDash(null);
      setDirectory(null);
      setEvDash(null);
      const message = err instanceof Error ? err.message : "Admin load failed";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (!token || !user?.isAdmin) {
      setLoading(false);
      return;
    }
    void reload().catch(() => {
      /* error already surfaced via setError */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, user?.isAdmin]);

  useEffect(() => {
    if (!ready || !token || !user?.isAdmin) return;
    if (tab !== "marketplace" && tab !== "jobs" && tab !== "journal") return;

    let cancelled = false;
    void (async () => {
      setModuleLoading(true);
      setError(null);
      try {
        if (tab === "marketplace") {
          const res = await fetchMarketplace({ data: { token } });
          if (!cancelled) setMktDash(res);
        } else if (tab === "jobs") {
          const res = await fetchJobsDash({ data: { token } });
          if (!cancelled) setJobsDash(res);
        } else {
          const res = await fetchJournalDash({ data: { token } });
          if (!cancelled) setJournalDash(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Module dashboard failed");
        }
      } finally {
        if (!cancelled) setModuleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tab,
    ready,
    token,
    user?.isAdmin,
    fetchMarketplace,
    fetchJobsDash,
    fetchJournalDash,
  ]);

  const filteredStations = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    return (dash?.stations ?? []).filter((s) => {
      if (stationStatus === "active" && !s.active) return false;
      if (stationStatus === "hidden" && s.active) return false;
      if (!q) return true;
      const hay = `${s.name} ${s.operator || ""} ${s.city || ""} ${s.state || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [dash?.stations, stationQuery, stationStatus]);

  useEffect(() => {
    setStationPage(1);
    setSelectedStations(new Set());
  }, [stationQuery, stationStatus, stationPageSize]);

  const stationTotalPages = Math.max(
    1,
    Math.ceil(filteredStations.length / stationPageSize),
  );
  const stationSafePage = Math.min(stationPage, stationTotalPages);
  const stationPageRows = filteredStations.slice(
    (stationSafePage - 1) * stationPageSize,
    stationSafePage * stationPageSize,
  );
  const stationPageIds = stationPageRows.map((s) => s.id);
  const allStationsOnPageSelected =
    stationPageIds.length > 0 &&
    stationPageIds.every((id) => selectedStations.has(id));

  if (ready && (!user || !user.isAdmin)) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <Shield className="mx-auto size-8 text-leaf" />
          <h1 className="mt-4 font-display text-3xl font-bold">Admin panel</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Login with the admin account to add EV stations (form / Excel CSV) and manage
            cash redeems.
          </p>
          <Link
            to="/login"
            search={{ redirect: "/admin" }}
            className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Admin login
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <AdminShell
        tab={tab}
        onTabChange={(id) => {
          setTab(id);
          setMsg(null);
          setError(null);
        }}
        stats={{
          ...(dash?.stats.curatedStations != null
            ? { stations: dash.stats.curatedStations }
            : {}),
          ...(dash?.stats.activeStations != null
            ? { activeStations: dash.stats.activeStations }
            : {}),
          directory: directory?.providers.length ?? 0,
          ...(evDash?.stats.publishedVehicles != null
            ? { evs: evDash.stats.publishedVehicles }
            : {}),
          ...(dash?.stats.pendingRedeems != null
            ? { pendingRedeems: dash.stats.pendingRedeems }
            : {}),
        }}
      >
        {(error || msg) && (
          <p
            className={
              "mb-4 rounded-2xl border px-4 py-3 text-sm " +
              (error
                ? "border-destructive/40 text-destructive"
                : "border-border text-foreground")
            }
          >
            {error || msg}
          </p>
        )}

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading admin data…
          </p>
        ) : null}

        {!loading && tab === "stations" && (
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="space-y-3 border-b border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold">Stations</h2>
                <button
                  type="button"
                  disabled={busy || selectedStations.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                  onClick={async () => {
                    if (!token) return;
                    const ids = [...selectedStations];
                    if (
                      !confirm(
                        `Delete ${ids.length} selected station(s)? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    setBusy(true);
                    setError(null);
                    setMsg(null);
                    try {
                      const res = await bulkDeleteStations({ data: { token, ids } });
                      setMsg(`Deleted ${res.deleted} station(s).`);
                      setSelectedStations(new Set());
                      await reload();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Bulk delete failed",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Bulk delete ({selectedStations.size})
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="relative text-xs font-semibold sm:col-span-2">
                  <span className="sr-only">Search stations</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    placeholder="Search name, operator, city…"
                    className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Status
                  <select
                    value={stationStatus}
                    onChange={(e) =>
                      setStationStatus(e.target.value as "all" | "active" | "hidden")
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allStationsOnPageSelected}
                        aria-label="Select page"
                        onChange={() => {
                          setSelectedStations((prev) => {
                            const next = new Set(prev);
                            if (allStationsOnPageSelected) {
                              for (const id of stationPageIds) next.delete(id);
                            } else {
                              for (const id of stationPageIds) next.add(id);
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Station</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Lat/Lng</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stationPageRows.map((s) => (
                    <tr key={s.id} className="border-b border-border/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStations.has(s.id)}
                          aria-label={`Select ${s.name}`}
                          onChange={() => {
                            setSelectedStations((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.id)) next.delete(s.id);
                              else next.add(s.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.operator || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (s.active
                              ? "bg-leaf/15 text-foreground"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {s.active ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                            onClick={async () => {
                              if (!token) return;
                              await toggleStation({
                                data: { token, id: s.id, active: !s.active },
                              });
                              await reload();
                            }}
                          >
                            {s.active ? "Hide" : "Show"}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-destructive"
                            onClick={async () => {
                              if (!token) return;
                              if (!confirm(`Delete ${s.name}?`)) return;
                              await deleteStation({ data: { token, id: s.id } });
                              setSelectedStations((prev) => {
                                const next = new Set(prev);
                                next.delete(s.id);
                                return next;
                              });
                              await reload();
                            }}
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!stationPageRows.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        No stations match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={stationSafePage}
              pageSize={stationPageSize}
              total={filteredStations.length}
              onPageChange={setStationPage}
              onPageSizeChange={setStationPageSize}
            />
          </section>
        )}

        {!loading && tab === "add" && (
          <form
            className="mt-6 grid gap-3 rounded-3xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token) return;
              setBusy(true);
              setError(null);
              setMsg(null);
              try {
                const res = await addStation({
                  data: {
                    token,
                    station: {
                      name: form.name,
                      operator: form.operator || undefined,
                      address: form.address || undefined,
                      area: form.area || undefined,
                      city: form.city || undefined,
                      state: form.state || undefined,
                      pincode: form.pincode || undefined,
                      lat: Number(form.lat),
                      lng: Number(form.lng),
                      connectors: form.connectors || "CCS2",
                      maxPowerKw: form.maxPowerKw ? Number(form.maxPowerKw) : null,
                      pricePerKwh: form.pricePerKwh ? Number(form.pricePerKwh) : null,
                      totalPoints: form.totalPoints ? Number(form.totalPoints) : 1,
                      open24: form.open24,
                      phone: form.phone || null,
                      notes: form.notes || null,
                      batterySwap: form.batterySwap,
                    },
                  },
                });
                setMsg(`Station added (${res.id}). It will show in nearby search.`);
                setForm((f) => ({ ...f, name: "", address: "", lat: "", lng: "" }));
                setTab("stations");
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add station");
              } finally {
                setBusy(false);
              }
            }}
          >
            {(
              [
                ["name", "Station name *"],
                ["operator", "Operator"],
                ["address", "Address"],
                ["area", "Area"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Pincode"],
                ["lat", "Latitude *"],
                ["lng", "Longitude *"],
                ["connectors", "Connectors (comma separated)"],
                ["maxPowerKw", "Max power kW"],
                ["pricePerKwh", "Price ₹/kWh"],
                ["totalPoints", "Charging points"],
                ["phone", "Phone"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs font-semibold">
                {label}
                <input
                  required={key === "name" || key === "lat" || key === "lng"}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            ))}
            <label className="text-xs font-semibold sm:col-span-2">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.open24}
                onChange={(e) => setForm((f) => ({ ...f, open24: e.target.checked }))}
              />
              Open 24×7
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.batterySwap}
                onChange={(e) => setForm((f) => ({ ...f, batterySwap: e.target.checked }))}
              />
              Battery swap
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:col-span-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save station
            </button>
          </form>
        )}

        {!loading && tab === "import" && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
              <Upload className="size-5 text-leaf" />
              Import from Excel / CSV
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Excel mein list banao → <strong>Save As → CSV</strong> → yahan upload / paste.
              Required columns: <code>name, lat, lng</code>. Optional:{" "}
              <code>operator, address, area, city, state, pincode, connectors, maxPowerKw,
              pricePerKwh, totalPoints, phone, notes</code>
            </p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-surface p-3 text-[11px] text-muted-foreground">
{`name,lat,lng,city,state,operator,connectors,maxPowerKw,totalPoints
Tata Power CP,28.6328,77.2197,New Delhi,Delhi,Tata Power,"CCS2, Type 2",60,4
BPCL Hub,19.0760,72.8777,Mumbai,Maharashtra,BPCL,CCS2,50,2`}
            </pre>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-4 block w-full text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCsvText(await file.text());
              }}
            />
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              placeholder="Paste CSV here…"
              className="mt-3 w-full rounded-2xl border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              disabled={busy || !csvText.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              onClick={async () => {
                if (!token) return;
                setBusy(true);
                setError(null);
                setMsg(null);
                try {
                  const res = await importCsv({ data: { token, csvText } });
                  setMsg(
                    `Imported ${res.imported} stations` +
                      (res.failed ? ` (${res.failed} failed)` : "") +
                      (res.errors.length ? `. ${res.errors[0]}` : ""),
                  );
                  setTab("stations");
                  await reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Import failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Import stations
            </button>
          </section>
        )}

        {!loading && tab === "directory" && token && (
          <AdminEvServicesPanel
            token={token}
            directory={directory}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setMsg={setMsg}
            onReload={reload}
          />
        )}

        {!loading && tab === "ev" && (
          <section className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Total: {evDash?.stats.totalVehicles ?? 0}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Published: {evDash?.stats.publishedVehicles ?? 0}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Available: {evDash?.stats.available ?? 0}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Upcoming: {evDash?.stats.upcoming ?? 0}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Brands: {evDash?.stats.brands ?? 0}
              </span>
              <span className="rounded-full border border-amber-500/40 px-3 py-1.5 font-semibold">
                Stale prices: {evDash?.stale.priceNeedsVerification ?? 0}
              </span>
              <span className="rounded-full border border-amber-500/40 px-3 py-1.5 font-semibold">
                Stale specs: {evDash?.stale.specsNeedVerification ?? 0}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                Pending sync: {evDash?.pendingCount ?? 0}
              </span>
              <Link
                to="/ev"
                className="rounded-full border border-border px-3 py-1.5 font-semibold text-leaf"
              >
                Open public /ev
              </Link>
              <Link
                to="/ev/compare"
                className="rounded-full border border-border px-3 py-1.5 font-semibold text-leaf"
              >
                Compare
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !token}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
                onClick={async () => {
                  if (!token) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await runSync({ data: { token } });
                    const summary =
                      res.results
                        .map((r) => `${r.providerId} +${r.createdPending} pending`)
                        .join("; ") || "no providers ran";
                    setMsg(
                      res.hint
                        ? `Sync finished (${summary}). ${res.hint}`
                        : `Sync done: ${summary}`,
                    );
                    try {
                      await reload();
                    } catch (reloadErr) {
                      setError(
                        reloadErr instanceof Error
                          ? `Sync ok, but refresh failed: ${reloadErr.message}`
                          : "Sync ok, but dashboard refresh failed",
                      );
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Sync failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Run API sync
              </button>
              <button
                type="button"
                disabled={busy || !token}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
                onClick={async () => {
                  if (!token) return;
                  setBusy(true);
                  try {
                    const res = await runJobs({ data: { token } });
                    setMsg(
                      `Jobs: sitemap ${res.sitemap.urlCount} URLs; stale prices ${res.stale.priceNeedsVerification}`,
                    );
                    await reload();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Jobs failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Run maintenance jobs
              </button>
              <button
                type="button"
                disabled={busy || !token}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
                onClick={async () => {
                  if (!token) return;
                  setBusy(true);
                  try {
                    const res = await refreshSitemap({ data: { token } });
                    setMsg(`Sitemap refreshed: ${res.urlCount} URLs → ${res.path}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Sitemap failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Refresh sitemap
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <form
                className="rounded-3xl border border-border bg-card p-5 shadow-soft"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!token) return;
                  setBusy(true);
                  setError(null);
                  setMsg(null);
                  try {
                    const res = await addVehicle({
                      data: {
                        token,
                        vehicle: {
                          brandId: evForm.brandId,
                          categoryId: evForm.categoryId,
                          name: evForm.name,
                          modelName: evForm.modelName || undefined,
                          shortDescription: evForm.shortDescription || undefined,
                          status: evForm.status,
                          batteryKwh: evForm.batteryKwh
                            ? Number(evForm.batteryKwh)
                            : null,
                          batteryChemistry: evForm.batteryChemistry || undefined,
                          claimedRangeKm: evForm.claimedRangeKm
                            ? Number(evForm.claimedRangeKm)
                            : null,
                          rangeTestCycle: evForm.rangeTestCycle || undefined,
                          motorPowerKw: evForm.motorPowerKw
                            ? Number(evForm.motorPowerKw)
                            : null,
                          startingPrice: evForm.startingPrice
                            ? Number(evForm.startingPrice)
                            : null,
                          priceSource: evForm.priceSource || undefined,
                          isFeatured: evForm.isFeatured,
                          published: evForm.published,
                          sourceName: "Admin verified",
                        },
                      },
                    });
                    setMsg(`Vehicle saved: ${res.slug}`);
                    setEvForm((f) => ({
                      ...f,
                      name: "",
                      modelName: "",
                      shortDescription: "",
                      batteryKwh: "",
                      claimedRangeKm: "",
                      motorPowerKw: "",
                      startingPrice: "",
                      priceSource: "",
                    }));
                    await reload();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Save failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2 className="font-display text-lg font-bold">Add vehicle</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Do not enter unverified prices without a source. Range must include test
                  cycle when known.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Brand
                    <select
                      required
                      value={evForm.brandId}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, brandId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      {(evDash?.brands ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Category
                    <select
                      required
                      value={evForm.categoryId}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, categoryId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      {(evDash?.categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs sm:col-span-2">
                    Name
                    <input
                      required
                      value={evForm.name}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      placeholder="Tata Punch EV"
                    />
                  </label>
                  <label className="text-xs">
                    Model
                    <input
                      value={evForm.modelName}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, modelName: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Status
                    <select
                      value={evForm.status}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          status: e.target.value as typeof f.status,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      <option value="available">Available</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="temporarily_unavailable">Temporarily unavailable</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Battery kWh
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={evForm.batteryKwh}
                      onChange={(e) =>
                        setEvForm((f) => ({ ...f, batteryKwh: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Chemistry
                    <select
                      value={evForm.batteryChemistry}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          batteryChemistry: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      <option>LFP</option>
                      <option>NMC</option>
                      <option>NCA</option>
                      <option>Lithium Ion</option>
                      <option>Other</option>
                      <option>Unknown</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Claimed range (km)
                    <input
                      type="number"
                      min="0"
                      value={evForm.claimedRangeKm}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          claimedRangeKm: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Test cycle
                    <input
                      value={evForm.rangeTestCycle}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          rangeTestCycle: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      placeholder="MIDC / IDC"
                    />
                  </label>
                  <label className="text-xs">
                    Motor kW
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={evForm.motorPowerKw}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          motorPowerKw: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Starting price (INR)
                    <input
                      type="number"
                      min="0"
                      value={evForm.startingPrice}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          startingPrice: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    Price source (required if price set)
                    <input
                      value={evForm.priceSource}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          priceSource: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      placeholder="OEM website / dealer quote date"
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    Short description
                    <textarea
                      value={evForm.shortDescription}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          shortDescription: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      rows={2}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={evForm.isFeatured}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          isFeatured: e.target.checked,
                        }))
                      }
                    />
                    Featured on /ev
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={evForm.published}
                      onChange={(e) =>
                        setEvForm((f) => ({
                          ...f,
                          published: e.target.checked,
                        }))
                      }
                    />
                    Published
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Save vehicle
                </button>
              </form>

              <div className="space-y-4">
                <form
                  className="rounded-3xl border border-border bg-card p-5 shadow-soft"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token || !newBrandName.trim()) return;
                    setBusy(true);
                    try {
                      await addBrand({
                        data: { token, name: newBrandName.trim() },
                      });
                      setMsg(`Brand added: ${newBrandName}`);
                      setNewBrandName("");
                      await reload();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Brand failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <h2 className="font-display text-lg font-bold">Add brand</h2>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
                      placeholder="Brand name"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <h2 className="font-display text-lg font-bold">CSV import</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Headers: brand, model, name, category, battery_kwh, chemistry, claimed_range_km,
                    test_cycle, motor_kw, price, source. Preview before import.
                  </p>
                  <textarea
                    value={evCsvText}
                    onChange={(e) => setEvCsvText(e.target.value)}
                    rows={5}
                    className="mt-3 w-full rounded-xl border border-border px-3 py-2 font-mono text-xs"
                    placeholder="brand,model,claimed_range_km,test_cycle,battery_kwh,price,source"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !token || !evCsvText.trim()}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                      onClick={async () => {
                        if (!token) return;
                        setBusy(true);
                        try {
                          const res = await previewCsv({
                            data: { token, csv: evCsvText },
                          });
                          setEvCsvPreview({
                            validCount: res.validCount,
                            errorCount: res.errorCount,
                            rows: res.rows
                              .filter((r) => !r.ok)
                              .slice(0, 8)
                              .map((r) => ({
                                row: r.row,
                                ok: r.ok,
                                errors: r.errors,
                              })),
                          });
                          setMsg(
                            `CSV preview: ${res.validCount} valid, ${res.errorCount} errors`,
                          );
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Preview failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={busy || !token || !evCsvText.trim()}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      onClick={async () => {
                        if (!token) return;
                        if (!confirm("Import CSV into pending verification queue?")) return;
                        setBusy(true);
                        try {
                          const res = await importCsvEv({
                            data: {
                              token,
                              csv: evCsvText,
                              mode: "pending_only",
                            },
                          });
                          setMsg(
                            `Imported ${res.imported} to pending (${res.skipped} skipped)`,
                          );
                          await reload();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Import failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Import → pending
                    </button>
                  </div>
                  {evCsvPreview?.rows.length ? (
                    <ul className="mt-3 space-y-1 text-[11px] text-destructive">
                      {evCsvPreview.rows.map((r) => (
                        <li key={r.row}>
                          Row {r.row}: {r.errors.join("; ")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <h2 className="font-display text-lg font-bold">Upload image</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPEG/PNG/WebP only. ALT text required. Stored under /uploads/vehicles.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <select
                      value={imgVehicleId}
                      onChange={(e) => setImgVehicleId(e.target.value)}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      <option value="">Select vehicle…</option>
                      {(evDash?.vehicles ?? []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={imgAlt}
                      onChange={(e) => setImgAlt(e.target.value)}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                      placeholder="ALT text e.g. Tata Nexon EV front exterior"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setImgFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={busy || !token || !imgVehicleId || !imgAlt || !imgFile}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      onClick={async () => {
                        if (!token || !imgFile) return;
                        setBusy(true);
                        try {
                          const buf = await imgFile.arrayBuffer();
                          const bytes = new Uint8Array(buf);
                          let binary = "";
                          for (let i = 0; i < bytes.length; i++) {
                            binary += String.fromCharCode(bytes[i]!);
                          }
                          const base64 = btoa(binary);
                          const mimeType = (
                            imgFile.type === "image/png"
                              ? "image/png"
                              : imgFile.type === "image/webp"
                                ? "image/webp"
                                : "image/jpeg"
                          ) as "image/jpeg" | "image/png" | "image/webp";
                          const res = await uploadImage({
                            data: {
                              token,
                              vehicleId: imgVehicleId,
                              mimeType,
                              base64,
                              altText: imgAlt,
                              imageType: "gallery",
                              isPrimary: true,
                            },
                          });
                          setMsg(`Image saved: ${res.url}`);
                          setImgAlt("");
                          setImgFile(null);
                          await reload();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Upload className="size-3.5" />
                      Upload
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Completeness</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(evDash?.vehicles ?? []).map((v) => (
                        <tr key={v.id} className="border-b border-border/70">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{v.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.brandName} · {v.categoryName}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-semibold">
                              {v.completeness?.score ?? 0}%
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              ({v.completeness?.confidence ?? "low"})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                                (v.published
                                  ? "bg-leaf/15 text-foreground"
                                  : "bg-muted text-muted-foreground")
                              }
                            >
                              {v.published ? "Published" : "Hidden"} · {v.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                                onClick={async () => {
                                  if (!token) return;
                                  await toggleVehicle({
                                    data: {
                                      token,
                                      id: v.id,
                                      published: !v.published,
                                    },
                                  });
                                  await reload();
                                }}
                              >
                                {v.published ? "Unpublish" : "Publish"}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-destructive"
                                onClick={async () => {
                                  if (!token) return;
                                  if (!confirm(`Soft-delete ${v.name}?`)) return;
                                  await deleteVehicle({ data: { token, id: v.id } });
                                  await reload();
                                }}
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!evDash?.vehicles.length ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            No vehicles yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "marketplace" && (
          <section className="mt-6 space-y-6">
            {moduleLoading && !mktDash ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading marketplace…
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                    Providers: {mktDash?.counts.providers ?? 0}
                  </span>
                  <span className="rounded-full border border-amber-500/40 px-3 py-1.5 font-semibold">
                    Pending: {mktDash?.counts.pendingVerification ?? 0}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                    Verified: {mktDash?.counts.verified ?? 0}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                    Leads: {mktDash?.counts.leads ?? 0}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                    New leads: {mktDash?.counts.newLeads ?? 0}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
                    Categories: {mktDash?.counts.categories ?? 0}
                  </span>
                  <Link
                    to="/marketplace"
                    className="rounded-full border border-border px-3 py-1.5 font-semibold text-leaf"
                  >
                    Open public /marketplace
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="font-display text-sm font-bold">Pending providers</h2>
                  </div>
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Business</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(mktDash?.pendingProviders ?? []).map((p) => (
                        <tr key={p.id} className="border-b border-border/70">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{p.businessName}</p>
                            <p className="text-xs text-muted-foreground">{p.slug}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p>{p.email || "—"}</p>
                            <p className="text-muted-foreground">{p.phone || ""}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busy || !token}
                                className="rounded-lg bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                                onClick={async () => {
                                  if (!token) return;
                                  setBusy(true);
                                  setError(null);
                                  try {
                                    await setProviderVerification({
                                      data: {
                                        token,
                                        providerId: p.id,
                                        action: "approve",
                                      },
                                    });
                                    setMsg(`Approved ${p.businessName}`);
                                    const res = await fetchMarketplace({ data: { token } });
                                    setMktDash(res);
                                  } catch (err) {
                                    setError(
                                      err instanceof Error ? err.message : "Approve failed",
                                    );
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busy || !token}
                                className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                                onClick={async () => {
                                  if (!token) return;
                                  setBusy(true);
                                  setError(null);
                                  try {
                                    await setProviderVerification({
                                      data: {
                                        token,
                                        providerId: p.id,
                                        action: "reject",
                                      },
                                    });
                                    setMsg(`Rejected ${p.businessName}`);
                                    const res = await fetchMarketplace({ data: { token } });
                                    setMktDash(res);
                                  } catch (err) {
                                    setError(
                                      err instanceof Error ? err.message : "Reject failed",
                                    );
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!mktDash?.pendingProviders.length ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            No pending provider verifications.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="font-display text-sm font-bold">Recent leads</h2>
                  </div>
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Lead</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(mktDash?.recentLeads ?? []).map((l) => (
                        <tr key={l.id} className="border-b border-border/70">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{l.name}</p>
                            <p className="text-xs text-muted-foreground">{l.leadNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.createdAt.slice(0, 10)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              value={l.status}
                              disabled={busy || !token}
                              onChange={async (e) => {
                                if (!token) return;
                                const status = e.target.value as
                                  | "new"
                                  | "assigned"
                                  | "in_progress"
                                  | "closed"
                                  | "cancelled"
                                  | "spam";
                                setBusy(true);
                                setError(null);
                                try {
                                  await updateLeadStatus({
                                    data: { token, leadId: l.id, status },
                                  });
                                  setMsg(`Lead ${l.leadNumber} → ${status}`);
                                  const res = await fetchMarketplace({ data: { token } });
                                  setMktDash(res);
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : "Lead status update failed",
                                  );
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {(
                                [
                                  "new",
                                  "assigned",
                                  "in_progress",
                                  "closed",
                                  "cancelled",
                                  "spam",
                                ] as const
                              ).map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {!mktDash?.recentLeads.length ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            No leads yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {tab === "jobs" && token && (
          <AdminJobsPanel
            token={token}
            jobsDash={jobsDash}
            loading={moduleLoading}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setMsg={setMsg}
            onReload={async () => {
              const res = await fetchJobsDash({ data: { token } });
              setJobsDash(res);
            }}
          />
        )}

        {tab === "journal" && token && (
          <AdminJournalPanel
            token={token}
            journalDash={journalDash}
            loading={moduleLoading}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setMsg={setMsg}
            onReload={async () => {
              const res = await fetchJournalDash({ data: { token } });
              setJournalDash(res);
            }}
          />
        )}

        {!loading && tab === "home" && token ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-bold">Homepage CMS</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Full control of public home sections. Meta title/description for / is under Modules
              &amp; SEO.
            </p>
            <div className="mt-4">
              <AdminHomePanel token={token} onMsg={setMsg} onError={setError} />
            </div>
          </section>
        ) : null}

        {!loading && tab === "cms" && token ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-bold">Modules, SEO & calculators</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage page SEO for Google, enable/disable modules, edit solar city benchmarks and
              route-planner EV profiles.
            </p>
            <div className="mt-4">
              <AdminModulesSeoPanel
                token={token}
                onMsg={setMsg}
                onError={setError}
              />
            </div>
          </section>
        ) : null}

        {!loading && tab === "scripts" && token ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-bold">Analytics, tags & schema</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Google Analytics, Tag Manager, custom script tags, and extra JSON-LD schema for the
              whole site.
            </p>
            <div className="mt-4">
              <AdminAnalyticsPanel token={token} onMsg={setMsg} onError={setError} />
            </div>
          </section>
        ) : null}

        {!loading && tab === "nav" && token ? (
          <section className="mt-6">
            <AdminNavVisibilityPanel token={token} onMsg={setMsg} onError={setError} />
          </section>
        ) : null}

        {!loading && tab === "redeems" && (
          <section className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">UPI</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(dash?.redeems ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.user_name}</p>
                      <p className="text-xs text-muted-foreground">{r.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.upi_id}</td>
                    <td className="px-4 py-3 text-xs">
                      ₹{r.cash_inr} ({r.credits} credits)
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{r.status}</td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                            onClick={async () => {
                              if (!token) return;
                              await updateRedeem({
                                data: { token, id: r.id, status: "paid" },
                              });
                              await reload();
                            }}
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                            onClick={async () => {
                              if (!token) return;
                              await updateRedeem({
                                data: { token, id: r.id, status: "rejected" },
                              });
                              await reload();
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!dash?.redeems.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No redeem requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </AdminShell>
      <SiteFooter />
    </div>
  );
}
