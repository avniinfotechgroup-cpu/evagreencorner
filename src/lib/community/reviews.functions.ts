import fs from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveUserByToken } from "./auth.server";
import { COMMUNITY_CONFIG } from "./config";
import { newId } from "./crypto";
import { getDb, getUploadDir, type ReviewRow } from "./db";
import { getStationScore, refreshStationScore } from "./ranking";

const photoSchema = z.object({
  fileName: z.string().min(1).max(120),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(20).max(2_500_000),
});

function savePhoto(base64: string, mimeType: string, reviewId: string, index: number) {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const buf = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  if (buf.length > COMMUNITY_CONFIG.maxPhotoBytes) {
    throw new Error("Photo is too large (max ~1.5 MB each).");
  }
  const dir = getUploadDir();
  const fileName = `${reviewId}_${index}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buf);
  return `/uploads/reviews/${fileName}`;
}

function mapReview(
  row: ReviewRow,
  userName: string,
  photos: string[],
  viewerUserId: string | null,
  hasViewerReviewed: boolean,
) {
  const gated =
    COMMUNITY_CONFIG.gatePhotosUntilReviewed &&
    !hasViewerReviewed &&
    viewerUserId !== row.user_id;

  return {
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    userName,
    rating: row.rating,
    working: row.working,
    cleanliness: row.cleanliness,
    waitMinutes: row.wait_minutes,
    connectorsOk: Boolean(row.connectors_ok),
    comment: row.comment,
    creditsEarned: row.credits_earned,
    createdAt: row.created_at,
    photos: gated ? [] : photos,
    photosLocked: gated && photos.length > 0,
    photoCount: photos.length,
  };
}

export const getStationCommunity = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        stationId: z.string().min(1),
        token: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const viewer = resolveUserByToken(data.token);
    const mine = viewer
      ? (db
          .prepare(`SELECT id FROM reviews WHERE user_id = ? AND station_id = ?`)
          .get(viewer.id, data.stationId) as { id: string } | undefined)
      : undefined;
    const hasViewerReviewed = Boolean(mine);

    const rows = db
      .prepare(
        `SELECT r.*, u.name as user_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.station_id = ?
         ORDER BY r.created_at DESC
         LIMIT 50`,
      )
      .all(data.stationId) as Array<ReviewRow & { user_name: string }>;

    const reviews = rows.map((row) => {
      const photos = (
        db
          .prepare(`SELECT path FROM review_photos WHERE review_id = ? ORDER BY created_at`)
          .all(row.id) as Array<{ path: string }>
      ).map((p) => p.path);
      return mapReview(row, row.user_name, photos, viewer?.id ?? null, hasViewerReviewed);
    });

    let score = getStationScore(data.stationId);
    if (!score && reviews.length) score = refreshStationScore(data.stationId);

    return {
      score,
      reviews,
      hasViewerReviewed,
      viewerCredits: viewer?.credits ?? null,
      rewards: {
        creditsReview: COMMUNITY_CONFIG.creditsReview,
        creditsPhotoBonus: COMMUNITY_CONFIG.creditsPhotoBonus,
        redeemCredits: COMMUNITY_CONFIG.redeemCredits,
        redeemCashInr: COMMUNITY_CONFIG.redeemCashInr,
      },
    };
  });

export const submitStationReview = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        stationId: z.string().min(1),
        stationName: z.string().min(1).max(200),
        rating: z.number().int().min(1).max(5),
        working: z.enum(["yes", "no", "partial"]),
        cleanliness: z.number().int().min(1).max(5),
        waitMinutes: z.number().int().min(0).max(240).optional(),
        connectorsOk: z.boolean(),
        comment: z.string().min(20).max(1000),
        photos: z.array(photoSchema).max(COMMUNITY_CONFIG.maxPhotosPerReview).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = resolveUserByToken(data.token);
    if (!user) throw new Error("Please log in to submit a review.");

    const db = getDb();
    const existing = db
      .prepare(`SELECT id FROM reviews WHERE user_id = ? AND station_id = ?`)
      .get(user.id, data.stationId);
    if (existing) {
      throw new Error("You already reviewed this station. One review per station.");
    }

    const photos = data.photos ?? [];
    const credits =
      COMMUNITY_CONFIG.creditsReview +
      (photos.length > 0 ? COMMUNITY_CONFIG.creditsPhotoBonus : 0);

    const reviewId = newId("rev");
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO reviews (
        id, station_id, station_name, user_id, rating, working, cleanliness,
        wait_minutes, connectors_ok, comment, credits_earned, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      reviewId,
      data.stationId,
      data.stationName,
      user.id,
      data.rating,
      data.working,
      data.cleanliness,
      data.waitMinutes ?? null,
      data.connectorsOk ? 1 : 0,
      data.comment.trim(),
      credits,
      now,
    );

    photos.forEach((photo, i) => {
      const photoPath = savePhoto(photo.base64, photo.mimeType, reviewId, i);
      db.prepare(
        `INSERT INTO review_photos (id, review_id, path, created_at) VALUES (?, ?, ?, ?)`,
      ).run(newId("ph"), reviewId, photoPath, now);
    });

    db.prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`).run(credits, user.id);
    db.prepare(
      `INSERT INTO credit_ledger (id, user_id, delta, reason, ref_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      newId("cr"),
      user.id,
      credits,
      photos.length ? "review_with_photo" : "review",
      reviewId,
      now,
    );

    const score = refreshStationScore(data.stationId);
    const updated = db.prepare(`SELECT credits FROM users WHERE id = ?`).get(user.id) as {
      credits: number;
    };

    return {
      ok: true as const,
      creditsEarned: credits,
      balance: updated.credits,
      score,
      message:
        photos.length > 0
          ? `Thanks! You earned ${credits} credits for review + photos.`
          : `Thanks! You earned ${credits} credits. Add photos next time for +${COMMUNITY_CONFIG.creditsPhotoBonus} bonus.`,
    };
  });

export const requestCreditRedeem = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        upiId: z.string().min(3).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = resolveUserByToken(data.token);
    if (!user) throw new Error("Please log in.");

    const need = COMMUNITY_CONFIG.redeemCredits;
    const cash = COMMUNITY_CONFIG.redeemCashInr;
    const db = getDb();
    const row = db.prepare(`SELECT credits FROM users WHERE id = ?`).get(user.id) as {
      credits: number;
    };
    if (row.credits < need) {
      throw new Error(`Need ${need} credits to redeem ₹${cash}. You have ${row.credits}.`);
    }

    const pending = db
      .prepare(
        `SELECT id FROM redeem_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      )
      .get(user.id);
    if (pending) throw new Error("You already have a pending cash redeem request.");

    const now = new Date().toISOString();
    const id = newId("rdm");
    db.prepare(`UPDATE users SET credits = credits - ? WHERE id = ?`).run(need, user.id);
    db.prepare(
      `INSERT INTO credit_ledger (id, user_id, delta, reason, ref_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(newId("cr"), user.id, -need, "redeem_cash", id, now);
    db.prepare(
      `INSERT INTO redeem_requests (id, user_id, credits, cash_inr, upi_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(id, user.id, need, cash, data.upiId.trim(), now);

    return {
      ok: true as const,
      message: `Redeem request submitted for ₹${cash} to ${data.upiId.trim()}. Admin will process UPI payout.`,
      balance: row.credits - need,
    };
  });

