import { getPublicPageSeo } from "@/lib/platform/cms.functions";
import { managedPageByPath } from "@/lib/seo/page-registry";

/**
 * Load CMS page SEO for a static path (use in route loaders).
 * Falls back to registry defaults when CMS row is empty/missing fields.
 */
export async function loadPageSeo(path: string) {
  const managed = managedPageByPath(path);
  return getPublicPageSeo({
    data: {
      path,
      ...(managed?.title ? { title: managed.title } : {}),
      ...(managed?.description ? { description: managed.description } : {}),
      ...(managed?.keywords ? { keywords: managed.keywords } : {}),
      ...(managed?.noindex ? { noindex: true } : {}),
    },
  });
}
