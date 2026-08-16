"""
EV Green Map — station trust ranking API.
Run: uvicorn app:app --reload --port 8090
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from train import train_and_score

app = FastAPI(title="EVA Green Corner Station Ranking ML", version="0.1.0")


class RetrainBody(BaseModel):
    station_id: str | None = None


@app.get("/health")
def health():
    return {"ok": True, "service": "station-trust-ml"}


@app.post("/retrain")
def retrain(body: RetrainBody | None = None):
    result = train_and_score()
    if body and body.station_id:
        result["triggered_by"] = body.station_id
    return result


@app.get("/retrain")
def retrain_get():
    return train_and_score()
