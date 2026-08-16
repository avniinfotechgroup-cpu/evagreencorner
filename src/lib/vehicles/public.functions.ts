import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VehicleSearchParams } from "./queries";

/** Public EV catalogue APIs — no auth imports (safe for client pages). */

export const getEvHome = createServerFn({ method: "GET" }).handler(async () => {
  const {
    listCategories,
    listBrands,
    searchVehicles,
    getEvDashboardStats,
  } = await import("./queries");

  const categories = listCategories();
  const brands = listBrands();
  const featured = searchVehicles({ featuredOnly: true, sort: "popular", limit: 8 });
  const popular = searchVehicles({ sort: "popular", limit: 8 });
  const latest = searchVehicles({ sort: "latest", limit: 6 });
  const stats = getEvDashboardStats();

  return {
    categories: categories.filter((c) => !c.parentId || c.vehicleCount > 0),
    topCategories: categories.filter((c) => !c.parentId),
    brands: brands.filter((b) => b.vehicleCount > 0),
    featured: featured.items,
    popular: popular.items,
    latest: latest.items,
    stats: {
      vehicles: stats.publishedVehicles,
      brands: stats.brands,
      categories: stats.categories,
    },
  };
});

export const getEvCategoryPage = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        categorySlug: z.string().min(1).max(80),
        brand: z.string().max(80).optional(),
        q: z.string().max(120).optional(),
        sort: z
          .enum(["latest", "popular", "price-low", "price-high", "range-high"])
          .optional(),
        minRange: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
        status: z.string().max(40).optional(),
        page: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { getCategoryBySlug, listBrands, searchVehicles } = await import("./queries");
    const category = getCategoryBySlug(data.categorySlug);
    if (!category) return { category: null, brands: [], result: null };

    const params: VehicleSearchParams = {
      categorySlug: data.categorySlug,
      sort: data.sort ?? "popular",
      page: data.page ?? 1,
      limit: 24,
    };
    if (data.brand) params.brandSlug = data.brand;
    if (data.q) params.q = data.q;
    if (data.minRange != null) params.minRange = data.minRange;
    if (data.maxPrice != null) params.maxPrice = data.maxPrice;
    if (data.status) params.status = data.status;

    return {
      category,
      brands: listBrands(),
      result: searchVehicles(params),
    };
  });

export const getEvVehiclePage = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        vehicleSlug: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getVehicleBySlug, getSimilarVehicles } = await import("./queries");
    const vehicle = getVehicleBySlug(data.vehicleSlug);
    if (!vehicle) return { vehicle: null, similar: [] };
    return {
      vehicle,
      similar: getSimilarVehicles(vehicle.id, 4),
    };
  });

export const searchEvVehicles = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        categorySlug: z.string().max(80).optional(),
        brandSlug: z.string().max(80).optional(),
        sort: z
          .enum(["latest", "popular", "price-low", "price-high", "range-high"])
          .optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { searchVehicles } = await import("./queries");
    const params: VehicleSearchParams = {
      q: data.q,
      sort: data.sort ?? "popular",
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    };
    if (data.categorySlug) params.categorySlug = data.categorySlug;
    if (data.brandSlug) params.brandSlug = data.brandSlug;
    return searchVehicles(params);
  });

export const getEvCompare = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        /** Comma-separated vehicle slugs, max 4 */
        v: z.string().max(400).optional().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { getVehiclesForCompare, listVehiclesForPicker } = await import("./queries");
    const slugs = data.v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const compared = getVehiclesForCompare(slugs);
    return {
      ...compared,
      picker: listVehiclesForPicker(60),
    };
  });

export const getEvSitemapXml = createServerFn({ method: "GET" }).handler(async () => {
  const { buildEvSitemapXml } = await import("./sitemap");
  return { xml: buildEvSitemapXml() };
});
