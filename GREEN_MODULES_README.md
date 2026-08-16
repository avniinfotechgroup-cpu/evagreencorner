# Green modules (EVA Green Corner)

Namespaced feature modules sharing `data/community.sqlite` via `getDb()`. Stack: TanStack Start + React + Tailwind v4 + community auth (`requireAdmin` / session token).

| Module | Tables | Public routes | Lib | Admin tab |
|--------|--------|---------------|-----|-----------|
| EV Vehicles | `vehicle_*` | `/ev/*` | `src/lib/vehicles/` | **EV vehicles** |
| Lead Marketplace | `marketplace_*` | `/marketplace/*` | `src/lib/marketplace/` | **Marketplace** |
| Jobs | `jobs_*`, `job_*` | `/jobs/*` | `src/lib/jobs/` | **Jobs** |
| Journal | `journal_*` | `/journal/*` | `src/lib/journal/` | **Journal** |

## Admin (`/admin`)

Tabs: Station list, Add station, Import, Directory, EV vehicles, **Marketplace**, **Jobs**, **Journal**, Cash redeems.

Marketplace / Jobs / Journal dashboards **lazy-load** when their tab is selected (stations / directory / EV still load on admin entry).

| Tab | Server fns used |
|-----|-----------------|
| Marketplace | `adminMarketplaceDashboard`, `adminSetProviderVerification`, `adminUpdateLeadStatus` |
| Jobs | `adminJobsDashboard`, `adminSetJobStatus` |
| Journal | `adminJournalDashboard` (read-only list + stats; upsert via `adminUpsertPost` when needed) |

## Lead Marketplace

- **Public:** `/marketplace`, `/marketplace/category/$slug`, `/marketplace/providers/$slug`
- **Privacy:** Public APIs never expose provider phone/email; contact via Request Quote. Verified badge only when `verification_status === 'verified'`.
- **Matching:** `matchProvidersForLead` — up to 10 verified+active providers by category + city/state/pincode/radius.
- **Seed:** Categories + 3 fictional demo providers (`[DEMO SEED DATA]`) only if empty.

## Jobs

- **Public:** `/jobs`, `/jobs/$slug`
- Admin can set status: `draft` | `published` | `expired` | `archived`.

## Journal

- **Public:** `/journal`, `/journal/$slug`, `/journal/policy/$slug`
- Editorial posts + policy trackers; admin tab shows published/draft counts and post list.

## Route planner

`/route-planner` **starts blank** (no prefilled from/to). Users enter origin and destination themselves; prior session defaults should not auto-fill the form on first paint.
