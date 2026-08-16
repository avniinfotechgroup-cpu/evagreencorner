export type SiteScriptsSettings = {
  /** Google Analytics 4 Measurement ID, e.g. G-XXXXXXXX */
  gaMeasurementId: string;
  /** Google Tag Manager container ID, e.g. GTM-XXXXXXX */
  gtmContainerId: string;
  /** Raw HTML/JS pasted into &lt;head&gt; (admin-managed). */
  customHeadHtml: string;
  /** Raw HTML/JS pasted at start of &lt;body&gt; (admin-managed). */
  customBodyHtml: string;
  /**
   * Extra JSON-LD schema object or array (stringified JSON).
   * Merged sitewide in addition to built-in Organization/WebSite schema.
   */
  customJsonLd: string;
  updatedAt: string;
};

export const DEFAULT_SITE_SCRIPTS: SiteScriptsSettings = {
  gaMeasurementId: "",
  gtmContainerId: "",
  customHeadHtml: "",
  customBodyHtml: "",
  customJsonLd: "",
  updatedAt: "",
};

export function normalizeSiteScripts(
  input: Partial<SiteScriptsSettings>,
): SiteScriptsSettings {
  return {
    gaMeasurementId: String(input.gaMeasurementId ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 40),
    gtmContainerId: String(input.gtmContainerId ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 40),
    customHeadHtml: String(input.customHeadHtml ?? "").slice(0, 50_000),
    customBodyHtml: String(input.customBodyHtml ?? "").slice(0, 50_000),
    customJsonLd: String(input.customJsonLd ?? "").slice(0, 50_000),
    updatedAt: String(input.updatedAt ?? ""),
  };
}

/** Soft-validate IDs for admin save feedback (empty allowed). */
export function validateSiteScriptIds(settings: SiteScriptsSettings): string | null {
  const ga = settings.gaMeasurementId.trim();
  const gtm = settings.gtmContainerId.trim();
  if (ga && !/^G-[A-Z0-9]+$/i.test(ga)) {
    return "GA Measurement ID must look like G-XXXXXXXX.";
  }
  if (gtm && !/^GTM-[A-Z0-9]+$/i.test(gtm)) {
    return "GTM Container ID must look like GTM-XXXXXXX.";
  }
  if (settings.customJsonLd.trim()) {
    try {
      const parsed = JSON.parse(settings.customJsonLd) as unknown;
      if (!parsed || (typeof parsed !== "object" && !Array.isArray(parsed))) {
        return "Custom schema must be a JSON object or array.";
      }
    } catch {
      return "Custom schema JSON is invalid.";
    }
  }
  return null;
}

export function parseCustomJsonLd(
  raw: string,
): Record<string, unknown> | Array<Record<string, unknown>> | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x) => x && typeof x === "object") as Array<
        Record<string, unknown>
      >;
    }
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}
