import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/community/auth.server";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import {
  ensureJournalSchema,
  slugifyJournal,
} from "./schema";
import {
  JOURNAL_CONTENT_TYPES,
  JOURNAL_POLICY_STATUSES,
  JOURNAL_POST_STATUSES,
} from "./constants";
import {
  adminListPosts,
  getJournalDashboardStats,
  getPostByIdForAdmin,
  listCategories,
  listPolicies,
} from "./queries";

function now() {
  return new Date().toISOString();
}

function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
  }
  return false;
}

function resolveCategoryId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const db = getDb();
  const byId = db.prepare(`SELECT id FROM journal_categories WHERE id = ?`).get(value) as
    | { id: string }
    | undefined;
  if (byId) return byId.id;
  const bySlug = db
    .prepare(`SELECT id FROM journal_categories WHERE lower(slug) = lower(?)`)
    .get(value) as { id: string } | undefined;
  if (bySlug) return bySlug.id;
  const byName = db
    .prepare(`SELECT id FROM journal_categories WHERE lower(name) = lower(?)`)
    .get(value) as { id: string } | undefined;
  return byName?.id ?? null;
}

function normalizePostStatus(raw: string): (typeof JOURNAL_POST_STATUSES)[number] {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((JOURNAL_POST_STATUSES as readonly string[]).includes(s)) {
    return s as (typeof JOURNAL_POST_STATUSES)[number];
  }
  if (s === "publish" || s === "live") return "published";
  return "draft";
}

function normalizeContentType(raw: string): (typeof JOURNAL_CONTENT_TYPES)[number] {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((JOURNAL_CONTENT_TYPES as readonly string[]).includes(s)) {
    return s as (typeof JOURNAL_CONTENT_TYPES)[number];
  }
  return "explainer";
}

export const adminJournalDashboard = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    return {
      stats: getJournalDashboardStats(),
      posts: adminListPosts(500),
      categories: listCategories(),
      policies: listPolicies(50),
      statuses: [...JOURNAL_POST_STATUSES],
      contentTypes: [...JOURNAL_CONTENT_TYPES],
    };
  });

export const adminListPostsFn = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    return { posts: adminListPosts(500) };
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    return { post: getPostByIdForAdmin(data.id) };
  });

const postInput = z.object({
  id: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  title: z.string().min(2).max(240),
  excerpt: z.string().max(800).optional().default(""),
  content: z.string().max(100000).optional().default(""),
  featuredImage: z.string().max(500).optional().default(""),
  imageAlt: z.string().max(240).optional().default(""),
  authorName: z.string().max(120).optional().default("EVA Green Corner Editorial"),
  readingTime: z.coerce.number().int().positive().optional().default(5),
  status: z.enum(JOURNAL_POST_STATUSES).default("draft"),
  seoTitle: z.string().max(200).optional().default(""),
  seoKeywords: z.string().max(200).optional().default(""),
  seoDescription: z.string().max(400).optional().default(""),
  seoFocusKeyword: z.string().max(80).optional().default(""),
  canonicalUrl: z.string().max(500).optional().default(""),
  featured: z.boolean().optional().default(false),
  sourceType: z.string().max(40).optional().default("editorial"),
  contentType: z.enum(JOURNAL_CONTENT_TYPES).default("explainer"),
  publishedAt: z.string().max(40).optional().nullable(),
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        url: z.string().max(500).optional().default(""),
        publisher: z.string().max(200).optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

export const adminUpsertPost = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), post: postInput }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    const p = data.post;
    const ts = now();

    const publishedAt =
      p.status === "published"
        ? p.publishedAt || ts
        : p.status === "scheduled"
          ? p.publishedAt || null
          : p.publishedAt || null;

    let postId = p.id;

    if (postId) {
      db.prepare(
        `UPDATE journal_posts SET
          category_id = ?, title = ?, excerpt = ?, content = ?, featured_image = ?,
          image_alt = ?, author_name = ?, reading_time = ?, status = ?, published_at = ?,
          updated_at = ?, seo_title = ?, seo_keywords = ?, seo_description = ?,
          seo_focus_keyword = ?, canonical_url = ?, featured = ?, source_type = ?, content_type = ?
         WHERE id = ?`,
      ).run(
        p.categoryId ?? null,
        p.title,
        p.excerpt,
        p.content,
        p.featuredImage,
        p.imageAlt,
        p.authorName,
        p.readingTime,
        p.status,
        publishedAt,
        ts,
        p.seoTitle || p.title,
        p.seoKeywords,
        p.seoDescription || p.excerpt,
        p.seoFocusKeyword,
        p.canonicalUrl,
        p.featured ? 1 : 0,
        p.sourceType,
        p.contentType,
        postId,
      );
      db.prepare(`DELETE FROM journal_sources WHERE post_id = ?`).run(postId);
    } else {
      let slug = slugifyJournal(p.title);
      const clash = db.prepare(`SELECT id FROM journal_posts WHERE slug = ?`).get(slug);
      if (clash) slug = `${slug}-${newId().slice(0, 4)}`;
      postId = `jpost-${newId().slice(0, 12)}`;
      db.prepare(
        `INSERT INTO journal_posts
          (id, author_id, category_id, title, slug, excerpt, content, featured_image, image_alt,
           author_name, reading_time, status, published_at, updated_at, seo_title, seo_keywords,
           seo_description, seo_focus_keyword, canonical_url, featured, source_type, content_type,
           created_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        postId,
        p.categoryId ?? null,
        p.title,
        slug,
        p.excerpt,
        p.content,
        p.featuredImage,
        p.imageAlt,
        p.authorName,
        p.readingTime,
        p.status,
        publishedAt,
        ts,
        p.seoTitle || p.title,
        p.seoKeywords,
        p.seoDescription || p.excerpt,
        p.seoFocusKeyword,
        p.canonicalUrl,
        p.featured ? 1 : 0,
        p.sourceType,
        p.contentType,
        ts,
      );
    }

    for (const s of p.sources) {
      db.prepare(
        `INSERT INTO journal_sources (id, post_id, title, url, publisher, accessed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        `jsrc-${newId().slice(0, 10)}`,
        postId,
        s.title,
        s.url,
        s.publisher,
        ts.slice(0, 10),
      );
    }

    return { ok: true, id: postId };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    db.prepare(`DELETE FROM journal_sources WHERE post_id = ?`).run(data.id);
    db.prepare(`DELETE FROM journal_posts WHERE id = ?`).run(data.id);
    return { ok: true as const };
  });