export const getMyRewards = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().optional() }).parse(input))
  .handler(async ({ data }) => {
    const user = resolveUserByToken(data.token);
    if (!user) return { user: null };

    const db = getDb();
    const ledger = db
      .prepare(
        `SELECT id, delta, reason, ref_id, created_at FROM credit_ledger
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      )
      .all(user.id) as Array<{
      id: string;
      delta: number;
      reason: string;
      ref_id: string | null;
      created_at: string;
    }>;

    const redeems = db
      .prepare(
        `SELECT id, credits, cash_inr, upi_id, status, created_at FROM redeem_requests
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      )
      .all(user.id) as Array<{
      id: string;
      credits: number;
      cash_inr: number;
      upi_id: string;
      status: string;
      created_at: string;
    }>;

    const reviews = db
      .prepare(
        `SELECT id, station_id, station_name, rating, credits_earned, created_at
         FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .all(user.id) as Array<{
      id: string;
      station_id: string;
      station_name: string;
      rating: number;
      credits_earned: number;
      created_at: string;
    }>;

    return {
      user,
      ledger,
      redeems,
      reviews,
      rewards: {
        creditsReview: COMMUNITY_CONFIG.creditsReview,
        creditsPhotoBonus: COMMUNITY_CONFIG.creditsPhotoBonus,
        redeemCredits: COMMUNITY_CONFIG.redeemCredits,
        redeemCashInr: COMMUNITY_CONFIG.redeemCashInr,
      },
    };
  });

/** Batch community rating/review counts for station list cards. */
export const getStationsCommunitySummary = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ stationIds: z.array(z.string().min(1)).max(150) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const summaries: Record<
      string,
      {
        avgRating: number;
        reviewCount: number;
        trustScore: number;
        workingRate: number;
      }
    > = {};

    for (const id of data.stationIds) {
      summaries[id] = {
        avgRating: 0,
        reviewCount: 0,
        trustScore: 0,
        workingRate: 0,
      };
    }

    if (!data.stationIds.length) return { summaries };

    const placeholders = data.stationIds.map(() => "?").join(",");
    const scoreRows = db
      .prepare(
        `SELECT station_id, trust_score, review_count, avg_rating, working_rate, ml_score
         FROM station_scores
         WHERE station_id IN (${placeholders})`,
      )
      .all(...data.stationIds) as Array<{
      station_id: string;
      trust_score: number;
      review_count: number;
      avg_rating: number;
      working_rate: number;
      ml_score: number | null;
    }>;

    for (const row of scoreRows) {
      summaries[row.station_id] = {
        avgRating: Math.round(Number(row.avg_rating) * 10) / 10,
        reviewCount: Number(row.review_count),
        trustScore: Math.round(Number(row.ml_score ?? row.trust_score)),
        workingRate: Number(row.working_rate),
      };
    }

    // Fallback: stations with reviews but missing score row
    const reviewRows = db
      .prepare(
        `SELECT station_id,
                COUNT(*) as cnt,
                AVG(rating) as avg_rating,
                AVG(CASE working WHEN 'yes' THEN 1.0 WHEN 'partial' THEN 0.5 ELSE 0.0 END) as working_rate
         FROM reviews
         WHERE station_id IN (${placeholders})
         GROUP BY station_id`,
      )
      .all(...data.stationIds) as Array<{
      station_id: string;
      cnt: number;
      avg_rating: number;
      working_rate: number;
    }>;

    for (const row of reviewRows) {
      const existing = summaries[row.station_id];
      if (existing && existing.reviewCount > 0) continue;
      summaries[row.station_id] = {
        avgRating: Math.round(Number(row.avg_rating) * 10) / 10,
        reviewCount: Number(row.cnt),
        trustScore: existing?.trustScore || 0,
        workingRate: Number(row.working_rate),
      };
    }

    return { summaries };
  });

export const exportReviewsForMl = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.station_id, r.rating, r.working, r.cleanliness, r.wait_minutes,
              r.connectors_ok, r.created_at,
              (SELECT COUNT(*) FROM review_photos p WHERE p.review_id = r.id) as photo_count
       FROM reviews r`,
    )
    .all() as Array<{
    station_id: string;
    rating: number;
    working: string;
    cleanliness: number;
    wait_minutes: number | null;
    connectors_ok: number;
    created_at: string;
    photo_count: number;
  }>;
  return { reviews: rows, exportedAt: new Date().toISOString() };
});
