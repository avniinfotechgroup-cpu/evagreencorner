import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProviderSearchParams } from "./queries";

/** Public marketplace APIs — privacy: never return lead/provider phone/email. */

export const getMarketplaceHome = createServerFn({ method: "GET" }).handler(async () => {
  const { listCategories, listVerifiedProviders, getMarketplaceStats } =
    await import("./queries");
  const categories = listCategories();
  const providers = listVerifiedProviders(9);
  const stats = getMarketplaceStats();
  return {
    categories,
    popularCategories: categories.slice(0, 8),
    providers,
    stats,
  };
});

export const searchMarketplaceProviders = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        categorySlug: z.string().max(80).optional(),
        city: z.string().max(80).optional(),
        state: z.string().max(80).optional(),
        verifiedOnly: z.boolean().optional(),
        q: z.string().max(120).optional().default(""),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { searchProviders } = await import("./queries");
    const params: ProviderSearchParams = {
      verifiedOnly: data.verifiedOnly !== false,
      page: data.page ?? 1,
      limit: data.limit ?? 12,
    };
    if (data.q) params.q = data.q;
    if (data.categorySlug) params.categorySlug = data.categorySlug;
    if (data.city) params.city = data.city;
    if (data.state) params.state = data.state;
    return searchProviders(params);
  });

export const getMarketplaceProvider = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getProviderBySlug, listCategories } = await import("./queries");
    const provider = getProviderBySlug(data.slug);
    return {
      provider,
      categories: listCategories(),
    };
  });

export const getMarketplaceCategory = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        slug: z.string().min(1).max(80),
        city: z.string().max(80).optional(),
        page: z.coerce.number().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getCategoryBySlug, searchProviders } = await import("./queries");
    const category = getCategoryBySlug(data.slug);
    if (!category) return { category: null, result: null };
    const params: ProviderSearchParams = {
      categorySlug: data.slug,
      verifiedOnly: true,
      page: data.page ?? 1,
      limit: 12,
    };
    if (data.city) params.city = data.city;
    const result = searchProviders(params);
    return { category, result };
  });

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.union([z.literal(""), z.string().email().max(160)]).optional().default(""),
  phone: z
    .string()
    .min(10)
    .max(20)
    .regex(/^[+\d\s()-]+$/, "Invalid phone"),
  description: z.string().max(2000).optional().default(""),
  categoryId: z.string().min(1).max(40).optional(),
  categorySlug: z.string().max(80).optional(),
  serviceId: z.string().max(40).optional(),
  providerSlug: z.string().max(120).optional(),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  pincode: z.string().max(12).optional().default(""),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  budget: z.string().max(80).optional().default(""),
  preferredDate: z.string().max(40).optional().nullable(),
  source: z.string().max(40).optional().default("web"),
  token: z.string().optional(),
});

export const submitMarketplaceLead = createServerFn({ method: "POST" })
  .validator((input) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/community/db");
    const { newId } = await import("@/lib/community/crypto");
    const { ensureMarketplaceSchema } = await import("./schema");
    const { matchProvidersForLead } = await import("./match");

    ensureMarketplaceSchema();
    const db = getDb();

    let userId: string | null = null;
    if (data.token) {
      const { resolveUserByToken } = await import("@/lib/community/auth.server");
      const user = resolveUserByToken(data.token);
      userId = user?.id ?? null;
    }

    let categoryId = data.categoryId ?? null;
    if (!categoryId && data.categorySlug) {
      const cat = db
        .prepare(`SELECT id FROM marketplace_categories WHERE slug = ?`)
        .get(data.categorySlug) as { id: string } | undefined;
      categoryId = cat?.id ?? null;
    }

    // Prefer provider's primary service category when quoting a specific provider
    let targetProviderId: string | null = null;
    if (data.providerSlug) {
      const prov = db
        .prepare(
          `SELECT id FROM marketplace_providers
           WHERE slug = ? AND status = 'active' AND verification_status = 'verified'`,
        )
        .get(data.providerSlug) as { id: string } | undefined;
      targetProviderId = prov?.id ?? null;
      if (targetProviderId && !categoryId) {
        const svc = db
          .prepare(
            `SELECT category_id FROM marketplace_provider_services
             WHERE provider_id = ? AND status = 'active' LIMIT 1`,
          )
          .get(targetProviderId) as { category_id: string } | undefined;
        categoryId = svc?.category_id ?? null;
      }
    }

    const ts = new Date().toISOString();
    const day = ts.slice(0, 10).replace(/-/g, "");
    const leadId = `mlead-${newId().slice(0, 12)}`;
    const leadNumber = `LM-${day}-${newId().slice(0, 6).toUpperCase()}`;

    db.prepare(
      `INSERT INTO marketplace_leads
        (id, lead_number, user_id, category_id, service_id, name, email, phone,
         description, city, state, pincode, latitude, longitude, budget,
         preferred_date, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
    ).run(
      leadId,
      leadNumber,
      userId,
      categoryId,
      data.serviceId ?? null,
      data.name.trim(),
      (data.email ?? "").trim(),
      data.phone.trim(),
      (data.description ?? "").trim(),
      (data.city ?? "").trim(),
      (data.state ?? "").trim(),
      (data.pincode ?? "").trim(),
      data.latitude ?? null,
      data.longitude ?? null,
      (data.budget ?? "").trim(),
      data.preferredDate ?? null,
      data.source ?? "web",
      ts,
      ts,
    );

    // Direct assignment when quoting a specific provider
    if (targetProviderId) {
      db.prepare(
        `INSERT OR IGNORE INTO marketplace_lead_assignments
          (id, lead_id, provider_id, status, assigned_at, notes)
         VALUES (?, ?, ?, 'assigned', ?, 'Requested quote for this provider')`,
      ).run(`massign-${newId().slice(0, 10)}`, leadId, targetProviderId, ts);
    }

    const matchInput: import("./match").LeadMatchInput = {
      leadId,
      categoryId,
    };
    if (data.city) matchInput.city = data.city;
    if (data.state) matchInput.state = data.state;
    if (data.pincode) matchInput.pincode = data.pincode;
    if (data.latitude != null) matchInput.latitude = data.latitude;
    if (data.longitude != null) matchInput.longitude = data.longitude;
    const matched = matchProvidersForLead(matchInput);

    const assignCount = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM marketplace_lead_assignments WHERE lead_id = ?`,
        )
        .get(leadId) as { c: number }
    ).c;

    // Public response: lead number + count only — no other providers' private data,
    // no lead phone/email echoed beyond confirmation fields the user already typed.
    return {
      ok: true as const,
      leadNumber,
      matchedCount: assignCount,
      matchedProviders: matched.map((m) => ({
        businessName: m.businessName,
        slug: m.slug,
        city: m.city,
        state: m.state,
        isVerified: m.verificationStatus === "verified",
      })),
    };
  });

