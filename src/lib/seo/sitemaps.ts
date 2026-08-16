import { siteOrigin } from "./site";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
};

function urlset(urls: SitemapUrl[]) {
  const body = urls
    .map((u) => {
      const last = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const freq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : "";
      const pri = u.priority ? `\n    <priority>${u.priority}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${last}${freq}${pri}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Core public pages + published journal/jobs for Google discovery. */
export async function buildPagesSitemapXml(baseUrl?: string): Promise<string> {
  const origin = (baseUrl || siteOrigin()).replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);

  const staticPages: Array<{ path: string; priority: string; changefreq: SitemapUrl["changefreq"] }> =
    [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/find-chargers", priority: "0.95", changefreq: "daily" },
      { path: "/chargers", priority: "0.85", changefreq: "daily" },
      { path: "/route-planner", priority: "0.9", changefreq: "weekly" },
      { path: "/air-quality", priority: "0.8", changefreq: "daily" },
      { path: "/carbon-calculator", priority: "0.7", changefreq: "monthly" },
      { path: "/water-calculator", priority: "0.7", changefreq: "monthly" },
      { path: "/directory", priority: "0.8", changefreq: "weekly" },
      { path: "/ev", priority: "0.9", changefreq: "daily" },
      { path: "/marketplace", priority: "0.8", changefreq: "weekly" },
      { path: "/job-and-internship", priority: "0.8", changefreq: "daily" },
      { path: "/journal", priority: "0.8", changefreq: "daily" },
      { path: "/solar-calculator", priority: "0.7", changefreq: "monthly" },
    ];

  const urls: SitemapUrl[] = staticPages.map((p) => {
    const entry: SitemapUrl = {
      loc: `${origin}${p.path === "/" ? "/" : p.path}`,
      lastmod: today,
      priority: p.priority,
    };
    if (p.changefreq) entry.changefreq = p.changefreq;
    return entry;
  });

  try {
    const { ensureJournalSchema } = await import("@/lib/journal/schema");
    const { listPublishedPosts } = await import("@/lib/journal/queries");
    ensureJournalSchema();
    for (const post of listPublishedPosts({ limit: 200 })) {
      urls.push({
        loc: `${origin}/journal/${post.slug}`,
        lastmod: (post.publishedAt || today).slice(0, 10),
        changefreq: "monthly",
        priority: "0.7",
      });
    }
  } catch {
    // journal optional
  }

  try {
    const { ensureJobsSchema } = await import("@/lib/jobs/schema");
    const { searchJobs } = await import("@/lib/jobs/queries");
    ensureJobsSchema();
    const res = searchJobs({ limit: 200 });
    for (const job of res.items ?? []) {
      urls.push({
        loc: `${origin}/job-and-internship/${job.slug}`,
        changefreq: "weekly",
        priority: "0.7",
      });
    }
  } catch {
    // jobs optional
  }

  return urlset(urls);
}

/** Sitemap index — Google’s preferred single discovery entry. */
export function buildSitemapIndexXml(baseUrl?: string): string {
  const origin = (baseUrl || siteOrigin()).replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const sitemaps = [`${origin}/sitemap-pages.xml`, `${origin}/sitemap-ev.xml`];
  const body = sitemaps
    .map(
      (loc) =>
        `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
