import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Loader2, Wallet } from "lucide-react";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { siteConfig } from "@/config/platform";
import { logoutUser } from "@/lib/community/auth.functions";
import { getMyRewards, requestCreditRedeem } from "@/lib/community/reviews.functions";
import { useAuth } from "@/lib/community/useAuth";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: `Credits & cash rewards | ${siteConfig.name}` },
      {
        name: "description",
        content: "Earn credits by reviewing EV charging stations and redeem for cash via UPI.",
      },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { user, token, logout, patchUser, ready } = useAuth();
  const fetchRewards = useServerFn(getMyRewards);
  const redeem = useServerFn(requestCreditRedeem);
  const doLogout = useServerFn(logoutUser);

  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRewards>> | null>(null);
  const [upiId, setUpiId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    void fetchRewards({ data: { token } }).then(setData).catch(() => setData({ user: null }));
  }, [ready, token, fetchRewards]);

  if (ready && !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Credits & rewards</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Login to track credits, reviews, and cash redeem requests.
          </p>
          <Link
            to="/login"
            search={{ redirect: "/rewards" }}
            className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Login / Sign up
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const rewards = data?.rewards;
  const need = rewards?.redeemCredits ?? 500;
  const cash = rewards?.redeemCashInr ?? 50;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Your rewards</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hi {user?.name} — review stations, upload condition photos, earn credits.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (token) await doLogout({ data: { token } }).catch(() => undefined);
              logout();
            }}
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <Coins className="size-5 text-leaf" />
            <p className="mt-3 text-xs font-semibold text-muted-foreground">Credit balance</p>
            <p className="font-display text-3xl font-bold">{user?.credits ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <Wallet className="size-5 text-leaf" />
            <p className="mt-3 text-xs font-semibold text-muted-foreground">Cash redeem</p>
            <p className="font-display text-xl font-bold">
              {need} → ₹{cash}
            </p>
            <p className="text-[11px] text-muted-foreground">UPI payout request</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs font-semibold text-muted-foreground">Earn rates</p>
            <p className="mt-2 text-sm">
              Review: <strong>{rewards?.creditsReview ?? 50}</strong> credits
            </p>
            <p className="text-sm">
              + Photos: <strong>+{rewards?.creditsPhotoBonus ?? 50}</strong>
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-bold">Redeem cash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When you reach {need} credits, request ₹{cash} to your UPI. Status stays pending until
            admin pays out.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token) return;
              setBusy(true);
              setErr(null);
              setMsg(null);
              try {
                const res = await redeem({ data: { token, upiId } });
                setMsg(res.message);
                if (user) patchUser({ ...user, credits: res.balance });
                const next = await fetchRewards({ data: { token } });
                setData(next);
              } catch (error) {
                setErr(error instanceof Error ? error.message : "Redeem failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={busy || (user?.credits ?? 0) < need}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Request ₹{cash}
            </button>
          </form>
          {(msg || err) && (
            <p className={"mt-2 text-sm " + (err ? "text-destructive" : "text-foreground")}>
              {err || msg}
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">Your station reviews</h2>
          <ul className="mt-3 space-y-2">
            {(data && "reviews" in data ? data.reviews : [])?.length ? (
              (data as { reviews: Array<{ id: string; station_name: string; rating: number; credits_earned: number; station_id: string }> }).reviews.map(
                (r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                  >
                    <Link
                      to="/stations/$stationId"
                      params={{ stationId: r.station_id }}
                      className="font-semibold hover:underline"
                    >
                      {r.station_name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.rating}/5 · +{r.credits_earned} credits
                    </span>
                  </li>
                ),
              )
            ) : (
              <li className="text-sm text-muted-foreground">
                No reviews yet. Open a station and submit a condition report.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">Credit history</h2>
          <ul className="mt-3 space-y-2">
            {(data && "ledger" in data ? data.ledger : [])?.map((row) => (
              <li
                key={row.id}
                className="flex justify-between rounded-2xl border border-border bg-card px-4 py-2 text-sm"
              >
                <span>{row.reason}</span>
                <span className={row.delta >= 0 ? "font-semibold text-leaf" : "font-semibold"}>
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
