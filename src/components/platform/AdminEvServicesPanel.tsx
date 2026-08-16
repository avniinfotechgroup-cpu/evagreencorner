import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  adminAddDirectoryProvider,
  adminBulkDeleteDirectoryProviders,
  adminDeleteDirectoryProvider,
  adminImportDirectoryExcel,
  adminListDirectory,
  adminToggleDirectoryProvider,
} from "@/lib/community/directory.functions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { SeoScorePanel } from "./SeoScorePanel";

type DirectoryState = Awaited<ReturnType<typeof adminListDirectory>>;

type Props = {
  token: string;
  directory: DirectoryState | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  setMsg: (v: string | null) => void;
  onReload: () => Promise<void>;
};

const EMPTY_FORM = {
  name: "",
  category: "ev_repair",
  city: "",
  state: "",
  area: "",
  phone: "",
  email: "",
  website: "",
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  verified: true,
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 1000];

export function AdminEvServicesPanel({
  token,
  directory,
  busy,
  setBusy,
  setError,
  setMsg,
  onReload,
}: Props) {
  const addProvider = useServerFn(adminAddDirectoryProvider);
  const toggleProvider = useServerFn(adminToggleDirectoryProvider);
  const deleteProvider = useServerFn(adminDeleteDirectoryProvider);
  const bulkDelete = useServerFn(adminBulkDeleteDirectoryProviders);
  const importExcel = useServerFn(adminImportDirectoryExcel);

  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">("all");
  const [filterVerified, setFilterVerified] = useState<"all" | "yes" | "no">("all");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const evCats = directory?.evCategories ?? [];
  const evCategoryIds = useMemo(() => {
    const ids = new Set<string>(
      (directory?.categories ?? []).filter((c) => c.group === "ev").map((c) => c.id),
    );
    ids.add("ev_workshop");
    return ids;
  }, [directory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const city = cityFilter.trim().toLowerCase();
    return (directory?.providers ?? []).filter((p) => {
      if (!evCategoryIds.has(p.category)) return false;
      if (filterCat === "ev_repair") {
        if (p.category !== "ev_repair" && p.category !== "ev_workshop") return false;
      } else if (filterCat !== "all" && p.category !== filterCat) {
        return false;
      }
      if (filterStatus === "active" && !p.active) return false;
      if (filterStatus === "hidden" && p.active) return false;
      if (filterVerified === "yes" && !p.verified) return false;
      if (filterVerified === "no" && p.verified) return false;
      if (city) {
        const hay = `${p.city} ${p.area} ${p.state}`.toLowerCase();
        if (!hay.includes(city)) return false;
      }
      if (q) {
        const hay =
          `${p.name} ${p.phone} ${p.email} ${p.website} ${p.seo_title} ${p.seo_keywords}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    directory?.providers,
    evCategoryIds,
    filterCat,
    filterStatus,
    filterVerified,
    query,
    cityFilter,
  ]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [filterCat, filterStatus, filterVerified, query, cityFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageRows.map((p) => p.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const parseWorkbook = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]!];
    if (!sheet) throw new Error("No sheet found in file");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  };

  const runBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected EV service(s)? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await bulkDelete({ data: { token, ids } });
      setMsg(`Deleted ${res.deleted} service(s).`);
      setSelected(new Set());
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      {/* Category overview */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold sm:text-lg">Categories</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Matches the public EV services menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            {showAdd ? "Hide add form" : "Add EV service"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterCat("all")}
            className={
              "rounded-lg border px-3 py-1.5 text-xs font-semibold " +
              (filterCat === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background")
            }
          >
            All (
            {
              (directory?.providers ?? []).filter((p) => evCategoryIds.has(p.category))
                .length
            }
            )
          </button>
          {evCats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs font-semibold " +
                (filterCat === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background")
              }
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {showAdd ? (
        <form
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-2 sm:p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            setMsg(null);
            try {
              await addProvider({
                data: {
                  token,
                  provider: {
                    name: form.name,
                    category: form.category,
                    ...(form.city ? { city: form.city } : {}),
                    ...(form.state ? { state: form.state } : {}),
                    ...(form.area ? { area: form.area } : {}),
                    ...(form.phone ? { phone: form.phone } : {}),
                    ...(form.email ? { email: form.email } : {}),
                    ...(form.website ? { website: form.website } : {}),
                    verified: form.verified,
                    ...(form.seoTitle ? { seoTitle: form.seoTitle } : {}),
                    ...(form.seoKeywords ? { seoKeywords: form.seoKeywords } : {}),
                    ...(form.seoDescription
                      ? { seoDescription: form.seoDescription }
                      : {}),
                  },
                },
              });
              setMsg("EV service provider added.");
              setForm(EMPTY_FORM);
              await onReload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not add provider");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-display text-base font-bold sm:col-span-2">Add EV service</h2>
          <label className="text-xs font-semibold">
            Name *
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Category *
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {(directory?.categories ?? [])
                .filter((c) => c.group === "ev")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </label>
          {(
            [
              ["city", "City"],
              ["state", "State"],
              ["area", "Area"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-semibold">
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          ))}

          <div className="grid gap-3 rounded-xl border border-dashed border-border p-4 sm:col-span-2 sm:grid-cols-2">
            <h3 className="font-display text-sm font-bold sm:col-span-2">SEO details</h3>
            <label className="text-xs font-semibold sm:col-span-2">
              Meta title / tag
              <input
                value={form.seoTitle}
                maxLength={70}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Keywords
              <input
                value={form.seoKeywords}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, seoKeywords: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Meta description
              <textarea
                value={form.seoDescription}
                maxLength={320}
                rows={3}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoDescription: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <SeoScorePanel
              className="sm:col-span-2"
              title={form.seoTitle}
              keywords={form.seoKeywords}
              description={form.seoDescription}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
            />
            Mark as verified
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save EV service
          </button>
        </form>
      ) : null}

      {/* Excel upload */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 font-display text-base font-bold">
              <FileSpreadsheet className="size-5 text-leaf" />
              Excel / CSV upload
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Columns: name, category, city, state, area, phone, email, website, seo_title /
              meta_tag, seo_keywords / keyword, seo_description / description, verified.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-surface">
            <Upload className="size-4" />
            Choose .xlsx / .csv
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                setError(null);
                setMsg(null);
                try {
                  const rows = await parseWorkbook(file);
                  if (!rows.length) throw new Error("File has no data rows");
                  const res = await importExcel({ data: { token, rows } });
                  setMsg(
                    `Imported ${res.imported}/${res.total} services` +
                      (res.errors.length ? ` · ${res.errors.length} row errors` : ""),
                  );
                  if (res.errors.length) setError(res.errors.slice(0, 5).join(" · "));
                  await onReload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Import failed");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Filters + table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Service listings</h2>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={runBulkDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Bulk delete ({selected.size})
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative text-xs font-semibold sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, SEO…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <label className="text-xs font-semibold">
              City / area
              <input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="e.g. Noida"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold">
              Status
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as "all" | "active" | "hidden")
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Verified
              <select
                value={filterVerified}
                onChange={(e) =>
                  setFilterVerified(e.target.value as "all" | "yes" | "no")
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="yes">Verified</option>
                <option value="no">Not verified</option>
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
                    checked={allPageSelected}
                    onChange={toggleSelectPage}
                    aria-label="Select page"
                  />
                </th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id} className="border-b border-border/70 align-top">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.phone || p.website || "—"}
                      {p.verified ? " · Verified" : ""}
                      {!p.active ? " · Hidden" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.categoryLabel}</td>
                  <td className="px-4 py-3 text-xs">
                    {[p.area, p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <SeoScorePanel
                      className="min-w-[14rem] border-0 bg-transparent p-0"
                      title={p.seo_title}
                      keywords={p.seo_keywords}
                      description={p.seo_description}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await toggleProvider({
                              data: { token, id: p.id, active: !p.active },
                            });
                            await onReload();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Toggle failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {p.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700"
                        onClick={async () => {
                          if (!confirm(`Delete ${p.name}?`)) return;
                          setBusy(true);
                          try {
                            await deleteProvider({ data: { token, id: p.id } });
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.delete(p.id);
                              return next;
                            });
                            await onReload();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Delete failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No EV services match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </div>
    </section>
  );
}
