# Station trust ranking (Python)

Continuously trains a small model on community reviews in `data/community.sqlite`.

## Setup

```bash
cd ml
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8090
```

## Endpoints

- `GET /health`
- `POST /retrain` — rebuild model + write `ml_score` into `station_scores`

App env: `ML_RANKING_URL=http://127.0.0.1:8090`
