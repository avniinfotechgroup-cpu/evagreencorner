import { createFileRoute } from "@tanstack/react-router";
import { buildEvSitemapXml } from "@/lib/vehicles/sitemap";

/**
 * Dynamic EV sitemap. Also written to /sitemap-ev.xml via admin refresh / cron jobs.
 * Thin filter URLs are excluded.
 */
export const Route = createFileRoute("/sitemap-ev.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = buildEvSitemapXml();
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
