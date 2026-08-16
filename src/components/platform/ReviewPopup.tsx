import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Coins,
  Loader2,
  Lock,
  MessageSquarePlus,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getStationCommunity,
  submitStationReview,
} from "@/lib/community/reviews.functions";
import { useAuth } from "@/lib/community/useAuth";

type PhotoDraft = {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
  preview: string;
};

function fileToDraft(file: File): Promise<PhotoDraft> {
  return new Promise((resolve, reject) => {
    const mime = file.type;
    if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
      reject(new Error("Only JPG, PNG or WEBP photos allowed."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve({
        fileName: file.name,
        mimeType: mime,
        base64,
        preview: result,
      });
    };
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });
}

export type ReviewTarget = {
  stationId: string;
  stationName: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReviewTarget | null;
  onSubmitted?: () => void;
};

export function ReviewPopup({ open, onOpenChange, target, onSubmitted }: Props) {
  const stationId = target?.stationId ?? "";
  const stationName = target?.stationName ?? "";
  const { user, token, patchUser } = useAuth();
  const fetchCommunity = useServerFn(getStationCommunity);
  const submitReview = useServerFn(submitStationReview);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCommunity>> | null>(
    null,
  );

  const [rating, setRating] = useState(4);
  const [working, setWorking] = useState<"yes" | "no" | "partial">("yes");
  const [cleanliness, setCleanliness] = useState(4);
  const [waitMinutes, setWaitMinutes] = useState("");
  const [connectorsOk, setConnectorsOk] = useState(true);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);

  const reload = async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await fetchCommunity({
        data: token ? { stationId, token } : { stationId },
      });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !stationId) return;
    setSuccess(null);
    setError(null);
    setComment("");
    setPhotos([]);
    setRating(4);
    setWorking("yes");
    setCleanliness(4);
    setWaitMinutes("");
    setConnectorsOk(true);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stationId, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please login first to submit a review.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await submitReview({
        data: {
          token,
          stationId,
          stationName,
          rating,
          working,
          cleanliness,
          ...(waitMinutes ? { waitMinutes: Number(waitMinutes) } : {}),
          connectorsOk,
          comment,
          ...(photos.length
            ? {
                photos: photos.map(({ fileName, mimeType, base64 }) => ({
                  fileName,
                  mimeType,
                  base64,
                })),
              }
            : {}),
        },
      });
      setSuccess(res.message);
      if (user) patchUser({ ...user, credits: res.balance });
      setComment("");
      setPhotos([]);
      await reload();
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSaving(false);
    }
  };

  const loginRedirect = stationId
    ? `/stations/${encodeURIComponent(stationId)}`
    : "/";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-border p-0 sm:max-w-xl">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 pr-12">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2 font-display text-xl">
              <MessageSquarePlus className="size-5 text-leaf" />
              Reviews & rating
            </DialogTitle>
            <DialogDescription className="text-left">
              {stationName || "EV charging station"} — rate condition, working status, and add
              photos.
            </DialogDescription>
          </DialogHeader>
          {data?.score ? (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Trust score{" "}
              <span className="text-foreground">
                {Math.round(data.score.mlScore ?? data.score.trustScore)}
              </span>{" "}
              · {data.score.reviewCount} reviews · avg{" "}
              {Number(data.score.avgRating || 0).toFixed(1)}★
            </p>
          ) : null}
        </div>

        <div className="space-y-4 px-5 pb-5 pt-2">
          {loading ? (
            <p className="inline-flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading reviews…
            </p>
          ) : (
            <>
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {(data?.reviews ?? []).length === 0 ? (
                  <li className="rounded-2xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    No reviews yet. Be the first and earn credits.
                  </li>
                ) : (
                  data?.reviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-2xl border border-border bg-surface/70 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{r.userName}</p>
                        <p className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Star className="size-3.5 fill-current text-leaf" />
                          {r.rating}/5 · {r.working}
                        </p>
                      </div>
                      <p className="mt-1 text-sm">{r.comment}</p>
                      {r.photosLocked ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Lock className="size-3" /> Photos locked until you review
                        </p>
                      ) : r.photos.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.photos.map((src) => (
                            <a key={src} href={src} target="_blank" rel="noreferrer">
                              <img
                                src={src}
                                alt=""
                                className="h-14 w-20 rounded-lg border border-border object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>

              {!user ? (
                <div className="rounded-2xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm">
                  <p className="font-semibold">Login to write a review</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Google / Microsoft / email — account auto-created. Earn credits for reviews +
                    photos.
                  </p>
                  <Link
                    to="/login"
                    search={{ redirect: loginRedirect }}
                    className="mt-2 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    onClick={() => onOpenChange(false)}
                  >
                    Login to review
                  </Link>
                </div>
              ) : data?.hasViewerReviewed ? (
                <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
                  You already reviewed this station. Credits:{" "}
                  <span className="font-semibold text-foreground">{user.credits}</span>.{" "}
                  <Link to="/rewards" className="font-semibold text-primary underline">
                    Rewards
                  </Link>
                </p>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3 border-t border-border pt-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Coins className="size-4 text-leaf" />
                    Write review · earn {data?.rewards.creditsReview ?? 50}
                    {photos.length ? `+${data?.rewards.creditsPhotoBonus ?? 50}` : ""} credits
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold">
                      Rating
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} stars
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold">
                      Working?
                      <select
                        value={working}
                        onChange={(e) => setWorking(e.target.value as typeof working)}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="yes">Yes — working</option>
                        <option value="partial">Partial</option>
                        <option value="no">Not working</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold">
                      Cleanliness
                      <select
                        value={cleanliness}
                        onChange={(e) => setCleanliness(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n}/5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold">
                      Wait (min, optional)
                      <input
                        value={waitMinutes}
                        onChange={(e) => setWaitMinutes(e.target.value)}
                        type="number"
                        min={0}
                        max={240}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={connectorsOk}
                      onChange={(e) => setConnectorsOk(e.target.checked)}
                    />
                    Connectors / guns usable
                  </label>

                  <label className="block text-xs font-semibold">
                    Your experience (min 20 chars) *
                    <textarea
                      required
                      minLength={20}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="e.g. CCS2 working, parking tight, one gun out of order…"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium">
                    <Camera className="size-4 text-leaf" />
                    Add photos (max 3)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []).slice(0, 3);
                        try {
                          const drafts = await Promise.all(files.map(fileToDraft));
                          setPhotos(drafts.slice(0, 3));
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Photo error");
                        }
                      }}
                    />
                  </label>
                  {photos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {photos.map((p) => (
                        <img
                          key={p.fileName}
                          src={p.preview}
                          alt=""
                          className="h-14 w-20 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  {(error || success) && (
                    <p
                      className={
                        "text-sm " +
                        (error ? "text-destructive" : "font-medium text-foreground")
                      }
                    >
                      {error || success}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Star className="size-4" />
                    )}
                    Submit review
                  </button>
                </form>
              )}

              {error && user && data?.hasViewerReviewed ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
