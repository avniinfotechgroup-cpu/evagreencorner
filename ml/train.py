"""
Train / refresh EV station trust ranking model from community.sqlite reviews.
Keeps learning as new reviews arrive (called via /retrain).
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "community.sqlite"
MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_PATH = MODEL_DIR / "station_trust.joblib"
META_PATH = MODEL_DIR / "meta.json"


def working_to_num(v: str) -> float:
    if v == "yes":
        return 1.0
    if v == "partial":
        return 0.5
    return 0.0


def load_station_features(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT
          r.station_id,
          AVG(r.rating) AS avg_rating,
          AVG(CASE r.working WHEN 'yes' THEN 1.0 WHEN 'partial' THEN 0.5 ELSE 0.0 END) AS working_rate,
          AVG(r.cleanliness) AS cleanliness,
          AVG(COALESCE(r.wait_minutes, 15)) AS wait_minutes,
          AVG(r.connectors_ok) AS connectors_ok,
          COUNT(*) AS review_count,
          AVG((SELECT COUNT(*) FROM review_photos p WHERE p.review_id = r.id)) AS photos_per_review
        FROM reviews r
        GROUP BY r.station_id
        """
    ).fetchall()

    features = []
    for row in rows:
        (
            station_id,
            avg_rating,
            working_rate,
            cleanliness,
            wait_minutes,
            connectors_ok,
            review_count,
            photos_per_review,
        ) = row
        # Target label: heuristic trust (same family as TS ranking) so model can generalize.
        y = (
            (float(avg_rating) / 5.0) * 40
            + float(working_rate) * 30
            + (float(cleanliness) / 5.0) * 15
            + min(float(photos_per_review), 1.0) * 10
            + min(float(review_count) / 20.0, 1.0) * 5
        )
        features.append(
            {
                "station_id": station_id,
                "x": [
                    float(avg_rating),
                    float(working_rate),
                    float(cleanliness),
                    float(wait_minutes),
                    float(connectors_ok),
                    float(review_count),
                    float(photos_per_review or 0),
                ],
                "y": float(y),
            }
        )
    return features


def train_and_score() -> dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        return {"ok": False, "error": f"DB not found: {DB_PATH}", "stations": 0}

    conn = sqlite3.connect(DB_PATH)
    try:
        feats = load_station_features(conn)
        if len(feats) < 3:
            # Not enough data — write heuristic scores only.
            for f in feats:
                score = round(max(0, min(100, f["y"])), 2)
                conn.execute(
                    """
                    INSERT INTO station_scores
                      (station_id, trust_score, review_count, avg_rating, working_rate, ml_score, updated_at)
                    VALUES (?, ?, 0, 0, 0, ?, datetime('now'))
                    ON CONFLICT(station_id) DO UPDATE SET
                      ml_score = excluded.ml_score,
                      updated_at = excluded.updated_at
                    """,
                    (f["station_id"], score, score),
                )
            conn.commit()
            META_PATH.write_text(
                json.dumps({"mode": "heuristic", "stations": len(feats)}, indent=2),
                encoding="utf-8",
            )
            return {"ok": True, "mode": "heuristic", "stations": len(feats)}

        X = np.array([f["x"] for f in feats], dtype=float)
        y = np.array([f["y"] for f in feats], dtype=float)

        model = Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "gbr",
                    GradientBoostingRegressor(
                        random_state=42,
                        n_estimators=120,
                        max_depth=3,
                        learning_rate=0.08,
                    ),
                ),
            ]
        )
        model.fit(X, y)
        joblib.dump(model, MODEL_PATH)

        preds = model.predict(X)
        for f, pred in zip(feats, preds):
            score = float(max(0, min(100, pred)))
            conn.execute(
                """
                UPDATE station_scores
                SET ml_score = ?, updated_at = datetime('now')
                WHERE station_id = ?
                """,
                (score, f["station_id"]),
            )
            # Insert if missing
            conn.execute(
                """
                INSERT INTO station_scores
                  (station_id, trust_score, review_count, avg_rating, working_rate, ml_score, updated_at)
                SELECT ?, ?, 0, 0, 0, ?, datetime('now')
                WHERE NOT EXISTS (SELECT 1 FROM station_scores WHERE station_id = ?)
                """,
                (f["station_id"], score, score, f["station_id"]),
            )
        conn.commit()

        META_PATH.write_text(
            json.dumps(
                {
                    "mode": "gradient_boosting",
                    "stations": len(feats),
                    "train_mae": float(np.mean(np.abs(preds - y))),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return {
            "ok": True,
            "mode": "gradient_boosting",
            "stations": len(feats),
            "train_mae": float(np.mean(np.abs(preds - y))),
        }
    finally:
        conn.close()


if __name__ == "__main__":
    print(json.dumps(train_and_score(), indent=2))
