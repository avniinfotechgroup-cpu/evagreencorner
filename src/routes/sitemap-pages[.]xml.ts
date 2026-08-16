import { createFileRoute } from "@tanstack/react-router";
import { buildPagesSitemapXml } from "@/lib/seo/sitemaps";

/** Public marketing / location / content URLs for Googlebot. */
export const Route = createFileRoute("/sitemap-pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await buildPagesSitemapXml();
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
  component: () => null,
});
