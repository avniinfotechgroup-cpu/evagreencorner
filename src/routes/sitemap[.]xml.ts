import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapIndexXml } from "@/lib/seo/sitemaps";

/** Google entry sitemap — lists pages + EV vehicle sitemaps. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = buildSitemapIndexXml();
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
