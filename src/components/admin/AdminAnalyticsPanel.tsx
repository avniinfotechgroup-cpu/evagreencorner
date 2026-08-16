import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Code2, Loader2, Save } from "lucide-react";
import { adminGetSiteScripts, adminUpsertSiteScripts } from "@/lib/platform/cms.functions";
import {
  DEFAULT_SITE_SCRIPTS,
  type SiteScriptsSettings,
} from "@/lib/platform/site-scripts.shared";

type Props = {
  token: string;
  onMsg: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

const INPUT =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf";
const LABEL = "block text-xs font-semibold";

export function AdminAnalyticsPanel({ token, onMsg, onError }: Props) {
  const load = useServerFn(adminGetSiteScripts);
  const save = useServerFn(adminUpsertSiteScripts);
  const [form, setForm] = useState<SiteScriptsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    onError(null);
    try {
      const res = await load({ data: { token } });
      setForm(res.scripts);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load analytics settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && !form) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading scripts…
      </p>
    );
  }

  if (!form) {
    return <p className="text-sm text-muted-foreground">Analytics settings unavailable.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Add Google Analytics, Tag Manager, custom head/body tags, and extra JSON-LD schema. These
          load on every public page. Prefer GA <strong>or</strong> GTM (not both) unless you know
          you need both.
        </p>
        <button
          type="button"
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          onClick={() => {
            setBusy(true);
            onError(null);
            void save({
              data: {
                token,
                scripts: {
                  gaMeasurementId: form.gaMeasurementId,
                  gtmContainerId: form.gtmContainerId,
                  customHeadHtml: form.customHeadHtml,
                  customBodyHtml: form.customBodyHtml,
                  customJsonLd: form.customJsonLd,
                },
              },
            })
              .then((res) => {
                setForm(res.scripts);
                onMsg("Analytics / scripts saved");
              })
              .catch((e) => onError(e instanceof Error ? e.message : "Save failed"))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save scripts
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-2 sm:p-5">
        <label className={LABEL}>
          Google Analytics 4 ID
          <input
            className={INPUT}
            value={form.gaMeasurementId}
            onChange={(e) => setForm((f) => (f ? { ...f, gaMeasurementId: e.target.value } : f))}
            placeholder="G-XXXXXXXXXX"
            autoComplete="off"
          />
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            From GA4 Admin → Data streams → Measurement ID
          </span>
        </label>

        <label className={LABEL}>
          Google Tag Manager ID
          <input
            className={INPUT}
            value={form.gtmContainerId}
            onChange={(e) => setForm((f) => (f ? { ...f, gtmContainerId: e.target.value } : f))}
            placeholder="GTM-XXXXXXX"
            autoComplete="off"
          />
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            Optional — use if you manage tags in GTM instead of direct GA
          </span>
        </label>

        <label className={`${LABEL} sm:col-span-2`}>
          Custom head code
          <textarea
            className={`${INPUT} font-mono text-xs`}
            rows={6}
            value={form.customHeadHtml}
            onChange={(e) => setForm((f) => (f ? { ...f, customHeadHtml: e.target.value } : f))}
            placeholder={`<!-- Meta Pixel, Search Console verify, etc. -->\n<script>...</script>`}
          />
        </label>

        <label className={`${LABEL} sm:col-span-2`}>
          Custom body code
          <textarea
            className={`${INPUT} font-mono text-xs`}
            rows={5}
            value={form.customBodyHtml}
            onChange={(e) => setForm((f) => (f ? { ...f, customBodyHtml: e.target.value } : f))}
            placeholder={`<!-- Chat widgets, GTM noscript extras, etc. -->`}
          />
        </label>

        <label className={`${LABEL} sm:col-span-2`}>
          Extra JSON-LD schema
          <textarea
            className={`${INPUT} font-mono text-xs`}
            rows={8}
            value={form.customJsonLd}
            onChange={(e) => setForm((f) => (f ? { ...f, customJsonLd: e.target.value } : f))}
            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "EVA Green Corner"\n}`}
          />
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            Valid JSON object or array. Added sitewide in addition to built-in Organization /
            WebSite schema. Leave empty to skip.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/30 px-4 py-3 text-xs text-muted-foreground">
        <Code2 className="size-4 text-leaf" />
        Last saved:{" "}
        {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "not yet"}
        <button
          type="button"
          className="ml-auto text-xs font-semibold text-leaf hover:underline"
          onClick={() => setForm({ ...DEFAULT_SITE_SCRIPTS })}
        >
          Clear form fields
        </button>
      </div>
    </div>
  );
}
