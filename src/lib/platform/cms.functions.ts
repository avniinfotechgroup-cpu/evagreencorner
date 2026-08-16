import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MANAGED_PAGE_SEO, managedPageByPath } from "@/lib/seo/page-registry";
import { buildPageHead, mergePageSeo } from "@/lib/seo/site";

/**
 * Keep Node/SQLite deps inside handlers so client bundles never import
 * `node:crypto` / `node:sqlite` via this module.
 */

export const getPublicSolarLocations = createServerFn({ method: "GET" }).handler(async () => {
  const { ensurePlatformCms, listSolarLocationsCms } = await import("./cms");
  ensurePlatformCms();
  return { locations: listSolarLocationsCms() };
});

export const getPublicRouteVehicles = createServerFn({ method: "GET" }).handler(async () => {
  const { ensurePlatformCms, listRouteVehiclesCms } = await import("./cms");
  ensurePlatformCms();
  return { vehicles: listRouteVehiclesCms() };
});

/** Public — resolve title/description/keywords/noindex for any path (CMS override + defaults). */
export const getPublicPageSeo = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        path: z.string().min(1).max(160),
        title: z.string().max(160).optional(),
        description: z.string().max(320).optional(),
        keywords: z.string().max(240).optional(),
        noindex: z.boolean().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { ensurePlatformCms, getPageSeo } = await import("./cms");
    ensurePlatformCms();
    const path = data.path.startsWith("/") ? data.path : `/${data.path}`;
    const managed = managedPageByPath(path);
    const row = getPageSeo(path);
    const merged = mergePageSeo(
      path,
      {
        title: data.title || managed?.title || "EVA Green Corner",
        description:
          data.description ||
          managed?.description ||
          "EV charging, green tools and clean living for India.",
        ...(data.keywords || managed?.keywords
          ? { keywords: data.keywords || managed?.keywords || "" }
          : {}),
        ...(data.noindex != null || managed?.noindex
          ? { noindex: data.noindex ?? managed?.noindex }
          : {}),
      },
      row,
    );
    return {
      ...merged,
      head: buildPageHead({
        path: merged.path,
        title: merged.title,
        description: merged.description,
        ...(merged.keywords ? { keywords: merged.keywords } : {}),
        ...(merged.noindex ? { noindex: true } : {}),
      }),
    };
  });

export const adminGetPlatformCms = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const {
      ensurePlatformCms,
      listPageSeo,
      listModuleFlags,
      listSolarLocationsCms,
      listRouteVehiclesCms,
    } = await import("./cms");
    requireAdmin(data.token);
    ensurePlatformCms();
    return {
      pages: listPageSeo(),
      managedPaths: MANAGED_PAGE_SEO.map((p) => ({
        path: p.path,
        group: p.group,
      })),
      modules: listModuleFlags(),
      solar: listSolarLocationsCms(),
      vehicles: listRouteVehiclesCms(),
    };
  });

export const adminUpsertPageSeo = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        path: z.string().min(1).max(160),
        title: z.string().min(3).max(160),
        description: z.string().min(10).max(320),
        keywords: z.string().max(240).optional(),
        noindex: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { upsertPageSeo } = await import("./cms");
    requireAdmin(data.token);
    upsertPageSeo({
      path: data.path,
      title: data.title,
      description: data.description,
      ...(data.keywords !== undefined ? { keywords: data.keywords } : {}),
      ...(data.noindex !== undefined ? { noindex: data.noindex } : {}),
    });
    return { ok: true as const };
  });

export const adminDeletePageSeo = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        path: z.string().min(1).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { deletePageSeo } = await import("./cms");
    requireAdmin(data.token);
    deletePageSeo(data.path);
    return { ok: true as const };
  });

export const adminSetModuleFlag = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        moduleId: z.string().min(2).max(60),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { setModuleEnabled } = await import("./cms");
    requireAdmin(data.token);
    setModuleEnabled(data.moduleId, data.enabled);
    return { ok: true as const };
  });

