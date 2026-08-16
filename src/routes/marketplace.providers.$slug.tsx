import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { BannerMenu } from "@/components/platform/BannerMenu";
import { useAuth } from "@/lib/community/useAuth";
import {
  getMarketplaceProvider,
  submitMarketplaceLead,
} from "@/lib/marketplace/public.functions";

export const Route = createFileRoute("/marketplace/providers/$slug")({
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title = `${label} — Green Services | ${siteConfig.name}`;
    const description = `View ${label} profile and request a quote for green & clean-energy services on EVA Green Corner.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: MarketplaceProviderPage,
});

function MarketplaceProviderPage() {
  const { slug } = Route.useParams();
  const { token } = useAuth();
  const load = useServerFn(getMarketplaceProvider);
  const submitLead = useServerFn(submitMarketplaceLead);

  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [leadOk, setLeadOk] = useState<{
    leadNumber: string;
    matchedCount: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load({ data: { slug } });
        if (!cancelled) {
          setData(res);
          if (res.provider) {
            setCity(res.provider.city || "");
            setState(res.provider.state || "");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load provider");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLeadOk(null);
    setSubmitting(true);
    try {
      const res = await submitLead({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          description: description.trim(),
          budget: budget.trim(),
          providerSlug: slug,
          source: "provider_profile",
          token,
        },
      });
      setLeadOk({ leadNumber: res.leadNumber, matchedCount: res.matchedCount });
      setDescription("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit quote request");
    } finally {
      setSubmitting(false);
    }
  }

  const p = data?.provider;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-canopy">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-8">
            <BannerMenu />
            <p className="mt-4 text-xs font-semibold text-primary-foreground/80">
              <Link to="/marketplace" className="hover:underline">
                Marketplace
              </Link>
              {" / "}
              Provider
            </p>
            {loading ? (
              <p className="mt-6 flex items-center gap-2 text-sm text-primary-foreground/85">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </p>
            ) : null}
            {!loading && p ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
                    {p.businessName}
                  </h1>
                  {p.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                      <BadgeCheck className="size-3.5" /> Verified
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <MapPin className="size-3.5" />
                  {p.city}
                  {p.state ? `, ${p.state}` : ""}
                  {p.yearsExperience != null ? ` · ${p.yearsExperience}+ years` : ""}
                </p>
              </>
            ) : null}
            {!loading && !p && !error ? (
              <p className="mt-6 text-sm text-primary-foreground/85">
                Provider not found or not yet verified.
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mx-auto max-w-6xl px-5 py-10 text-sm text-destructive">{error}</p>
        ) : null}

        {p ? (
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <section>
                <h2 className="font-display text-lg font-bold">About</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                {p.website ? (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf hover:underline"
                  >
                    Website <ExternalLink className="size-3" />
                  </a>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">{p.contactHint}</p>
              </section>

              {p.services.length ? (
                <section>
                  <h2 className="font-display text-lg font-bold">Services</h2>
                  <ul className="mt-3 space-y-2">
                    {p.services.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-soft"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold">{s.serviceName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {s.categoryName}
                          </span>
                        </div>
                        {s.startingPrice != null ? (
                          <p className="mt-1 text-xs text-leaf">
                            From ₹{s.startingPrice.toLocaleString("en-IN")}
                            {s.priceUnit ? ` ${s.priceUnit}` : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">Quote on request</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {p.locations.length ? (
                <section>
                  <h2 className="font-display text-lg font-bold">Service areas</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.locations.map((loc) => (
                      <li
                        key={loc.id}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
                      >
                        {loc.city}
                        {loc.state ? `, ${loc.state}` : ""}
                        {loc.serviceRadiusKm != null
                          ? ` · ${loc.serviceRadiusKm} km`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="lg:col-span-2">
              <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-lift">
                <h2 className="font-display text-lg font-bold">Request quote</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your phone and email are shared only with matched providers — never shown
                  on this public page.
                </p>

                {leadOk ? (
                  <div className="mt-4 rounded-xl border border-leaf/30 bg-accent p-4 text-sm">
                    <p className="font-semibold text-foreground">Quote request sent</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reference <strong>{leadOk.leadNumber}</strong>
                      {leadOk.matchedCount
                        ? ` · matched ${leadOk.matchedCount} provider(s)`
                        : ""}
                    </p>
                  </div>
                ) : null}

                <form className="mt-4 space-y-3" onSubmit={onSubmit}>
                  <label className="block text-xs font-semibold">
                    Name
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Phone
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Email (optional)
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold">
                      City
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      State
                      <input
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold">
                    Pincode
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Project details
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                      placeholder="Capacity, timeline, site type…"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Budget (optional)
                    <input
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
                      placeholder="e.g. ₹2–3 lakh"
                    />
                  </label>
                  {formError ? (
                    <p className="text-xs text-destructive">{formError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    <Send className="size-4" />
                    {submitting ? "Sending…" : "Request quote"}
                  </button>
                </form>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
