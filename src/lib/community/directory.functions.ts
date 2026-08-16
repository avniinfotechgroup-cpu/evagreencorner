import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./auth.server";
import {
  DIRECTORY_CATEGORIES,
  EV_SERVICE_CATEGORIES,
  categoryLabel,
  countByEvCategory,
  deleteDirectoryProvider,
  deleteDirectoryProvidersBulk,
  insertDirectoryProvider,
  listDirectoryProviders,
  normalizeDirectoryCategory,
  setDirectoryProviderActive,
  updateDirectoryProviderSeo,
} from "./directory-providers";

const providerInput = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(2).max(60),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  area: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  pincode: z.string().max(12).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  website: z.string().max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  verified: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  seoTitle: z.string().max(70).optional(),
  seoKeywords: z.string().max(200).optional(),
  seoDescription: z.string().max(320).optional(),
});

export const adminListDirectory = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    return {
      providers: listDirectoryProviders(500).map((p) => ({
        ...p,
        categoryLabel: categoryLabel(p.category),
      })),
      categories: [
        ...EV_SERVICE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, group: "ev" as const })),
        ...DIRECTORY_CATEGORIES.filter(
          (c) => !EV_SERVICE_CATEGORIES.some((e) => e.id === c || e.legacyIds.includes(c)),
        ).map((c) => ({ id: c, label: categoryLabel(c), group: "other" as const })),
      ],
      evCategories: countByEvCategory(),
    };
  });

export const adminAddDirectoryProvider = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), provider: providerInput }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const id = insertDirectoryProvider({
      name: data.provider.name,
      category: normalizeDirectoryCategory(data.provider.category),
      ...(data.provider.city ? { city: data.provider.city } : {}),
      ...(data.provider.state ? { state: data.provider.state } : {}),
      ...(data.provider.area ? { area: data.provider.area } : {}),
      ...(data.provider.address ? { address: data.provider.address } : {}),
      ...(data.provider.pincode ? { pincode: data.provider.pincode } : {}),
      ...(data.provider.phone ? { phone: data.provider.phone } : {}),
      ...(data.provider.email ? { email: data.provider.email } : {}),
      ...(data.provider.website ? { website: data.provider.website } : {}),
      lat: data.provider.lat ?? null,
      lng: data.provider.lng ?? null,
      verified: data.provider.verified ?? true,
      ...(data.provider.notes ? { notes: data.provider.notes } : {}),
      ...(data.provider.seoTitle ? { seoTitle: data.provider.seoTitle } : {}),
      ...(data.provider.seoKeywords ? { seoKeywords: data.provider.seoKeywords } : {}),
      ...(data.provider.seoDescription
        ? { seoDescription: data.provider.seoDescription }
        : {}),
      active: true,
    });
    return { id };
  });

export const adminToggleDirectoryProvider = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(3),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    setDirectoryProviderActive(data.id, data.active);
    return { ok: true as const };
  });

export const adminDeleteDirectoryProvider = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    deleteDirectoryProvider(data.id);
    return { ok: true as const };
  });

export const adminBulkDeleteDirectoryProviders = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        ids: z.array(z.string().min(3)).min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const deleted = deleteDirectoryProvidersBulk(data.ids);
    return { ok: true as const, deleted };
  });

export const adminUpdateDirectorySeo = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(3),
        seoTitle: z.string().max(70).optional(),
        seoKeywords: z.string().max(200).optional(),
        seoDescription: z.string().max(320).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    updateDirectoryProviderSeo(data.id, {
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: data.seoKeywords } : {}),
      ...(data.seoDescription !== undefined
        ? { seoDescription: data.seoDescription }
        : {}),
    });
    return { ok: true as const };
  });

const importRow = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(1).max(60),
  city: z.string().max(120).optional().default(""),
  state: z.string().max(120).optional().default(""),
  area: z.string().max(120).optional().default(""),
  address: z.string().max(300).optional().default(""),
  pincode: z.string().max(12).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  email: z.string().max(160).optional().default(""),
  website: z.string().max(300).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  seo_title: z.string().max(70).optional().default(""),
  seo_keywords: z.string().max(200).optional().default(""),
  seo_description: z.string().max(320).optional().default(""),
  verified: z.union([z.boolean(), z.string(), z.number()]).optional(),
});

export const adminImportDirectoryExcel = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        rows: z.array(z.record(z.string(), z.unknown())).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i]!;
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        const key = k.trim().toLowerCase().replace(/\s+/g, "_");
        normalized[key] = typeof v === "string" ? v.trim() : v;
      }
      // aliases
      if (!normalized["seo_title"] && normalized["meta_title"]) {
        normalized["seo_title"] = normalized["meta_title"];
      }
      if (!normalized["seo_title"] && normalized["meta_tag"]) {
        normalized["seo_title"] = normalized["meta_tag"];
      }
      if (!normalized["seo_keywords"] && normalized["keywords"]) {
        normalized["seo_keywords"] = normalized["keywords"];
      }
      if (!normalized["seo_keywords"] && normalized["keyword"]) {
        normalized["seo_keywords"] = normalized["keyword"];
      }
      if (!normalized["seo_description"] && normalized["meta_description"]) {
        normalized["seo_description"] = normalized["meta_description"];
      }
      if (!normalized["seo_description"] && normalized["description"]) {
        normalized["seo_description"] = normalized["description"];
      }

      const parsed = importRow.safeParse(normalized);
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
        continue;
      }
      const row = parsed.data;
      const verifiedRaw = row.verified;
      const verified =
        verifiedRaw === true ||
        verifiedRaw === 1 ||
        String(verifiedRaw).toLowerCase() === "true" ||
        String(verifiedRaw) === "1" ||
        String(verifiedRaw).toLowerCase() === "yes";

      try {
        insertDirectoryProvider({
          name: row.name,
          category: row.category,
          city: row.city,
          state: row.state,
          area: row.area,
          address: row.address,
          pincode: row.pincode,
          phone: row.phone,
          email: row.email,
          website: row.website,
          notes: row.notes,
          seoTitle: row.seo_title,
          seoKeywords: row.seo_keywords,
          seoDescription: row.seo_description,
          verified,
          active: true,
        });
        imported += 1;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "insert failed"}`);
      }
    }

    return { imported, errors: errors.slice(0, 20), total: data.rows.length };
  });
