import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  adminBulkDeleteJobs,
  adminDeleteJob,
  adminGetJob,
  adminImportJobsExcel,
  adminJobsDashboard,
  adminSetJobStatus,
  adminUpsertJob,
} from "@/lib/jobs/admin.functions";
import {
  INDIA_STATES,
  JOB_CATEGORY_OPTIONS,
  JOB_STATUSES,
  JOB_TYPE_LABEL,
  JOB_TYPES,
  REMOTE_LABEL,
  REMOTE_TYPES,
} from "@/lib/jobs/constants";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { SeoScorePanel } from "@/components/platform/SeoScorePanel";

type JobsDash = Awaited<ReturnType<typeof adminJobsDashboard>>;

type Props = {
  token: string;
  jobsDash: JobsDash | null;
  loading: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  setMsg: (v: string | null) => void;
  onReload: () => Promise<void>;
};

const EMPTY_FORM = {
  id: "",
  title: "",
  organizationId: "",
  organizationName: "",
  jobType: "full_time",
  categoryId: "",
  description: "",
  city: "",
  state: "",
  location: "",
  remoteType: "onsite",
  skills: "",
  applicationEmail: "",
  applicationUrl: "",
  deadline: "",
  status: "published",
  durationMonths: "",
  stipendMonthly: "",
  mode: "",
  eligibility: "",
  certificateOffered: false,
  featured: false,
  verified: true,
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  seoFocusKeyword: "",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 1000];
const SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-leaf focus:ring-1 focus:ring-leaf dark:bg-background";
const INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-leaf focus:ring-1 focus:ring-leaf dark:bg-background";

