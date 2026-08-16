/** Community reviews + rewards config (MVP). */
export const COMMUNITY_CONFIG = {
  /** Credits for a text review (required fields). */
  creditsReview: 50,
  /** Extra credits when at least 1 condition photo is attached. */
  creditsPhotoBonus: 50,
  /** Credits → cash: 500 credits = ₹50 redeem request. */
  redeemCredits: 500,
  redeemCashInr: 50,
  /** Max photo size (bytes) after base64 decode. */
  maxPhotoBytes: 1_500_000,
  maxPhotosPerReview: 3,
  /** Soft-gate: blur community photos until user reviews this station. */
  gatePhotosUntilReviewed: true,
  /** ML service (optional). */
  mlBaseUrl: process.env["ML_RANKING_URL"] || "http://127.0.0.1:8090",
} as const;
