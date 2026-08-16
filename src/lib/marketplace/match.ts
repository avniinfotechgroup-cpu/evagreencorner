import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureMarketplaceSchema } from "./schema";

export type LeadMatchInput = {
  leadId: string;
  categoryId: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

/** Public-safe matched provider — no lead PII, no provider phone/email. */
export type MatchedProviderPublic = {
  id: string;
  businessName: string;
  slug: string;
  city: string;
  state: string;
  website: string;
  yearsExperience: number | null;
  verificationStatus: string;
  matchScore: number;
  matchReason: string;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function norm(s: string | undefined | null) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Match verified+active providers for a lead by category + location.
 * Creates assignment rows. Returns ranked public-safe list (max 10).
 * Never includes lead phone/email or provider private contact fields.
 */
export function matchProvidersForLead(input: LeadMatchInput): MatchedProviderPublic[] {
  ensureMarketplaceSchema();
  const db = getDb();

  type ProvRow = {
    id: string;
    business_name: string;
    slug: string;
    city: string;
    state: string;
    pincode: string;
    website: string;
    latitude: number | null;
    longitude: number | null;
    service_radius_km: number | null;
    years_experience: number | null;
    verification_status: string;
  };

  let providers: ProvRow[];

  if (input.categoryId) {
    // Include services in this category or any child of it / parent share
    providers = db
      .prepare(
        `SELECT DISTINCT p.id, p.business_name, p.slug, p.city, p.state, p.pincode,
                p.website, p.latitude, p.longitude, p.service_radius_km,
                p.years_experience, p.verification_status
         FROM marketplace_providers p
         INNER JOIN marketplace_provider_services s ON s.provider_id = p.id
         WHERE p.status = 'active'
           AND p.verification_status = 'verified'
           AND s.status = 'active'
           AND (
             s.category_id = ?
             OR s.category_id IN (SELECT id FROM marketplace_categories WHERE parent_id = ?)
             OR s.category_id = (SELECT parent_id FROM marketplace_categories WHERE id = ?)
           )`,
      )
      .all(input.categoryId, input.categoryId, input.categoryId) as ProvRow[];
  } else {
    providers = db
      .prepare(
        `SELECT id, business_name, slug, city, state, pincode, website,
                latitude, longitude, service_radius_km, years_experience, verification_status
         FROM marketplace_providers
         WHERE status = 'active' AND verification_status = 'verified'`,
      )
      .all() as ProvRow[];
  }

  const leadCity = norm(input.city);
  const leadState = norm(input.state);
  const leadPin = (input.pincode ?? "").trim();
  const leadLat = input.latitude ?? null;
  const leadLng = input.longitude ?? null;

  type Scored = MatchedProviderPublic & { _score: number };

  const scored: Scored[] = [];

  for (const p of providers) {
    let score = 0;
    let reason = "category";

    const locations = db
      .prepare(
        `SELECT city, state, pincode, latitude, longitude, service_radius_km
         FROM marketplace_provider_locations
         WHERE provider_id = ? AND status = 'active'`,
      )
      .all(p.id) as Array<{
      city: string;
      state: string;
      pincode: string;
      latitude: number | null;
      longitude: number | null;
      service_radius_km: number | null;
    }>;

    const allLocs = [
      {
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        latitude: p.latitude,
        longitude: p.longitude,
        service_radius_km: p.service_radius_km,
      },
      ...locations,
    ];

    let locationHit = false;

    for (const loc of allLocs) {
      if (leadPin && loc.pincode && leadPin === loc.pincode.trim()) {
        score = Math.max(score, 100);
        reason = "pincode";
        locationHit = true;
      } else if (leadCity && norm(loc.city) === leadCity) {
        score = Math.max(score, 80);
        if (reason !== "pincode") reason = "city";
        locationHit = true;
      } else if (leadState && norm(loc.state) === leadState) {
        score = Math.max(score, 50);
        if (reason !== "pincode" && reason !== "city") reason = "state";
        locationHit = true;
      }

      if (
        leadLat != null &&
        leadLng != null &&
        loc.latitude != null &&
        loc.longitude != null &&
        Number.isFinite(loc.latitude) &&
        Number.isFinite(loc.longitude)
      ) {
        const radius = loc.service_radius_km ?? p.service_radius_km ?? 50;
        const dist = haversineKm(leadLat, leadLng, loc.latitude, loc.longitude);
        if (dist <= radius) {
          const radiusScore = Math.max(40, Math.round(70 - dist));
          if (radiusScore > score) {
            score = radiusScore;
            reason = "radius";
          }
          locationHit = true;
        }
      }
    }

    // If lead gave no location, still allow category matches at lower score
    if (!leadCity && !leadState && !leadPin && leadLat == null) {
      locationHit = true;
      score = Math.max(score, 30);
      reason = "category";
    }

    if (!locationHit) continue;

    // Boost experience slightly
    const years = p.years_experience ?? 0;
    score += Math.min(10, years);

    scored.push({
      id: p.id,
      businessName: p.business_name,
      slug: p.slug,
      city: p.city,
      state: p.state,
      website: p.website,
      yearsExperience: p.years_experience,
      verificationStatus: p.verification_status,
      matchScore: score,
      matchReason: reason,
      _score: score,
    });
  }

  scored.sort((a, b) => b._score - a._score);
  const top = scored.slice(0, 10);

  const assignAt = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO marketplace_lead_assignments
      (id, lead_id, provider_id, status, assigned_at, notes)
    VALUES (?, ?, ?, 'assigned', ?, ?)
  `);

  for (const m of top) {
    insert.run(
      `massign-${newId().slice(0, 10)}`,
      input.leadId,
      m.id,
      assignAt,
      `Auto-matched: ${m.matchReason} (score ${m.matchScore})`,
    );
  }

  return top.map(({ _score: _, ...rest }) => rest);
}
