import { getDb } from "@/lib/community/db";
import { ensureMarketplaceSchema } from "./schema";

type Row = Record<string, unknown>;

function ensure() {
  ensureMarketplaceSchema();
  return getDb();
}

function str(r: Row, key: string, fallback = ""): string {
  const v = r[key];
  if (v == null) return fallback;
  return String(v);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  icon: string;
  image: string;
  status: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  providerCount: number;
  children?: MarketplaceCategory[];
};

export type PublicProviderListItem = {
  id: string;
  businessName: string;
  slug: string;
  providerType: string;
  description: string;
  logo: string;
  website: string;
  city: string;
  state: string;
  yearsExperience: number | null;
  status: string;
  verificationStatus: string;
  isVerified: boolean;
  /** Public never sees phone/email — contact via lead form only */
  contactHint: string;
  avgRating: number | null;
  reviewCount: number;
  serviceNames: string[];
};

export type PublicProviderDetail = PublicProviderListItem & {
  serviceRadiusKm: number | null;
  services: ProviderService[];
  locations: ProviderLocation[];
  reviews: Array<{
    id: string;
    rating: number;
    review: string;
    createdAt: string;
  }>;
};

export type ProviderService = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  serviceName: string;
  description: string;
  pricingType: string;
  startingPrice: number | null;
  priceUnit: string;
  availability: string;
};

export type ProviderLocation = {
  id: string;
  state: string;
  city: string;
  area: string;
  pincode: string;
  serviceRadiusKm: number | null;
};

export type ProviderSearchParams = {
  categorySlug?: string;
  city?: string;
  state?: string;
  verifiedOnly?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

function mapCategory(r: Row, providerCount = 0): MarketplaceCategory {
  return {
    id: str(r, "id"),
    name: str(r, "name"),
    slug: str(r, "slug"),
    parentId: r["parent_id"] ? str(r, "parent_id") : null,
    description: str(r, "description"),
    icon: str(r, "icon"),
    image: str(r, "image"),
    status: str(r, "status"),
    sortOrder: num(r["sort_order"]) ?? 0,
    seoTitle: str(r, "seo_title"),
    seoDescription: str(r, "seo_description"),
    providerCount,
  };
}

function mapPublicProvider(r: Row, serviceNames: string[] = []): PublicProviderListItem {
  const verificationStatus = str(r, "verification_status");
  return {
    id: str(r, "id"),
    businessName: str(r, "business_name"),
    slug: str(r, "slug"),
    providerType: str(r, "provider_type"),
    description: str(r, "description"),
    logo: str(r, "logo"),
    website: str(r, "website"),
    city: str(r, "city"),
    state: str(r, "state"),
    yearsExperience: num(r["years_experience"]),
    status: str(r, "status"),
    verificationStatus,
    isVerified: verificationStatus === "verified",
    contactHint: "Request quote to contact",
    avgRating: num(r["avg_rating"]),
    reviewCount: num(r["review_count"]) ?? 0,
    serviceNames,
  };
}

export function listCategories(opts?: { includeInactive?: boolean }) {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(DISTINCT s.provider_id)
          FROM marketplace_provider_services s
          INNER JOIN marketplace_providers p ON p.id = s.provider_id
          WHERE s.category_id = c.id
            AND s.status = 'active'
            AND p.status = 'active'
            AND p.verification_status = 'verified') AS provider_count
       FROM marketplace_categories c
       WHERE ${opts?.includeInactive ? "1=1" : "c.status = 'active'"}
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all() as Row[];

  const cats = rows.map((r) => mapCategory(r, num(r["provider_count"]) ?? 0));
  const byParent = new Map<string | null, MarketplaceCategory[]>();
  for (const c of cats) {
    const key = c.parentId;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const roots = byParent.get(null) ?? [];
  for (const root of roots) {
    root.children = byParent.get(root.id) ?? [];
  }
  return roots;
}

export function getCategoryBySlug(slug: string) {
  const db = ensure();
  const row = db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(DISTINCT s.provider_id)
          FROM marketplace_provider_services s
          INNER JOIN marketplace_providers p ON p.id = s.provider_id
          WHERE (s.category_id = c.id OR s.category_id IN (
                   SELECT id FROM marketplace_categories WHERE parent_id = c.id
                 ))
            AND s.status = 'active'
            AND p.status = 'active'
            AND p.verification_status = 'verified') AS provider_count
       FROM marketplace_categories c
       WHERE c.slug = ? AND c.status = 'active'`,
    )
    .get(slug) as Row | undefined;
  if (!row) return null;

  const cat = mapCategory(row, num(row["provider_count"]) ?? 0);
  const children = db
    .prepare(
      `SELECT * FROM marketplace_categories
       WHERE parent_id = ? AND status = 'active'
       ORDER BY sort_order ASC, name ASC`,
    )
    .all(cat.id) as Row[];
  cat.children = children.map((r) => mapCategory(r));
  return cat;
}

function providerServiceNames(providerId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT service_name FROM marketplace_provider_services
       WHERE provider_id = ? AND status = 'active'
       ORDER BY service_name ASC LIMIT 6`,
    )
    .all(providerId) as Array<{ service_name: string }>;
  return rows.map((r) => r.service_name);
}

const PROVIDER_SELECT = `
  SELECT p.*,
    (SELECT AVG(rating) FROM marketplace_reviews r
     WHERE r.provider_id = p.id AND r.status = 'published') AS avg_rating,
    (SELECT COUNT(*) FROM marketplace_reviews r
     WHERE r.provider_id = p.id AND r.status = 'published') AS review_count
  FROM marketplace_providers p
`;

