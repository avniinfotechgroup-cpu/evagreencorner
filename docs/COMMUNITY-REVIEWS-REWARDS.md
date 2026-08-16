# Community reviews, credits & ranking (MVP)

## What users do
1. **Sign up / login** at `/login`
2. Open a station → **Community condition & ranking**
3. Submit **required review**: rating, working status, cleanliness, comment (20+ chars)
4. Optionally upload **condition photos** (JPG/PNG/WEBP)
5. Earn **credits** → at **500 credits** request **₹50** UPI redeem on `/rewards`

## Soft gate (majboori without fake lockout)
- Condition **photos of other users stay locked** until you review that station
- Banner pushes review + credit incentive on every station page

## Ranking
- Heuristic **trust score** (0–100) from reviews
- Optional Python model (`ml/`) writes `ml_score` and keeps retraining on new reviews

## Data
- SQLite: `data/community.sqlite`
- Photos: `public/uploads/reviews/`

## Cash redeem note
Redeem creates a **pending** request for admin UPI payout. Wire RazorpayX / manual ops later. Remind users about applicable tax rules for reward income.