export function AdminJobsPanel({
  token,
  jobsDash,
  loading,
  busy,
  setBusy,
  setError,
  setMsg,
  onReload,
}: Props) {
  const upsertJob = useServerFn(adminUpsertJob);
  const getJob = useServerFn(adminGetJob);
  const setStatus = useServerFn(adminSetJobStatus);
  const deleteJob = useServerFn(adminDeleteJob);
  const bulkDelete = useServerFn(adminBulkDeleteJobs);
  const importExcel = useServerFn(adminImportJobsExcel);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const jobs = jobsDash?.jobs ?? [];
  const orgs = jobsDash?.orgs ?? [];
  const categories = useMemo(() => {
    const fromDash = jobsDash?.categories ?? [];
    if (fromDash.length) {
      return fromDash.map((c) => ({ value: c.id, label: c.name }));
    }
    return JOB_CATEGORY_OPTIONS.map((c) => ({ value: c.slug, label: c.name }));
  }, [jobsDash?.categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filterType !== "all" && j.jobType !== filterType) return false;
      if (filterStatus !== "all" && j.status !== filterStatus) return false;
      if (!q) return true;
      const hay =
        `${j.title} ${j.organizationName} ${j.city} ${j.state} ${j.location} ${j.slug}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, query, filterType, filterStatus]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, filterType, filterStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageRows.map((j) => j.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const parseWorkbook = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]!];
    if (!sheet) throw new Error("No sheet found in file");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  };

  const isInternship =
    form.jobType === "internship" || form.jobType === "apprenticeship";
  const showLocation = form.remoteType !== "remote";

  const errorMessage = (err: unknown) => {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "string" && err) return err;
    if (err && typeof err === "object") {
      const o = err as Record<string, unknown>;
      if (typeof o.message === "string" && o.message) return o.message;
      if (typeof o.data === "string" && o.data) return o.data;
      const nested = o.data;
      if (nested && typeof nested === "object") {
        const m = (nested as Record<string, unknown>).message;
        if (typeof m === "string" && m) return m;
      }
    }
    return "Could not save job / internship";
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const openCreate = () => {
    resetForm();
    setShowAdd(true);
  };

  const openEdit = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await getJob({ data: { token, id } });
      const job = res.job;
      if (!job) throw new Error("Job not found");
      const deadlineRaw = job.deadline ?? "";
      const deadline = deadlineRaw.includes("T")
        ? deadlineRaw.slice(0, 10)
        : deadlineRaw.slice(0, 10);
      setForm({
        id: job.id,
        title: job.title,
        organizationId: job.organizationId,
        organizationName: "",
        jobType: job.jobType || "full_time",
        categoryId: job.categoryId ?? "",
        description: job.description || "",
        city: job.city || "",
        state: job.state || "",
        location: job.location || "",
        remoteType: job.remoteType || "onsite",
        skills: job.skills || "",
        applicationEmail: job.applicationEmail || "",
        applicationUrl: job.applicationUrl || "",
        deadline,
        status: job.status || "draft",
        durationMonths: job.durationMonths != null ? String(job.durationMonths) : "",
        stipendMonthly: job.stipendMonthly != null ? String(job.stipendMonthly) : "",
        mode: job.mode || "",
        eligibility: job.eligibility || "",
        certificateOffered: job.certificateOffered,
        featured: job.featured,
        verified: job.verified,
        seoTitle: job.seoTitle || "",
        seoKeywords: job.seoKeywords || "",
        seoDescription: job.seoDescription || "",
        seoFocusKeyword: job.seoFocusKeyword || "",
      });
      setShowAdd(true);
      setMsg(`Editing “${job.title}”`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      {loading && !jobsDash ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading jobs…
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Published: {jobsDash?.stats.published ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Internships: {jobsDash?.stats.internships ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Applications: {jobsDash?.stats.applications ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Orgs: {jobsDash?.stats.orgs ?? 0}
        </span>
        <Link
          to="/job-and-internship"
          className="rounded-full border border-border px-3 py-1.5 font-semibold text-leaf"
        >
          Open public /job-and-internship
        </Link>
        <button
          type="button"
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              resetForm();
            } else {
              openCreate();
            }
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="size-3.5" />
          {showAdd ? "Hide form" : "Add job and internship"}
        </button>
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
              if (!form.organizationId && !form.organizationName.trim()) {
                throw new Error("Select an organization or enter a new organization name.");
              }
              if (!form.title.trim()) {
                throw new Error("Title is required.");
              }
              const res = await upsertJob({
                data: {
                  token,
                  job: {
                    ...(form.id ? { id: form.id } : {}),
                    title: form.title.trim(),
                    ...(form.organizationId
                      ? { organizationId: form.organizationId }
                      : { organizationName: form.organizationName.trim() }),
                    jobType: form.jobType as
                      | "full_time"
                      | "part_time"
                      | "contract"
                      | "internship"
                      | "apprenticeship"
                      | "fellowship"
                      | "temporary"
                      | "volunteer",
                    categoryId: form.categoryId || null,
                    description: form.description,
                    city: form.city,
                    state: form.state,
                    location:
                      form.location ||
                      [form.city, form.state].filter(Boolean).join(", "),
                    remoteType: form.remoteType as "onsite" | "hybrid" | "remote",
                    skills: form.skills,
                    applicationEmail: form.applicationEmail,
                    applicationUrl: form.applicationUrl,
                    deadline: form.deadline || null,
                    status: form.status as
                      | "draft"
                      | "published"
                      | "expired"
                      | "archived",
                    featured: form.featured,
                    verified: form.verified,
                    ...(form.durationMonths
                      ? { durationMonths: Number(form.durationMonths) }
                      : {}),
                    ...(form.stipendMonthly
                      ? { stipendMonthly: Number(form.stipendMonthly) }
                      : {}),
                    mode: form.mode,
                    eligibility: form.eligibility,
                    certificateOffered: form.certificateOffered,
                    seoTitle: form.seoTitle,
                    seoKeywords: form.seoKeywords,
                    seoDescription: form.seoDescription,
                    seoFocusKeyword: form.seoFocusKeyword,
                  },
                },
              });
              if (!res?.ok) {
                throw new Error("Save did not complete. Please try again.");
              }
              setMsg(
                `Saved “${form.title.trim()}” (${form.jobType.replace(/_/g, " ")}).`,
              );
              resetForm();
              setShowAdd(false);
              await onReload();
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="inline-flex items-center gap-2 font-display text-base font-bold sm:col-span-2">
            <Briefcase className="size-5 text-leaf" />
            {form.id ? "Edit job and internship" : "Add job and internship (manual)"}
          </h2>

          <label className="text-xs font-semibold sm:col-span-2">
            Title *
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold">
            Organization (existing)
            <select
              value={form.organizationId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  organizationId: e.target.value,
                  organizationName: e.target.value ? "" : f.organizationName,
                }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— New org below —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Or new organization name *
            <input
              value={form.organizationName}
              disabled={Boolean(form.organizationId)}
              required={!form.organizationId}
              onChange={(e) =>
                setForm((f) => ({ ...f, organizationName: e.target.value }))
              }
              placeholder="e.g. EVA Green Corner"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>

          <label className="text-xs font-semibold">
            Type *
            <select
              required
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
              className={SELECT_CLASS}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {JOB_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={SELECT_CLASS}
            >
              <option value="">— Select category —</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Remote
            <select
              value={form.remoteType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  remoteType: e.target.value,
                  ...(e.target.value === "remote" ? { city: "", state: "" } : {}),
                }))
              }
              className={SELECT_CLASS}
            >
              {REMOTE_TYPES.map((r) => (
                <option key={r} value={r}>
                  {REMOTE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={SELECT_CLASS}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {showLocation ? (
            <>
              <label className="text-xs font-semibold">
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Pune"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="text-xs font-semibold">
                State
                <select
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className={SELECT_CLASS}
                >
                  <option value="">— Select state / UT —</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Remote role — city / state not required.
            </p>
          )}

          <div className="space-y-1.5 text-xs font-semibold sm:col-span-2">
            <span>Description (rich text — images, links, YouTube, social embeds)</span>
            <RichTextEditor
              key={form.id || "new-job"}
              value={form.description}
              onChange={(html) => setForm((f) => ({ ...f, description: html }))}
              uploadToken={token}
              placeholder="Role overview, what you’ll do, benefits… Add images or social links from the toolbar."
              minHeightClass="min-h-[220px]"
            />
            <p className="font-normal text-muted-foreground">
              External apply URL below shows a public Apply button that opens that link.
            </p>
          </div>

          <label className="text-xs font-semibold">
            Skills
            <input
              value={form.skills}
              onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
              placeholder="EV, solar, ESG…"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Deadline
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Apply email
            <input
              value={form.applicationEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, applicationEmail: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            External apply URL
            <input
              value={form.applicationUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, applicationUrl: e.target.value }))
              }
              placeholder="https://employer-careers.example/apply/…"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
              If set, the public page shows Apply now → opening this link.
            </span>
          </label>

          {isInternship ? (
            <>
              <label className="text-xs font-semibold">
                Duration (months)
                <input
                  type="number"
                  min={1}
                  value={form.durationMonths}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durationMonths: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold">
                Stipend / month
                <input
                  type="number"
                  min={0}
                  value={form.stipendMonthly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stipendMonthly: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold">
                Mode
                <input
                  value={form.mode}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                  placeholder="Full-time internship / part-time"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold">
                Eligibility
                <input
                  value={form.eligibility}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eligibility: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.certificateOffered}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, certificateOffered: e.target.checked }))
                  }
                />
                Certificate offered
              </label>
            </>
          ) : null}

          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
            />
            Verified listing
          </label>

          <div className="grid gap-3 rounded-xl border border-dashed border-border p-4 sm:col-span-2 sm:grid-cols-2">
            <h3 className="font-display text-sm font-bold sm:col-span-2">
              SEO (Yoast-style)
            </h3>
            <label className="text-xs font-semibold sm:col-span-2">
              Focus keyphrase
              <input
                value={form.seoFocusKeyword}
                maxLength={80}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoFocusKeyword: e.target.value }))
                }
                placeholder="e.g. solar internship Delhi"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              SEO title / meta tag
              <input
                value={form.seoTitle}
                maxLength={70}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                placeholder="e.g. Solar Design Internship in Delhi | EVA Green Corner"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {form.seoTitle.length}/60 recommended
              </span>
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Keywords
              <input
                value={form.seoKeywords}
                maxLength={200}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoKeywords: e.target.value }))
                }
                placeholder="solar internship, green jobs, Delhi"
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
                placeholder="Short pitch for Google results (120–160 characters)."
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {form.seoDescription.length}/160 recommended
              </span>
            </label>
            <SeoScorePanel
              className="sm:col-span-2"
              title={form.seoTitle}
              keywords={form.seoKeywords}
              description={form.seoDescription}
              focusKeyword={form.seoFocusKeyword}
              content={form.description}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {form.id ? "Update listing" : "Save listing"}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 font-display text-base font-bold">
              <FileSpreadsheet className="size-5 text-leaf" />
              Excel / CSV upload
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Columns: title, organization, job_type, category, description, city, state,
              remote_type, skills, application_email, application_url, deadline, status,
              duration_months, stipend_monthly, seo_title / meta_tag, seo_keywords / keyword,
              seo_description, seo_focus_keyword / focus_keyphrase.
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
                    `Imported ${res.imported}/${res.total} jobs` +
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

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">All listings</h2>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={async () => {
                const ids = [...selected];
                if (
                  !confirm(
                    `Delete ${ids.length} selected job(s)? This cannot be undone.`,
                  )
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                setMsg(null);
                try {
                  const res = await bulkDelete({ data: { token, ids } });
                  setMsg(`Deleted ${res.deleted} job(s).`);
                  setSelected(new Set());
                  await onReload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Bulk delete failed");
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Bulk delete ({selected.size})
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="relative text-xs font-semibold sm:col-span-1">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, org, city…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <label className="text-xs font-semibold">
              Type
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {JOB_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Status
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
                    aria-label="Select page"
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (allPageSelected) {
                          for (const id of pageIds) next.delete(id);
                        } else {
                          for (const id of pageIds) next.add(id);
                        }
                        return next;
                      });
                    }}
                  />
                </th>
                <th className="px-4 py-3">Job and Internship</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((j) => (
                <tr key={j.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(j.id)}
                      aria-label={`Select ${j.title}`}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(j.id)) next.delete(j.id);
                          else next.add(j.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{j.organizationName}</td>
                  <td className="px-4 py-3 text-xs">
                    {(JOB_TYPE_LABEL as Record<string, string>)[j.jobType] ?? j.jobType}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {[j.city, j.state].filter(Boolean).join(", ") || j.location || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      value={j.status}
                      disabled={busy}
                      onChange={async (e) => {
                        const status = e.target.value as
                          | "draft"
                          | "published"
                          | "expired"
                          | "archived";
                        setBusy(true);
                        setError(null);
                        try {
                          await setStatus({
                            data: { token, jobId: j.id, status },
                          });
                          setMsg(`${j.title} → ${status}`);
                          await onReload();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Job status update failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface"
                        onClick={() => void openEdit(j.id)}
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700"
                        onClick={async () => {
                          if (!confirm(`Delete ${j.title}?`)) return;
                          setBusy(true);
                          try {
                            await deleteJob({ data: { token, id: j.id } });
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.delete(j.id);
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
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No jobs match these filters.
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
