# Free EV data sources (MVP)

This app is designed as a **free-tier** EV finder. We only use data sources whose terms allow reuse.

## Active free sources

| Source | Cost | Key needed | What you get |
|--------|------|------------|--------------|
| **OpenStreetMap Overpass** | Free | No | Station locations, some connectors/power/hours/battery-swap |
| **Open Charge Map** | Free | Yes (free signup) | Much denser India coverage, connectors, kW, operators |
| **Nominatim / BigDataCloud** | Free | No | Address from coordinates |

## Not used (on purpose)

| Source | Why not |
|--------|---------|
| Google Maps Places / scraping | Against ToS; not a free redistributable EV dataset |
| Paid CPO APIs | Later phase when keys/partnerships exist |

## Setup Open Charge Map (recommended)

1. Open https://openchargemap.org/site/develop/api  
2. Sign in → **My Profile** → **My Apps** → **Register An Application**  
3. Copy the API key into `.env`:

```env
OPEN_CHARGE_MAP_API_KEY=your_key_here
```

4. Restart `npm run dev`

**You do not need this key to run the app.**  
Without it, OpenStreetMap free mode still works (often 50–150 stations in large cities at 10 km).

If the OCM website will not let you create a key (login/email issues), skip it for now — continue with OSM.

## Honest UI rules

- Show only fields the source actually provides  
- Never invent live availability, ratings, or prices  
- Label missing fields as **Not available**
