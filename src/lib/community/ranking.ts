import { COMMUNITY_CONFIG } from "./config";
import { getDb } from "./db";

export type StationCommunityScore = {
  stationId: string;
  trustScore: number;
  reviewCount: number;
  avgRating: number;
  workingRate: number;
  mlScore: number | null;
  updatedAt: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Heuristic trust score from community reviews (0–100). */
export function computeHeuristicScore(input: {
  avgRating: number;
  workingRate: number;
  cleanlinessAvg: number;
  photoRate: number;
  reviewCount: number;
}): number {
  const ratingPart = (input.avgRating / 5) * 40;
  const workingPart = input.workingRate * 30;
  const cleanPart = (input.cleanlinessAvg / 5) * 15;
  const photoPart = input.photoRate * 10;
  const volumePart = clamp(input.reviewCount / 20, 0, 1) * 5;
  return Math.round(clamp(ratingPart + workingPart + cleanPart + photoPart + volumePart, 0, 100));
}

export function refreshStationScore(stationId: string): StationCommunityScore {
  const db = getDb();
  const agg = db
    .prepare(
      `SELECT
        COUNT(*) as cnt,
        AVG(rating) as avg_rating,
        AVG(CASE working WHEN 'yes' THEN 1.0 WHEN 'partial' THEN 0.5 ELSE 0.0 END) as working_rate,
        AVG(cleanliness) as cleanliness_avg
      FROM reviews WHERE station_id = ?`,
    )
    .get(stationId) as
    | {
        cnt: number;
        avg_rating: number | null;
        working_rate: number | null;
        cleanliness_avg: number | null;
      }
    | undefined;

  const reviewCount = Number(agg?.cnt ?? 0);
  const avgRating = Number(agg?.avg_rating ?? 0);
  const workingRate = Number(agg?.working_rate ?? 0);
  const cleanlinessAvg = Number(agg?.cleanliness_avg ?? 0);

  const photoRow = db
    .prepare(
      `SELECT COUNT(DISTINCT r.id) as with_photos
       FROM reviews r
       INNER JOIN review_photos p ON p.review_id = r.id
       WHERE r.station_id = ?`,
    )
    .get(stationId) as { with_photos: number } | undefined;
  const photoRate = reviewCount > 0 ? Number(photoRow?.with_photos ?? 0) / reviewCount : 0;

  const trustScore = computeHeuristicScore({
    avgRating,
    workingRate,
    cleanlinessAvg,
    photoRate,
    reviewCount,
  });

  let mlScore: number | null = null;
  // Best-effort call to Python model; never block review save.
  // Fire-and-forget style via sync try (short timeout not available in fetch easily).
  try {
    // Store previous ml_score if any; async retrain happens in ML service.
    const prev = db
      .prepare(`SELECT ml_score FROM station_scores WHERE station_id = ?`)
      .get(stationId) as { ml_score: number | null } | undefined;
    mlScore = prev?.ml_score ?? null;
  } catch {
    mlScore = null;
  }

  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO station_scores (station_id, trust_score, review_count, avg_rating, working_rate, ml_score, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(station_id) DO UPDATE SET
       trust_score = excluded.trust_score,
       review_count = excluded.review_count,
       avg_rating = excluded.avg_rating,
       working_rate = excluded.working_rate,
       ml_score = COALESCE(excluded.ml_score, station_scores.ml_score),
       updated_at = excluded.updated_at`,
  ).run(stationId, trustScore, reviewCount, avgRating, workingRate, mlScore, updatedAt);

  // Kick ML train/score in background (ignore failures).
  void notifyMl(stationId).catch(() => undefined);

  return {
    stationId,
    trustScore,
    reviewCount,
    avgRating: Math.round(avgRating * 10) / 10,
    workingRate: Math.round(workingRate * 100) / 100,
    mlScore,
    updatedAt,
  };
}

async function notifyMl(stationId: string) {
  const base = COMMUNITY_CONFIG.mlBaseUrl;
  await fetch(`${base}/retrain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ station_id: stationId }),
  });
}

export function getStationScore(stationId: string): StationCommunityScore | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT station_id, trust_score, review_count, avg_rating, working_rate, ml_score, updated_at
       FROM station_scores WHERE station_id = ?`,
    )
    .get(stationId) as
    | {
        station_id: string;
        trust_score: number;
        review_count: number;
        avg_rating: number;
        working_rate: number;
        ml_score: number | null;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    stationId: row.station_id,
    trustScore: row.trust_score,
    reviewCount: row.review_count,
    avgRating: row.avg_rating,
    workingRate: row.working_rate,
    mlScore: row.ml_score,
    updatedAt: row.updated_at,
  };
}

export function listTopStations(limit = 20): StationCommunityScore[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT station_id, trust_score, review_count, avg_rating, working_rate, ml_score, updated_at
       FROM station_scores
       WHERE review_count > 0
       ORDER BY COALESCE(ml_score, trust_score) DESC, review_count DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    station_id: string;
    trust_score: number;
    review_count: number;
    avg_rating: number;
    working_rate: number;
    ml_score: number | null;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    stationId: row.station_id,
    trustScore: row.trust_score,
    reviewCount: row.review_count,
    avgRating: row.avg_rating,
    workingRate: row.working_rate,
    mlScore: row.ml_score,
    updatedAt: row.updated_at,
  }));
}