export const adminBulkDeletePosts = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        ids: z.array(z.string().min(3)).min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    const delSrc = db.prepare(`DELETE FROM journal_sources WHERE post_id = ?`);
    const delPost = db.prepare(`DELETE FROM journal_posts WHERE id = ?`);
    let deleted = 0;
    for (const id of data.ids) {
      delSrc.run(id);
      const res = delPost.run(id);
      deleted += Number(res.changes || 0);
    }
    return { ok: true as const, deleted };
  });

export const adminSetPostStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        postId: z.string().min(3),
        status: z.enum(JOURNAL_POST_STATUSES),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    const ts = now();
    const existing = db
      .prepare(`SELECT published_at FROM journal_posts WHERE id = ?`)
      .get(data.postId) as { published_at: string | null } | undefined;
    if (!existing) throw new Error("Post not found");
    const publishedAt =
      data.status === "published" ? existing.published_at || ts : existing.published_at;
    db.prepare(
      `UPDATE journal_posts SET status = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    ).run(data.status, publishedAt, ts, data.postId);
    return { ok: true as const };
  });

const importPostRow = z.object({
  title: z.string().min(2).max(240),
  category: z.string().max(120).optional().default(""),
  excerpt: z.string().max(800).optional().default(""),
  content: z.string().max(100000).optional().default(""),
  author_name: z.string().max(120).optional().default("EVA Green Corner Editorial"),
  reading_time: z.union([z.string(), z.number()]).optional(),
  status: z.string().max(40).optional().default("published"),
  content_type: z.string().max(40).optional().default("explainer"),
  featured: z.union([z.boolean(), z.string(), z.number()]).optional(),
  featured_image: z.string().max(500).optional().default(""),
  image_alt: z.string().max(240).optional().default(""),
  seo_title: z.string().max(200).optional().default(""),
  seo_keywords: z.string().max(200).optional().default(""),
  seo_description: z.string().max(400).optional().default(""),
  seo_focus_keyword: z.string().max(80).optional().default(""),
  canonical_url: z.string().max(500).optional().default(""),
});

export const adminImportPostsExcel = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        rows: z.array(z.record(z.string(), z.unknown())).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i]!;
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        const key = k.trim().toLowerCase().replace(/\s+/g, "_");
        normalized[key] = typeof v === "string" ? v.trim() : v;
      }
      if (!normalized["category"] && normalized["category_slug"]) {
        normalized["category"] = normalized["category_slug"];
      }
      if (!normalized["category"] && normalized["category_name"]) {
        normalized["category"] = normalized["category_name"];
      }
      if (!normalized["author_name"] && normalized["author"]) {
        normalized["author_name"] = normalized["author"];
      }
      if (!normalized["content_type"] && normalized["type"]) {
        normalized["content_type"] = normalized["type"];
      }
      if (!normalized["seo_title"] && normalized["meta_title"]) {
        normalized["seo_title"] = normalized["meta_title"];
      }
      if (!normalized["seo_title"] && normalized["meta_tag"]) {
        normalized["seo_title"] = normalized["meta_tag"];
      }
      if (!normalized["seo_keywords"] && normalized["keywords"]) {
        normalized["seo_keywords"] = normalized["keywords"];
      }
      if (!normalized["seo_keywords"] && normalized["keyword"]) {
        normalized["seo_keywords"] = normalized["keyword"];
      }
      if (!normalized["seo_description"] && normalized["meta_description"]) {
        normalized["seo_description"] = normalized["meta_description"];
      }
      if (!normalized["seo_focus_keyword"] && normalized["focus_keyword"]) {
        normalized["seo_focus_keyword"] = normalized["focus_keyword"];
      }
      if (!normalized["seo_focus_keyword"] && normalized["focus_keyphrase"]) {
        normalized["seo_focus_keyword"] = normalized["focus_keyphrase"];
      }

      const parsed = importPostRow.safeParse(normalized);
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
        continue;
      }
      const row = parsed.data;
      try {
        const categoryId = resolveCategoryId(row.category);
        const status = normalizePostStatus(row.status);
        const contentType = normalizeContentType(row.content_type);
        const readingTime = (() => {
          const n = Number(row.reading_time);
          return Number.isFinite(n) && n > 0 ? Math.round(n) : 5;
        })();
        const ts = now();
        let slug = slugifyJournal(row.title);
        const clash = db.prepare(`SELECT id FROM journal_posts WHERE slug = ?`).get(slug);
        if (clash) slug = `${slug}-${newId().slice(0, 4)}`;
        const id = `jpost-${newId().slice(0, 12)}`;
        const excerpt = row.excerpt || String(row.content).slice(0, 220);

        db.prepare(
          `INSERT INTO journal_posts
            (id, author_id, category_id, title, slug, excerpt, content, featured_image, image_alt,
             author_name, reading_time, status, published_at, updated_at, seo_title, seo_keywords,
             seo_description, seo_focus_keyword, canonical_url, featured, source_type, content_type,
             created_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'excel-import', ?, ?)`,
        ).run(
          id,
          categoryId,
          row.title,
          slug,
          excerpt,
          row.content || excerpt,
          row.featured_image,
          row.image_alt,
          row.author_name || "EVA Green Corner Editorial",
          readingTime,
          status,
          status === "published" ? ts : null,
          ts,
          row.seo_title || row.title,
          row.seo_keywords,
          row.seo_description || excerpt,
          row.seo_focus_keyword,
          row.canonical_url,
          truthy(row.featured) ? 1 : 0,
          contentType,
          ts,
        );
        imported += 1;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "insert failed"}`);
      }
    }

    return { imported, errors: errors.slice(0, 20), total: data.rows.length };
  });

