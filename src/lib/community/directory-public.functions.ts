import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Keep in sync with EV_SERVICE_CATEGORIES in directory-providers.ts */
const CATEGORIES = [
  { id: "ev_repair", label: "EV Repair" },
  { id: "ev_store", label: "EV Store" },
  { id: "ev_battery", label: "EV Battery" },
  { id: "ev_conversion", label: "EV Conversion" },
  { id: "charging_installation", label: "Charging Installation" },
  { id: "solar_installer", label: "Solar installer" },
  { id: "recycler", label: "Recycler" },
  { id: "home_energy", label: "Home energy" },
  { id: "other", label: "Other" },
] as const;

/** Public directory search — no admin/auth imports (safe for page load). */
export const searchDirectory = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        category: z.string().max(40).optional().default("all"),
        city: z.string().max(120).optional().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { searchDirectoryProviders, categoryLabel } = await import(
      "./directory-providers"
    );
    const providers = searchDirectoryProviders({
      q: data.q,
      category: data.category,
      city: data.city,
      limit: 100,
    });
    return {
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        categoryLabel: categoryLabel(p.category),
        city: p.city,
        state: p.state,
        area: p.area,
        phone: p.phone,
        website: p.website,
        verified: Boolean(p.verified),
        description: (p.seo_description || p.notes || "").trim(),
      })),
      categories: [...CATEGORIES],
    };
  });

export const DIRECTORY_CATEGORY_OPTIONS = CATEGORIES;
