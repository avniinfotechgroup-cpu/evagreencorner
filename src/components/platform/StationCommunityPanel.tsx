import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, MessageSquarePlus, Star, Trophy } from "lucide-react";
import { getStationCommunity } from "@/lib/community/reviews.functions";
import { useAuth } from "@/lib/community/useAuth";
import { ReviewPopup } from "./ReviewPopup";

type Props = {
  stationId: string;
  stationName: string;
};

export function StationCommunityPanel({ stationId, stationName }: Props) {
  const { user, token } = useAuth();
  const fetchCommunity = useServerFn(getStationCommunity);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCommunity>> | null>(
    null,
  );
  const [reviewOpen, setReviewOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetchCommunity({
        data: token ? { stationId, token } : { stationId },
      });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, token]);

  const scoreLabel = useMemo(() => {
    const s = data?.score?.trustScore;
    if (s == null) return "No community score yet";
    if (s >= 80) return "Highly trusted by drivers";
    if (s >= 60) return "Generally reliable";
    if (s >= 40) return "Mixed reports";
    return "Needs caution — check recent reviews";
  }, [data?.score?.trustScore]);

  const reviewCount = data?.score?.reviewCount ?? data?.reviews?.length ?? 0;
  const avgRating = Number(data?.score?.avgRating || 0);

  return (
    <>
      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
              <Trophy className="size-5 text-leaf" />
              Community condition & ranking
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Driver reviews and photos power this station’s trust score.
            </p>
          </div>
          {data?.score ? (
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center">
              <p className="text-xs font-semibold text-muted-foreground">Trust score</p>
              <p className="font-display text-3xl font-bold text-foreground">
                {Math.round(data.score.mlScore ?? data.score.trustScore)}
              </p>
              <p className="text-[11px] text-muted-foreground">{scoreLabel}</p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading community reviews…
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Star className="size-4 fill-current text-leaf" />
                {reviewCount > 0 ? `${avgRating.toFixed(1)} · ${reviewCount} reviews` : "No reviews yet"}
              </p>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-leaf/40 bg-leaf/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-leaf/20"
              >
                <MessageSquarePlus className="size-4 text-leaf" />
                {data?.hasViewerReviewed
                  ? "View reviews"
                  : reviewCount > 0
                    ? "Rate / review"
                    : "Be first to review"}
              </button>
            </div>

            {!data?.hasViewerReviewed && (
              <div className="rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">
                  Help the next EV driver — review in one popup
                </p>
                <p className="mt-1 text-muted-foreground">
                  Earn {data?.rewards.creditsReview ?? 50} credits (+
                  {data?.rewards.creditsPhotoBonus ?? 50} with photos). After{" "}
                  {data?.rewards.redeemCredits ?? 500} credits redeem ₹
                  {data?.rewards.redeemCashInr ?? 50}.
                </p>
                {!user && (
                  <Link
                    to="/login"
                    search={{ redirect: `/stations/${stationId}` }}
                    className="mt-2 inline-flex font-semibold text-primary underline"
                  >
                    Login to review
                  </Link>
                )}
              </div>
            )}

            <ul className="space-y-3">
              {(data?.reviews ?? []).slice(0, 2).map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border bg-surface/60 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{r.userName}</p>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Star className="size-3.5 fill-current text-leaf" />
                      {r.rating}/5 · {r.working}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{r.comment}</p>
                  {r.photosLocked ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Lock className="size-3.5" />
                      Photos locked — review to unlock
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>

            {(data?.reviews?.length ?? 0) > 2 ? (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="text-sm font-semibold text-primary underline"
              >
                See all {data?.reviews?.length} reviews in popup
              </button>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}
      </section>

      <ReviewPopup
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={{ stationId, stationName }}
        onSubmitted={() => {
          void reload();
        }}
      />
    </>
  );
}