const policyInput = z.object({
  id: z.string().optional(),
  postId: z.string().optional().nullable(),
  policyName: z.string().min(2).max(240),
  authority: z.string().max(200).optional().default(""),
  policyType: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default("India"),
  state: z.string().max(80).optional().default(""),
  announcementDate: z.string().max(40).optional().nullable(),
  effectiveDate: z.string().max(40).optional().nullable(),
  status: z.enum(JOURNAL_POLICY_STATUSES).default("announced"),
  summary: z.string().max(20000).optional().default(""),
  officialSource: z.string().max(500).optional().default(""),
  documentUrl: z.string().max(500).optional().default(""),
});

export const adminUpsertPolicy = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), policy: policyInput }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJournalSchema();
    const db = getDb();
    const p = data.policy;
    const ts = now();

    if (p.id) {
      db.prepare(
        `UPDATE journal_policies SET
          post_id = ?, policy_name = ?, authority = ?, policy_type = ?, country = ?, state = ?,
          announcement_date = ?, effective_date = ?, status = ?, summary = ?,
          official_source = ?, document_url = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        p.postId ?? null,
        p.policyName,
        p.authority,
        p.policyType,
        p.country,
        p.state,
        p.announcementDate || null,
        p.effectiveDate || null,
        p.status,
        p.summary,
        p.officialSource,
        p.documentUrl,
        ts,
        p.id,
      );
      return { ok: true, id: p.id };
    }

    let slug = slugifyJournal(p.policyName);
    const clash = db.prepare(`SELECT id FROM journal_policies WHERE slug = ?`).get(slug);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;
    const id = `jpol-${newId().slice(0, 12)}`;
    db.prepare(
      `INSERT INTO journal_policies
        (id, post_id, policy_name, slug, authority, policy_type, country, state,
         announcement_date, effective_date, status, summary, official_source, document_url,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      p.postId ?? null,
      p.policyName,
      slug,
      p.authority,
      p.policyType,
      p.country,
      p.state,
      p.announcementDate || null,
      p.effectiveDate || null,
      p.status,
      p.summary,
      p.officialSource,
      p.documentUrl,
      ts,
      ts,
    );
    return { ok: true, id, slug };
  });
