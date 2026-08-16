import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  adminDeletePageSeo,
  adminUpsertPageSeo,
} from "@/lib/platform/cms.functions";
import { SeoScorePanel } from "@/components/platform/SeoScorePanel";
import { MANAGED_PAGE_SEO } from "@/lib/seo/page-registry";

type PageRow = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  noindex: number;
  updated_at: string;
};

type Props = {
  token: string;
  pages: PageRow[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onMsg: (msg: string | null) => void;
  onError: (err: string | null) => void;
  onRefresh: () => Promise<void>;
};

export function AdminPageSeoManager({
  token,
  pages,
  busy,
  setBusy,
  onMsg,
  onError,
  onRefresh,
}: Props) {
  const saveSeo = useServerFn(adminUpsertPageSeo);
  const deleteSeo = useServerFn(adminDeletePageSeo);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedPath, setSelectedPath] = useState<string | null>(pages[0]?.path ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    path: "",
    title: "",
    description: "",
    keywords: "",
    noindex: false,
  });

  const pathGroup = useMemo(() => {
    const map = new Map(MANAGED_PAGE_SEO.map((p) => [p.path, p.group]));
    return map;
  }, []);

  const groups = useMemo(() => {
    const set = new Set(MANAGED_PAGE_SEO.map((p) => p.group));
    return ["all", ...[...set].sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      const group = pathGroup.get(p.path) || "Custom";
      if (groupFilter !== "all" && group !== groupFilter) return false;
      if (!q) return true;
      return `${p.path} ${p.title} ${p.keywords}`.toLowerCase().includes(q);
    });
  }, [pages, query, groupFilter, pathGroup]);

  const selected =
    filtered.find((p) => p.path === selectedPath) ||
    pages.find((p) => p.path === selectedPath) ||
    filtered[0] ||
    null;

  const editForm = selected
    ? {
        path: selected.path,
        title: selected.title,
        description: selected.description,
        keywords: selected.keywords,
        noindex: Boolean(selected.noindex),
      }
    : null;

  const [edit, setEdit] = useState(editForm);

  // Sync editor when selection changes
  const activePath = selected?.path ?? "";
  if (edit?.path !== activePath && selected) {
    setEdit({
      path: selected.path,
      title: selected.title,
      description: selected.description,
      keywords: selected.keywords,
      noindex: Boolean(selected.noindex),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Full SEO for every URL: title, meta description, keywords, and noindex. Changes apply to
        public page heads (Google / social).
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1 text-xs font-semibold">
          <span className="sr-only">Search pages</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search path or title…"
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "all" ? "All groups" : g}
            </option>
          ))}
          <option value="Custom">Custom</option>
        </select>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="size-3.5" />
          {showAdd ? "Hide" : "Add URL"}
        </button>
      </div>

      {showAdd ? (
        <form
          className="grid gap-3 rounded-2xl border border-dashed border-border bg-card p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            onError(null);
            try {
              const path = draft.path.startsWith("/") ? draft.path : `/${draft.path}`;
              await saveSeo({
                data: {
                  token,
                  path,
                  title: draft.title,
                  description: draft.description,
                  keywords: draft.keywords,
                  noindex: draft.noindex,
                },
              });
              onMsg(`SEO created for ${path}`);
              setDraft({
                path: "",
                title: "",
                description: "",
                keywords: "",
                noindex: false,
              });
              setShowAdd(false);
              setSelectedPath(path);
              await onRefresh();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not add SEO");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3 className="font-display text-sm font-bold sm:col-span-2">Add page SEO</h3>
          <label className="text-xs font-semibold">
            URL path *
            <input
              required
              value={draft.path}
              onChange={(e) => setDraft((d) => ({ ...d, path: e.target.value }))}
              placeholder="/my-page"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Title *
            <input
              required
              minLength={3}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Description *
            <textarea
              required
              minLength={10}
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Keywords
            <input
              value={draft.keywords}
              onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
              placeholder="comma, separated, keywords"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.noindex}
              onChange={(e) => setDraft((d) => ({ ...d, noindex: e.target.checked }))}
            />
            noindex (hide from Google)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:col-span-2"
          >
            Save new URL SEO
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <ul className="max-h-[28rem] space-y-1 overflow-y-auto rounded-2xl border border-border bg-card p-2">
          {filtered.map((p) => {
            const group = pathGroup.get(p.path) || "Custom";
            const active = (selected?.path ?? selectedPath) === p.path;
            return (
              <li key={p.path}>
                <button
                  type="button"
                  onClick={() => setSelectedPath(p.path)}
                  className={
                    "w-full rounded-xl px-2.5 py-2 text-left transition-colors " +
                    (active ? "bg-primary text-primary-foreground" : "hover:bg-surface")
                  }
                >
                  <p className="truncate font-mono text-[11px] font-semibold">{p.path}</p>
                  <p
                    className={
                      "truncate text-[10px] " +
                      (active ? "text-primary-foreground/80" : "text-muted-foreground")
                    }
                  >
                    {group}
                  </p>
                </button>
              </li>
            );
          })}
          {!filtered.length ? (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">No pages</li>
          ) : null}
        </ul>

        {edit && selected ? (
          <form
            key={edit.path}
            className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              onError(null);
              try {
                await saveSeo({
                  data: {
                    token,
                    path: edit.path,
                    title: edit.title,
                    description: edit.description,
                    keywords: edit.keywords,
                    noindex: edit.noindex,
                  },
                });
                onMsg(`SEO saved for ${edit.path}`);
                await onRefresh();
              } catch (err) {
                onError(err instanceof Error ? err.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-semibold text-leaf">{edit.path}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pathGroup.get(edit.path) || "Custom"} · updated{" "}
                  {selected.updated_at
                    ? new Date(selected.updated_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700"
                onClick={async () => {
                  if (!confirm(`Delete SEO row for ${edit.path}?`)) return;
                  setBusy(true);
                  try {
                    await deleteSeo({ data: { token, path: edit.path } });
                    onMsg(`Deleted SEO for ${edit.path}`);
                    setSelectedPath(null);
                    await onRefresh();
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Delete failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Trash2 className="size-3" />
                Delete
              </button>
            </div>

            <label className="block text-xs font-semibold">
              Title *
              <input
                required
                value={edit.title}
                onChange={(e) => setEdit((f) => (f ? { ...f, title: e.target.value } : f))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {edit.title.length}/60 recommended
              </span>
            </label>

            <label className="block text-xs font-semibold">
              Meta description *
              <textarea
                required
                rows={3}
                value={edit.description}
                onChange={(e) =>
                  setEdit((f) => (f ? { ...f, description: e.target.value } : f))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {edit.description.length}/160 recommended
              </span>
            </label>

            <label className="block text-xs font-semibold">
              Keywords
              <input
                value={edit.keywords}
                onChange={(e) =>
                  setEdit((f) => (f ? { ...f, keywords: e.target.value } : f))
                }
                placeholder="keyword1, keyword2, keyword3"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={edit.noindex}
                onChange={(e) =>
                  setEdit((f) => (f ? { ...f, noindex: e.target.checked } : f))
                }
              />
              noindex (hide from search engines)
            </label>

            <SeoScorePanel
              title={edit.title}
              keywords={edit.keywords}
              description={edit.description}
              focusKeyword={edit.keywords.split(",")[0]?.trim()}
            />

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save SEO
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Select a URL to edit SEO, or add a new one.
          </div>
        )}
      </div>
    </div>
  );
}