const registerSchema = z.object({
  token: z.string().min(1),
  businessName: z.string().min(2).max(160),
  providerType: z.enum(["company", "individual", "freelancer"]).optional().default("company"),
  description: z.string().max(4000).optional().default(""),
  website: z.string().max(200).optional().default(""),
  email: z.string().email().max(160),
  phone: z.string().min(10).max(20),
  alternatePhone: z.string().max(20).optional().default(""),
  gstNumber: z.string().max(40).optional().default(""),
  registrationNumber: z.string().max(80).optional().default(""),
  address: z.string().max(400).optional().default(""),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().max(12).optional().default(""),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  serviceRadiusKm: z.number().optional().nullable(),
  yearsExperience: z.number().int().min(0).max(80).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).max(12).optional().default([]),
});

export const registerMarketplaceProvider = createServerFn({ method: "POST" })
  .validator((input) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const { resolveUserByToken } = await import("@/lib/community/auth.server");
    const user = resolveUserByToken(data.token);
    if (!user) throw new Error("Login required to register as a provider.");

    const { getDb } = await import("@/lib/community/db");
    const { newId } = await import("@/lib/community/crypto");
    const { ensureMarketplaceSchema, slugifyMarketplace } = await import("./schema");

    ensureMarketplaceSchema();
    const db = getDb();
    const ts = new Date().toISOString();

    let slug = slugifyMarketplace(data.businessName);
    if (!slug) slug = `provider-${newId().slice(0, 6)}`;
    const clash = db
      .prepare(`SELECT id FROM marketplace_providers WHERE slug = ?`)
      .get(slug);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

    const id = `mprov-${newId().slice(0, 12)}`;
    db.prepare(
      `INSERT INTO marketplace_providers
        (id, user_id, business_name, slug, provider_type, description, logo, website,
         email, phone, alternate_phone, gst_number, registration_number, address,
         city, state, pincode, latitude, longitude, service_radius_km, years_experience,
         status, verification_status, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               'pending', 'pending', NULL, ?, ?)`,
    ).run(
      id,
      user.id,
      data.businessName.trim(),
      slug,
      data.providerType,
      (data.description ?? "").trim(),
      (data.website ?? "").trim(),
      data.email.trim().toLowerCase(),
      data.phone.trim(),
      (data.alternatePhone ?? "").trim(),
      (data.gstNumber ?? "").trim(),
      (data.registrationNumber ?? "").trim(),
      (data.address ?? "").trim(),
      data.city.trim(),
      data.state.trim(),
      (data.pincode ?? "").trim(),
      data.latitude ?? null,
      data.longitude ?? null,
      data.serviceRadiusKm ?? null,
      data.yearsExperience ?? null,
      ts,
      ts,
    );

    if (data.pincode || data.city) {
      db.prepare(
        `INSERT INTO marketplace_provider_locations
          (id, provider_id, state, city, area, pincode, latitude, longitude, service_radius_km, status)
         VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, 'active')`,
      ).run(
        `mloc-${newId().slice(0, 10)}`,
        id,
        data.state.trim(),
        data.city.trim(),
        (data.pincode ?? "").trim(),
        data.latitude ?? null,
        data.longitude ?? null,
        data.serviceRadiusKm ?? null,
      );
    }

    for (const catId of data.categoryIds ?? []) {
      const exists = db
        .prepare(`SELECT id FROM marketplace_categories WHERE id = ?`)
        .get(catId);
      if (!exists) continue;
      db.prepare(
        `INSERT INTO marketplace_provider_services
          (id, provider_id, category_id, service_name, description, pricing_type,
           starting_price, price_unit, availability, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', 'quote', NULL, '', 'available', 'active', ?, ?)`,
      ).run(
        `msvc-${newId().slice(0, 10)}`,
        id,
        catId,
        "General service",
        ts,
        ts,
      );
    }

    return {
      ok: true as const,
      providerId: id,
      slug,
      status: "pending" as const,
      message: "Registration submitted. An admin will review verification shortly.",
    };
  });
