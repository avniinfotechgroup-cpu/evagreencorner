# Indian EV Vehicles Module

Production-oriented EV catalogue integrated into **EVA Green Corner** (TanStack Start + SQLite). Public pages read from our database; third-party APIs are reserved for future sync.

## Current stack (host site)

| Layer | Choice |
|--------|--------|
| Frontend | React + TanStack Router / Start + Vite + TypeScript |
| Backend | TanStack `createServerFn` (server functions) |
| Database | SQLite (`data/community.sqlite`) via `node:sqlite` |
| CSS / UI | Tailwind v4 + existing canopy / card / button patterns |
| Routing | File routes under `src/routes/` |
| Auth | Community sessions; admin via `requireAdmin` |
| Admin | `/admin` (new **EV vehicles** tab) |
| SEO | Per-route `head()` meta + JSON-LD on detail |
| Images | Admin uploads planned; seed uses placeholders |
| Caching | DB-backed pages (no external API on page render) |

## Integration plan

1. Namespaced tables + `src/lib/vehicles/*` (does not alter charger tables).
2. Public routes under `/ev/*` using `SiteHeader`, `SiteFooter`, `BannerMenu`.
3. Menu item **EVs** in `HeroMainMenu` + module registry entry.
4. Admin CRUD on existing `/admin` panel.
5. Later phases: provider abstraction, sync cron, compare page, CSV import, full sitemap.

## Public routes

| Path | Purpose |
|------|---------|
| `/ev/` | Landing — categories, featured vehicles, brands |
| `/ev/$categorySlug` | Listing + server-side filters (`brand`, `q`, `sort`, `min_range`, `max_price`, `status`) |
| `/ev/$categorySlug/$brandSlug/$vehicleSlug` | Detail — specs, FAQ schema, similar vehicles |

Example: `/ev/electric-suvs/tata/tata-nexon-ev`

## Admin

`/admin` → **EV vehicles**

- Dashboard counts
- Add vehicle (validated price source, battery/range > 0)
- Publish / unpublish
- Soft delete (`deleted_at`)
- Add brand
- Link to public `/ev`

## Environment variables (future sync)

```env
EV_API_URL=
EV_API_KEY=
VEHICLE_API_URL=
VEHICLE_API_KEY=
EV_SYNC_ENABLED=false
EV_SYNC_INTERVAL=daily
EV_CACHE_TTL=3600
EV_IMAGE_MAX_SIZE=5242880
EV_IMAGE_STORAGE=public/uploads/vehicles
```

Never commit secrets. Keys must stay server-side only.

## Data rules

- Store units as: kWh, kW, Nm, km, km/h, kg, mm, INR.
- Never show null / 0 / N/A as real specs.
- Always pair claimed range with test cycle when known.
- Prefer **Last verified** over “last viewed”.
- Seed vehicles are bootstrap reference data — re-verify in Admin before treating as current production truth.
- Soft delete only; restore can be added later.

## Server functions

Public (`src/lib/vehicles/public.functions.ts`):

- `getEvHome`
- `getEvCategoryPage`
- `getEvVehiclePage`
- `searchEvVehicles`

Admin (`src/lib/vehicles/admin.functions.ts`):

- `adminEvDashboard`
- `adminAddVehicle`
- `adminToggleVehiclePublish`
- `adminSoftDeleteVehicle`
- `adminAddBrand`

## Schema

Tables (created by `ensureVehiclesSchema()`):

`vehicle_categories`, `vehicle_brands`, `vehicles`, `battery_specifications`, `vehicle_performance`, `vehicle_range`, `charging_specifications`, `vehicle_dimensions`, `vehicle_prices`, `vehicle_variants`, `vehicle_features`, `vehicle_safety`, `vehicle_warranty`, `vehicle_images`, `vehicle_faqs`, `vehicle_change_logs`, `vehicle_data_sources`

## Deployment

1. Deploy app as usual (existing site).
2. On first server request that touches EV code, schema + seed categories/brands (and sample vehicles if empty) run automatically.
3. Verify `/ev`, category pages, one detail page, and Admin → EV vehicles.
4. Re-verify or unpublish seed vehicles if you do not want sample specs live.
5. Rollback: remove EV routes/menu entry and drop `vehicle_*` tables if needed (backup DB first). Existing charger/community features are untouched.

## Phase 2 features (compare / sync / CSV / images / sitemap / completeness)

| Feature | Path / entry |
|---------|----------------|
| Compare | `/ev/compare?v=slug1,slug2` (noindex) |
| Providers | `src/lib/vehicles/providers/` — Manual, OEM HTTP, Vehicle API |
| Sync | Admin **Run API sync** → pending queue (never auto-publishes) |
| Stale flags | Admin badges + `getStaleFlags()` (price 30d / specs 90d) |
| Cron | Admin **Run maintenance jobs** or `node --import tsx scripts/ev-cron.mjs` |
| CSV | Admin CSV preview → import to pending |
| Images | Admin upload → `/uploads/vehicles/` (MIME + magic bytes + ALT) |
| Sitemap | `/sitemap-ev.xml` + `public/sitemap-ev.xml` on refresh |
| Completeness | Admin vehicle table `%` + confidence (admin only) |

## Remaining polish

- Approve-pending → apply field merge UI
- Full-text search
- Bulk publish actions
- Variant/price history screens
- Automatic WebP conversion / thumbnails

## Testing checklist (foundation)

- [ ] Existing home / chargers / directory still load
- [ ] `/ev` landing loads with categories
- [ ] Category filter + empty state
- [ ] Detail page SEO title + FAQ schema when FAQs exist
- [ ] Admin add vehicle / publish / soft delete
- [ ] Menu **EVs** active state on `/ev/*`
