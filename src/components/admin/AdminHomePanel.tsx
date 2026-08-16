import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Home, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import {
  adminGetHomeContent,
  adminResetHomeContent,
  adminUpsertHomeContent,
} from "@/lib/platform/cms.functions";
import { adminUploadEditorImage } from "@/lib/platform/media.functions";
import type { HomeContent, HomeFaq, HomePopularArea } from "@/lib/platform/home-content.shared";

type Props = {
  token: string;
  onMsg: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

const INPUT =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf";
const LABEL = "block text-xs font-semibold";

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function AdminHomePanel({ token, onMsg, onError }: Props) {
  const load = useServerFn(adminGetHomeContent);
  const save = useServerFn(adminUpsertHomeContent);
  const reset = useServerFn(adminResetHomeContent);
  const uploadImage = useServerFn(adminUploadEditorImage);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    onError(null);
    try {
      const res = await load({ data: { token } });
      setForm(res.home);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load home page CMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setField = <K extends keyof HomeContent>(key: K, value: HomeContent[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateArea = (index: number, patch: Partial<HomePopularArea>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const popularAreas = prev.popularAreas.map((a, i) =>
        i === index ? { ...a, ...patch } : a,
      );
      return { ...prev, popularAreas };
    });
  };

  const updateFaq = (index: number, patch: Partial<HomeFaq>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const faqs = prev.faqs.map((f, i) => (i === index ? { ...f, ...patch } : f));
      return { ...prev, faqs };
    });
  };

  const onUploadHero = async (file: File) => {
    if (!form) return;
    setBusy(true);
    onError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Read failed"));
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(file);
      });
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const mimeType =
        file.type === "image/png"
          ? "image/png"
          : file.type === "image/webp"
            ? "image/webp"
            : "image/jpeg";
      const res = await uploadImage({
        data: {
          token,
          mimeType,
          base64,
          altText: form.heroImageAlt || "Home hero",
        },
      });
      setField("heroImageUrl", res.url);
      onMsg("Hero image uploaded");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Hero upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading && !form) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading home CMS…
      </p>
    );
  }

  if (!form) {
    return <p className="text-sm text-muted-foreground">Home content unavailable.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Edit every public homepage section. Page title / meta description for{" "}
          <code className="rounded bg-surface px-1">/</code> stay under Modules &amp; SEO.
        </p>
        <Link
          to="/"
          className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-leaf"
        >
          Open public home
        </Link>
        <button
          type="button"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-60"
          onClick={() => {
            if (!confirm("Reset homepage copy to defaults?")) return;
            setBusy(true);
            void reset({ data: { token } })
              .then((res) => {
                setForm(res.home);
                onMsg("Home page reset to defaults");
              })
              .catch((e) => onError(e instanceof Error ? e.message : "Reset failed"))
              .finally(() => setBusy(false));
          }}
        >
          <RotateCcw className="size-3.5" />
          Reset defaults
        </button>
        <button
          type="button"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          onClick={() => {
            setBusy(true);
            onError(null);
            void save({ data: { token, home: form as unknown as Record<string, unknown> } })
              .then((res) => {
                setForm(res.home);
                onMsg("Home page saved");
              })
              .catch((e) => onError(e instanceof Error ? e.message : "Save failed"))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save home page
        </button>
      </div>

      <SectionCard title="Hero" hint="Top banner: tagline, headline, subcopy, CTAs and background image.">
        <label className={LABEL}>
          Tagline
          <input
            className={INPUT}
            value={form.heroTagline}
            onChange={(e) => setField("heroTagline", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Headline
          <input
            className={INPUT}
            value={form.heroHeadline}
            onChange={(e) => setField("heroHeadline", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Subcopy
          <textarea
            className={INPUT}
            rows={3}
            value={form.heroSubcopy}
            onChange={(e) => setField("heroSubcopy", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Primary CTA label
          <input
            className={INPUT}
            value={form.primaryCtaLabel}
            onChange={(e) => setField("primaryCtaLabel", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Primary CTA link
          <input
            className={INPUT}
            value={form.primaryCtaHref}
            onChange={(e) => setField("primaryCtaHref", e.target.value)}
            placeholder="/find-chargers"
          />
        </label>
        <label className={LABEL}>
          Secondary CTA label
          <input
            className={INPUT}
            value={form.secondaryCtaLabel}
            onChange={(e) => setField("secondaryCtaLabel", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Secondary CTA link
          <input
            className={INPUT}
            value={form.secondaryCtaHref}
            onChange={(e) => setField("secondaryCtaHref", e.target.value)}
            placeholder="/route-planner"
          />
        </label>
        <label className={LABEL}>
          Hero image ALT
          <input
            className={INPUT}
            value={form.heroImageAlt}
            onChange={(e) => setField("heroImageAlt", e.target.value)}
          />
        </label>
        <div className="text-xs font-semibold">
          Hero image
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUploadHero(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
            >
              <Upload className="size-3.5" />
              Upload image
            </button>
            {form.heroImageUrl ? (
              <button
                type="button"
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-rose-700"
                onClick={() => setField("heroImageUrl", "")}
              >
                Use default image
              </button>
            ) : (
              <span className="text-[11px] font-normal text-muted-foreground">
                Empty = built-in hero photo
              </span>
            )}
          </div>
          {form.heroImageUrl ? (
            <img
              src={form.heroImageUrl}
              alt={form.heroImageAlt || "Hero preview"}
              className="mt-2 max-h-36 rounded-xl border border-border object-cover"
            />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Intro">
        <label className={`${LABEL} sm:col-span-2`}>
          Heading
          <input
            className={INPUT}
            value={form.introHeading}
            onChange={(e) => setField("introHeading", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Body
          <textarea
            className={INPUT}
            rows={4}
            value={form.introBody}
            onChange={(e) => setField("introBody", e.target.value)}
          />
        </label>
      </SectionCard>

      <SectionCard title="Modules section" hint="Headings above the module cards. Toggle modules in Modules & SEO.">
        <label className={LABEL}>
          Eyebrow
          <input
            className={INPUT}
            value={form.modulesEyebrow}
            onChange={(e) => setField("modulesEyebrow", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Heading
          <input
            className={INPUT}
            value={form.modulesHeading}
            onChange={(e) => setField("modulesHeading", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Body
          <textarea
            className={INPUT}
            rows={3}
            value={form.modulesBody}
            onChange={(e) => setField("modulesBody", e.target.value)}
          />
        </label>
      </SectionCard>

      <SectionCard title="Popular areas" hint="City / neighbourhood cards that deep-link to live chargers.">
        <label className={LABEL}>
          Eyebrow
          <input
            className={INPUT}
            value={form.popularEyebrow}
            onChange={(e) => setField("popularEyebrow", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Heading
          <input
            className={INPUT}
            value={form.popularHeading}
            onChange={(e) => setField("popularHeading", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Body
          <textarea
            className={INPUT}
            rows={2}
            value={form.popularBody}
            onChange={(e) => setField("popularBody", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Search CTA label
          <input
            className={INPUT}
            value={form.popularCtaLabel}
            onChange={(e) => setField("popularCtaLabel", e.target.value)}
          />
        </label>

        <div className="sm:col-span-2 space-y-3">
          {form.popularAreas.map((area, i) => (
            <div
              key={`${area.name}-${i}`}
              className="grid gap-2 rounded-xl border border-border bg-surface/40 p-3 sm:grid-cols-6"
            >
              <input
                className={INPUT}
                placeholder="Area"
                value={area.name}
                onChange={(e) => updateArea(i, { name: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="City"
                value={area.city}
                onChange={(e) => updateArea(i, { city: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Pincode"
                value={area.pincode}
                onChange={(e) => updateArea(i, { pincode: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Lat"
                type="number"
                step="any"
                value={area.lat}
                onChange={(e) => updateArea(i, { lat: Number(e.target.value) })}
              />
              <input
                className={INPUT}
                placeholder="Lng"
                type="number"
                step="any"
                value={area.lng}
                onChange={(e) => updateArea(i, { lng: Number(e.target.value) })}
              />
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-300 px-2 text-xs font-semibold text-rose-700"
                onClick={() =>
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          popularAreas: prev.popularAreas.filter((_, idx) => idx !== i),
                        }
                      : prev,
                  )
                }
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
            onClick={() =>
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      popularAreas: [
                        ...prev.popularAreas,
                        { name: "", city: "", pincode: "", lat: 0, lng: 0 },
                      ],
                    }
                  : prev,
              )
            }
          >
            <Plus className="size-3.5" />
            Add area
          </button>
        </div>
      </SectionCard>

      <SectionCard title="FAQs">
        <label className={`${LABEL} sm:col-span-2`}>
          Section heading
          <input
            className={INPUT}
            value={form.faqHeading}
            onChange={(e) => setField("faqHeading", e.target.value)}
          />
        </label>
        <div className="sm:col-span-2 space-y-3">
          {form.faqs.map((faq, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border bg-surface/40 p-3">
              <input
                className={INPUT}
                placeholder="Question"
                value={faq.q}
                onChange={(e) => updateFaq(i, { q: e.target.value })}
              />
              <textarea
                className={INPUT}
                rows={3}
                placeholder="Answer"
                value={faq.a}
                onChange={(e) => updateFaq(i, { a: e.target.value })}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700"
                onClick={() =>
                  setForm((prev) =>
                    prev
                      ? { ...prev, faqs: prev.faqs.filter((_, idx) => idx !== i) }
                      : prev,
                  )
                }
              >
                <Trash2 className="size-3" />
                Remove FAQ
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
            onClick={() =>
              setForm((prev) =>
                prev ? { ...prev, faqs: [...prev.faqs, { q: "", a: "" }] } : prev,
              )
            }
          >
            <Plus className="size-3.5" />
            Add FAQ
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Bottom CTA band">
        <label className={`${LABEL} sm:col-span-2`}>
          Heading
          <input
            className={INPUT}
            value={form.bottomHeading}
            onChange={(e) => setField("bottomHeading", e.target.value)}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Body
          <textarea
            className={INPUT}
            rows={2}
            value={form.bottomBody}
            onChange={(e) => setField("bottomBody", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Primary label
          <input
            className={INPUT}
            value={form.bottomPrimaryLabel}
            onChange={(e) => setField("bottomPrimaryLabel", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Primary link
          <input
            className={INPUT}
            value={form.bottomPrimaryHref}
            onChange={(e) => setField("bottomPrimaryHref", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Secondary label
          <input
            className={INPUT}
            value={form.bottomSecondaryLabel}
            onChange={(e) => setField("bottomSecondaryLabel", e.target.value)}
          />
        </label>
        <label className={LABEL}>
          Secondary link
          <input
            className={INPUT}
            value={form.bottomSecondaryHref}
            onChange={(e) => setField("bottomSecondaryHref", e.target.value)}
          />
        </label>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/30 px-4 py-3 text-xs text-muted-foreground">
        <Home className="size-4 text-leaf" />
        Last saved: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "not yet"}
      </div>
    </div>
  );
}
