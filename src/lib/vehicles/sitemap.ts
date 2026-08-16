import fs from "node:fs";
import path from "node:path";
import { ensureVehiclesSchema } from "./schema";
import { getDb } from "@/lib/community/db";
import { listCategories, searchVehicles } from "./queries";

function appOrigin() {
  const fromEnv = process.env["VITE_APP_URL"] || process.env["APP_URL"];
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://evagreencorner.com";
}

export function buildEvSitemapXml(baseUrl?: string): string {
  ensureVehiclesSchema();
  const origin = (baseUrl || appOrigin()).replace(/\/$/, "");
  const urls: Array<{ loc: string; lastmod?: string; priority?: string }> = [
    { loc: `${origin}/ev/`, priority: "0.9" },
    { loc: `${origin}/ev/compare`, priority: "0.5" },
  ];

  for (const c of listCategories()) {
    urls.push({
      loc: `${origin}/ev/${c.slug}`,
      priority: c.parentId ? "0.6" : "0.8",
    });
  }

  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = searchVehicles({ page, limit: pageSize, sort: "latest" });
    totalPages = res.meta.totalPages;
    for (const v of res.items) {
      const entry: { loc: string; lastmod?: string; priority?: string } = {
        loc: `${origin}/ev/${v.categorySlug}/${v.brandSlug}/${v.slug}`,
        priority: "0.7",
      };
      if (v.lastVerified) entry.lastmod = v.lastVerified.slice(0, 10);
      urls.push(entry);
    }
    page += 1;
    if (page > 200) break;
  }

  const body = urls
    .map((u) => {
      const last = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const pri = u.priority ? `\n    <priority>${u.priority}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${last}${pri}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function writeEvSitemapFile() {
  const xml = buildEvSitemapXml();
  const out = path.join(process.cwd(), "public", "sitemap-ev.xml");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, xml, "utf8");

  // robots.txt is maintained with the full sitemap index (/sitemap.xml).
  // Do not rewrite it here — only refresh the EV urlset file.

  try {
    getDb()
      .prepare(
        `INSERT INTO vehicle_module_settings (key, value, updated_at)
         VALUES ('sitemap_refreshed_at', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(new Date().toISOString(), new Date().toISOString());
  } catch {
    // settings table may not exist yet
  }

  return {
    path: "/sitemap-ev.xml",
    bytes: xml.length,
    urlCount: (xml.match(/<url>/g) || []).length,
  };
}
