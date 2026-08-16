import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
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
  adminBulkDeletePosts,
  adminDeletePost,
  adminGetPost,
  adminImportPostsExcel,
  adminJournalDashboard,
  adminSetPostStatus,
  adminUpsertPost,
} from "@/lib/journal/admin.functions";
import {
  JOURNAL_CONTENT_TYPES,
  JOURNAL_POST_STATUSES,
} from "@/lib/journal/constants";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { SeoScorePanel } from "@/components/platform/SeoScorePanel";
import {
  htmlToPlainText,
} from "@/lib/html-plain";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

type JournalDash = Awaited<ReturnType<typeof adminJournalDashboard>>;

type Props = {
  token: string;
  journalDash: JournalDash | null;
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
  categoryId: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  imageAlt: "",
  authorName: "EVA Green Corner Editorial",
  readingTime: "5",
  status: "published",
  contentType: "explainer",
  featured: false,
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  seoFocusKeyword: "",
  canonicalUrl: "",
  sourcesText: "",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 1000];

function parseSources(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, url = "", publisher = ""] = line.split("|").map((p) => p.trim());
      return { title: title || line, url, publisher };
    })
    .filter((s) => s.title);
}

export function AdminJournalPanel({
  token,
  journalDash,
  loading,
  busy,
  setBusy,
  setError,
  setMsg,
  onReload,
}: Props) {
  const upsertPost = useServerFn(adminUpsertPost);
  const getPost = useServerFn(adminGetPost);
  const setStatus = useServerFn(adminSetPostStatus);
  const deletePost = useServerFn(adminDeletePost);
  const bulkDelete = useServerFn(adminBulkDeletePosts);
  const importExcel = useServerFn(adminImportPostsExcel);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const posts = journalDash?.posts ?? [];
  const categories = journalDash?.categories ?? [];
  const statuses =
    journalDash?.statuses?.length ? journalDash.statuses : [...JOURNAL_POST_STATUSES];
  const contentTypes =
    journalDash?.contentTypes?.length
      ? journalDash.contentTypes
      : [...JOURNAL_CONTENT_TYPES];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filterType !== "all" && p.contentType !== filterType) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterCategory !== "all" && p.categoryId !== filterCategory) return false;
      if (!q) return true;
      const hay =
        `${p.title} ${p.slug} ${p.excerpt} ${p.authorName} ${p.categoryName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [posts, query, filterType, filterStatus, filterCategory]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, filterType, filterStatus, filterCategory, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageRows.map((p) => p.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const parseWorkbook = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]!];
    if (!sheet) throw new Error("No sheet found in file");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
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
      const res = await getPost({ data: { token, id } });
      const post = res.post;
      if (!post) throw new Error("Post not found");
      setForm({
        id: post.id,
        title: post.title,
        categoryId: post.categoryId ?? "",
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featuredImage,
        imageAlt: post.imageAlt,
        authorName: post.authorName || "EVA Green Corner Editorial",
        readingTime: String(post.readingTime || 5),
        status: post.status || "draft",
        contentType: post.contentType || "explainer",
        featured: post.featured,
        seoTitle: post.seoTitle,
        seoKeywords: post.seoKeywords,
        seoDescription: post.seoDescription,
        seoFocusKeyword: post.seoFocusKeyword,
        canonicalUrl: post.canonicalUrl,
        sourcesText: post.sources
          .map((s) => [s.title, s.url, s.publisher].filter(Boolean).join(" | "))
          .join("\n"),
      });
      setShowAdd(true);
      setMsg(`Editing “${post.title}”`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      {loading && !journalDash ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading blog…
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Published: {journalDash?.stats.published ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Drafts: {journalDash?.stats.drafts ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Policies: {journalDash?.stats.policies ?? 0}
        </span>
        <span className="rounded-full border border-border px-3 py-1.5 font-semibold">
          Categories: {journalDash?.stats.categories ?? 0}
        </span>
        <Link
          to="/journal"
          className="rounded-full border border-border px-3 py-1.5 font-semibold text-leaf"
        >
          Open public /journal
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
          {showAdd ? "Hide form" : "Add blog post"}
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
              if (!htmlToPlainText(form.content)) {
                throw new Error("Content is required.");
              }
              await upsertPost({
                data: {
                  token,
                  post: {
                    ...(form.id ? { id: form.id } : {}),
                    title: form.title,
                    categoryId: form.categoryId || null,
                    excerpt: form.excerpt,
                    content: form.content,
                    featuredImage: form.featuredImage,
                    imageAlt: form.imageAlt,
                    authorName: form.authorName,
                    readingTime: Number(form.readingTime) || 5,
                    status: form.status as
                      | "draft"
                      | "review"
                      | "scheduled"
                      | "published"
                      | "archived",
                    contentType: form.contentType as
                      | "guide"
                      | "explainer"
                      | "research"
                      | "policy"
                      | "news",
                    featured: form.featured,
                    seoTitle: form.seoTitle,
                    seoKeywords: form.seoKeywords,
                    seoDescription: form.seoDescription,
                    seoFocusKeyword: form.seoFocusKeyword,
                    canonicalUrl: form.canonicalUrl,
                    sources: parseSources(form.sourcesText),
                  },
                },
              });
              setMsg(form.id ? "Blog post updated." : "Blog post saved.");
              resetForm();
              setShowAdd(false);
              await onReload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save post");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="inline-flex items-center gap-2 font-display text-base font-bold sm:col-span-2">
            <BookOpen className="size-5 text-leaf" />
            {form.id ? "Edit blog post" : "Add blog post (manual)"}
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
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Content type
            <select
              value={form.contentType}
              onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {contentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold">
            Reading time (min)
            <input
              type="number"
              min={1}
              value={form.readingTime}
              onChange={(e) => setForm((f) => ({ ...f, readingTime: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold">
            Author
            <input
              value={form.authorName}
              onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold">
            Featured image URL
            <input
              value={form.featuredImage}
              onChange={(e) => setForm((f) => ({ ...f, featuredImage: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold">
            Image alt text
            <input
              value={form.imageAlt}
              onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold sm:col-span-2">
            Excerpt
            <textarea
              value={form.excerpt}
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="sm:col-span-2">
            <p className="mb-1 text-xs font-semibold">Content *</p>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
              uploadToken={token}
              placeholder="Write the full blog post. Add links, images, YouTube, X posts, or other article embeds from the toolbar."
            />
          </div>

          <label className="text-xs font-semibold sm:col-span-2">
            Sources (one per line: title | url | publisher)
            <textarea
              value={form.sourcesText}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, sourcesText: e.target.value }))}
              placeholder="MNRE | https://mnre.gov.in/ | Government of India"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            Featured on journal home
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
                placeholder="e.g. rooftop solar India"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              SEO title / meta tag
              <input
                value={form.seoTitle}
                maxLength={70}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                placeholder="e.g. Rooftop Solar Basics for Indian Homes | EVA Green Corner"
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
                placeholder="rooftop solar, net metering, India"
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
            <label className="text-xs font-semibold sm:col-span-2">
              Canonical URL (optional)
              <input
                value={form.canonicalUrl}
                maxLength={500}
                onChange={(e) =>
                  setForm((f) => ({ ...f, canonicalUrl: e.target.value }))
                }
                placeholder="https://evagreencorner.com/journal/your-slug"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <SeoScorePanel
              className="sm:col-span-2"
              title={form.seoTitle}
              keywords={form.seoKeywords}
              description={form.seoDescription}
              focusKeyword={form.seoFocusKeyword}
              content={`${form.excerpt}\n${htmlToPlainText(form.content)}`}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {form.id ? "Update post" : "Save post"}
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
              Columns: title, category / category_slug, excerpt, content, author_name, reading_time,
              status, content_type, featured, featured_image, image_alt, seo_title / meta_tag,
              seo_keywords / keyword, seo_description, seo_focus_keyword / focus_keyphrase,
              canonical_url.
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
                    `Imported ${res.imported}/${res.total} posts` +
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
            <h2 className="font-display text-base font-bold">All blog posts</h2>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={async () => {
                const ids = [...selected];
                if (
                  !confirm(
                    `Delete ${ids.length} selected post(s)? This cannot be undone.`,
                  )
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                setMsg(null);
                try {
                  const res = await bulkDelete({ data: { token, ids } });
                  setMsg(`Deleted ${res.deleted} post(s).`);
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

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative text-xs font-semibold">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, slug, author…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <label className="text-xs font-semibold">
              Category
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Type
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                {contentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                {statuses.map((s) => (
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
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      aria-label={`Select ${p.title}`}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                    {p.status === "published" ? (
                      <Link
                        to="/journal/$slug"
                        params={{ slug: p.slug }}
                        className="text-[11px] font-semibold text-leaf"
                      >
                        View
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.contentType}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      value={p.status}
                      disabled={busy}
                      onChange={async (e) => {
                        const status = e.target.value as
                          | "draft"
                          | "review"
                          | "scheduled"
                          | "published"
                          | "archived";
                        setBusy(true);
                        setError(null);
                        try {
                          await setStatus({
                            data: { token, postId: p.id, status },
                          });
                          setMsg(`${p.title} → ${status}`);
                          await onReload();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Post status update failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {statuses.map((s) => (
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
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold"
                        onClick={() => void openEdit(p.id)}
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700"
                        onClick={async () => {
                          if (!confirm(`Delete ${p.title}?`)) return;
                          setBusy(true);
                          try {
                            await deletePost({ data: { token, id: p.id } });
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
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No posts match these filters.
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