export function listVerifiedProviders(limit = 12): PublicProviderListItem[] {
  const db = ensure();
  const rows = db
    .prepare(
      `${PROVIDER_SELECT}
       WHERE p.status = 'active' AND p.verification_status = 'verified'
       ORDER BY p.years_experience DESC, p.business_name ASC
       LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map((r) => mapPublicProvider(r, providerServiceNames(str(r, "id"))));
}

export function getProviderBySlug(slug: string): PublicProviderDetail | null {
  const db = ensure();
  const row = db
    .prepare(
      `${PROVIDER_SELECT}
       WHERE p.slug = ? AND p.status = 'active'`,
    )
    .get(slug) as Row | undefined;
  if (!row) return null;

  // Only verified providers are publicly listable with full profile
  if (str(row, "verification_status") !== "verified") return null;

  const base = mapPublicProvider(row, providerServiceNames(str(row, "id")));
  const services = listProviderServices(base.id);
  const locations = listProviderLocations(base.id);
  const reviews = db
    .prepare(
      `SELECT id, rating, review, created_at FROM marketplace_reviews
       WHERE provider_id = ? AND status = 'published'
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(base.id) as Row[];

  return {
    ...base,
    serviceRadiusKm: num(row["service_radius_km"]),
    services,
    locations,
    reviews: reviews.map((r) => ({
      id: str(r, "id"),
      rating: num(r["rating"]) ?? 0,
      review: str(r, "review"),
      createdAt: str(r, "created_at"),
    })),
  };
}

export function searchProviders(params: ProviderSearchParams) {
  const db = ensure();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(48, Math.max(1, params.limit ?? 12));
  const offset = (page - 1) * limit;

  const where: string[] = [`p.status = 'active'`];
  const args: Array<string | number> = [];

  if (params.verifiedOnly !== false) {
    where.push(`p.verification_status = 'verified'`);
  }

  if (params.q?.trim()) {
    where.push(
      `(p.business_name LIKE ? OR p.description LIKE ? OR p.city LIKE ? OR p.state LIKE ?)`,
    );
    const q = `%${params.q.trim()}%`;
    args.push(q, q, q, q);
  }

  if (params.city?.trim()) {
    where.push(
      `(LOWER(p.city) = LOWER(?) OR EXISTS (
         SELECT 1 FROM marketplace_provider_locations l
         WHERE l.provider_id = p.id AND l.status = 'active' AND LOWER(l.city) = LOWER(?)
       ))`,
    );
    args.push(params.city.trim(), params.city.trim());
  }

  if (params.state?.trim()) {
    where.push(
      `(LOWER(p.state) = LOWER(?) OR EXISTS (
         SELECT 1 FROM marketplace_provider_locations l
         WHERE l.provider_id = p.id AND l.status = 'active' AND LOWER(l.state) = LOWER(?)
       ))`,
    );
    args.push(params.state.trim(), params.state.trim());
  }

  if (params.categorySlug?.trim()) {
    where.push(
      `EXISTS (
         SELECT 1 FROM marketplace_provider_services s
         INNER JOIN marketplace_categories c ON c.id = s.category_id
         WHERE s.provider_id = p.id AND s.status = 'active'
           AND (
             c.slug = ?
             OR c.parent_id = (SELECT id FROM marketplace_categories WHERE slug = ?)
           )
       )`,
    );
    args.push(params.categorySlug.trim(), params.categorySlug.trim());
  }

  const whereSql = where.join(" AND ");

  const total = (
    db
      .prepare(`SELECT COUNT(*) as c FROM marketplace_providers p WHERE ${whereSql}`)
      .get(...args) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `${PROVIDER_SELECT}
       WHERE ${whereSql}
       ORDER BY p.verification_status = 'verified' DESC, p.years_experience DESC, p.business_name ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as Row[];

  return {
    items: rows.map((r) => mapPublicProvider(r, providerServiceNames(str(r, "id")))),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function listProviderServices(providerId: string): ProviderService[] {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT s.*, c.name AS category_name, c.slug AS category_slug
       FROM marketplace_provider_services s
       INNER JOIN marketplace_categories c ON c.id = s.category_id
       WHERE s.provider_id = ? AND s.status = 'active'
       ORDER BY s.service_name ASC`,
    )
    .all(providerId) as Row[];
  return rows.map((r) => ({
    id: str(r, "id"),
    categoryId: str(r, "category_id"),
    categoryName: str(r, "category_name"),
    categorySlug: str(r, "category_slug"),
    serviceName: str(r, "service_name"),
    description: str(r, "description"),
    pricingType: str(r, "pricing_type"),
    startingPrice: num(r["starting_price"]),
    priceUnit: str(r, "price_unit"),
    availability: str(r, "availability"),
  }));
}

export function listProviderLocations(providerId: string): ProviderLocation[] {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT * FROM marketplace_provider_locations
       WHERE provider_id = ? AND status = 'active'
       ORDER BY city ASC`,
    )
    .all(providerId) as Row[];
  return rows.map((r) => ({
    id: str(r, "id"),
    state: str(r, "state"),
    city: str(r, "city"),
    area: str(r, "area"),
    pincode: str(r, "pincode"),
    serviceRadiusKm: num(r["service_radius_km"]),
  }));
}

export function getMarketplaceStats() {
  const db = ensure();
  const providers = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM marketplace_providers
         WHERE status = 'active' AND verification_status = 'verified'`,
      )
      .get() as { c: number }
  ).c;
  const categories = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM marketplace_categories
         WHERE status = 'active' AND parent_id IS NULL`,
      )
      .get() as { c: number }
  ).c;
  const leads = (
    db.prepare(`SELECT COUNT(*) as c FROM marketplace_leads`).get() as { c: number }
  ).c;
  return { providers, categories, leads };
}