export const adminUpsertSolarLocation = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        slug: z.string().min(2).max(60),
        name: z.string().min(2).max(80),
        state: z.string().min(2).max(80),
        discom: z.string().min(2).max(120),
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        sunHours: z.coerce.number().min(2).max(9),
        tariff: z.coerce.number().min(1).max(40),
        costPerKw: z.coerce.number().min(20000).max(150000),
        gridCo2: z.coerce.number().min(0.2).max(1.5),
        notes: z.string().max(400).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { upsertSolarLocationCms } = await import("./cms");
    requireAdmin(data.token);
    upsertSolarLocationCms({
      slug: data.slug,
      name: data.name,
      state: data.state,
      discom: data.discom,
      lat: data.lat,
      lng: data.lng,
      sunHours: data.sunHours,
      tariff: data.tariff,
      costPerKw: data.costPerKw,
      gridCo2: data.gridCo2,
      notes: data.notes,
      active: data.active,
    });
    return { ok: true as const };
  });

export const adminUpsertRouteVehicle = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(2).max(60),
        name: z.string().min(2).max(120),
        brand: z.string().max(60).optional(),
        segment: z.string().max(60).optional(),
        batteryKwh: z.coerce.number().min(0.5).max(200),
        rangeKm: z.coerce.number().min(20).max(1200),
        connector: z.string().min(2).max(60),
        batterySwap: z.boolean(),
        active: z.boolean().optional(),
        sortOrder: z.coerce.number().int().min(0).max(999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { upsertRouteVehicleCms } = await import("./cms");
    requireAdmin(data.token);
    upsertRouteVehicleCms({
      id: data.id,
      name: data.name,
      brand: data.brand,
      segment: data.segment,
      batteryKwh: data.batteryKwh,
      rangeKm: data.rangeKm,
      connector: data.connector,
      batterySwap: data.batterySwap,
      active: data.active,
      sortOrder: data.sortOrder,
    });
    return { ok: true as const };
  });

export const getPublicHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  const { getHomeContent } = await import("./home-content");
  return { home: getHomeContent() };
});

export const adminGetHomeContent = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { getHomeContent } = await import("./home-content");
    requireAdmin(data.token);
    return { home: getHomeContent() };
  });

export const adminUpsertHomeContent = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        home: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { upsertHomeContent } = await import("./home-content");
    requireAdmin(data.token);
    const home = upsertHomeContent(data.home as Parameters<typeof upsertHomeContent>[0]);
    return { ok: true as const, home };
  });

export const adminResetHomeContent = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { resetHomeContent } = await import("./home-content");
    requireAdmin(data.token);
    return { ok: true as const, home: resetHomeContent() };
  });

export const getPublicSiteScripts = createServerFn({ method: "GET" }).handler(async () => {
  const { getSiteScripts } = await import("./site-scripts");
  return { scripts: getSiteScripts() };
});

export const adminGetSiteScripts = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { getSiteScripts } = await import("./site-scripts");
    requireAdmin(data.token);
    return { scripts: getSiteScripts() };
  });

export const adminUpsertSiteScripts = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        scripts: z.object({
          gaMeasurementId: z.string().max(40).optional().default(""),
          gtmContainerId: z.string().max(40).optional().default(""),
          customHeadHtml: z.string().max(50_000).optional().default(""),
          customBodyHtml: z.string().max(50_000).optional().default(""),
          customJsonLd: z.string().max(50_000).optional().default(""),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { upsertSiteScripts, validateSiteScriptIds } = await import("./site-scripts");
    requireAdmin(data.token);
    const normalized = {
      gaMeasurementId: data.scripts.gaMeasurementId,
      gtmContainerId: data.scripts.gtmContainerId,
      customHeadHtml: data.scripts.customHeadHtml,
      customBodyHtml: data.scripts.customBodyHtml,
      customJsonLd: data.scripts.customJsonLd,
    };
    const err = validateSiteScriptIds({
      ...normalized,
      updatedAt: "",
    });
    if (err) throw new Error(err);
    const scripts = upsertSiteScripts(normalized);
    return { ok: true as const, scripts };
  });
