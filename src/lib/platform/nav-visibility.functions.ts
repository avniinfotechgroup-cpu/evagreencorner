import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const menuIdSchema = z.enum(["ev-services", "green-services"]);

/** Public — used by main menu to filter EV / Green dropdowns. */
export const getPublicNavVisibility = createServerFn({ method: "GET" }).handler(async () => {
  const { getNavVisibility } = await import("./nav-visibility");
  return getNavVisibility();
});

export const adminGetNavVisibility = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { listNavVisibilityAdmin } = await import("./nav-visibility");
    requireAdmin(data.token);
    return { menus: listNavVisibilityAdmin() };
  });

export const adminSetNavMenuFlag = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        menuId: menuIdSchema,
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { setNavMenuEnabled } = await import("./nav-visibility");
    requireAdmin(data.token);
    setNavMenuEnabled(data.menuId, data.enabled);
    return { ok: true as const };
  });

export const adminSetNavCategoryFlag = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        menuId: menuIdSchema,
        categoryId: z.string().min(2).max(60),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/community/auth.server");
    const { setNavCategoryEnabled } = await import("./nav-visibility");
    requireAdmin(data.token);
    setNavCategoryEnabled(data.menuId, data.categoryId, data.enabled);
    return { ok: true as const };
  });
