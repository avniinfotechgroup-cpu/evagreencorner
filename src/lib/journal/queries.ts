import { getDb } from "@/lib/community/db";
import { ensureJournalSchema } from "./schema";

export type JournalCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
};

export type JournalPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  authorName: string;
  readingTime: number;
  publishedAt: string | null;
  featured: boolean;
  contentType: string;
  categoryName: string | null;
  categorySlug: string | null;
  featuredImage: string;
  imageAlt: string;
};

export type JournalSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  accessedAt: string | null;
};

export type JournalPostDetail = JournalPostListItem & {
  content: string;
  categoryId: string | null;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  seoFocusKeyword: string;
  canonicalUrl: string;
  status: string;
  sourceType: string;
  updatedAt: string;
  createdAt: string;
  sources: JournalSource[];
};

export type JournalAdminPost = JournalPostListItem & {
  categoryId: string | null;
  status: string;
  updatedAt: string;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  seoFocusKeyword: string;
  canonicalUrl: string;
};

export type JournalPolicy = {
  id: string;
  postId: string | null;
  policyName: string;
  slug: string;
  authority: string;
  policyType: string;
  country: string;
  state: string;
  announcementDate: string | null;
  effectiveDate: string | null;
  status: string;
  summary: string;
  officialSource: string;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type JournalSearchParams = {
  q?: string;
  categorySlug?: string;
  contentType?: string;
  page?: number;
  limit?: number;
};

type Row = Record<string, unknown>;

function ensure() {
  ensureJournalSchema();
  return getDb();
}

function str(r: Row, key: string, fallback = ""): string {
  const v = r[key];
  if (v == null) return fallback;
  return String(v);
}

function mapListRow(r: Row): JournalPostListItem {
  return {
    id: str(r, "id"),
    title: str(r, "title"),
    slug: str(r, "slug"),
    excerpt: str(r, "excerpt"),
    authorName: str(r, "author_name"),
    readingTime: Number(r["reading_time"] ?? 5),
    publishedAt: r["published_at"] ? str(r, "published_at") : null,
    featured: Boolean(r["featured"]),
    contentType: str(r, "content_type"),
    categoryName: r["category_name"] ? str(r, "category_name") : null,
    categorySlug: r["category_slug"] ? str(r, "category_slug") : null,
    featuredImage: str(r, "featured_image"),
    imageAlt: str(r, "image_alt"),
  };
}

function mapPolicy(r: Row): JournalPolicy {
  return {
    id: str(r, "id"),
    postId: r["post_id"] ? str(r, "post_id") : null,
    policyName: str(r, "policy_name"),
    slug: str(r, "slug"),
    authority: str(r, "authority"),
    policyType: str(r, "policy_type"),
    country: str(r, "country", "India"),
    state: str(r, "state"),
    announcementDate: r["announcement_date"] ? str(r, "announcement_date") : null,
    effectiveDate: r["effective_date"] ? str(r, "effective_date") : null,
    status: str(r, "status"),
    summary: str(r, "summary"),
    officialSource: str(r, "official_source"),
    documentUrl: str(r, "document_url"),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

const LIST_SELECT = `
  SELECT
    p.id, p.title, p.slug, p.excerpt, p.author_name, p.reading_time, p.published_at,
    p.featured, p.content_type, p.featured_image, p.image_alt,
    c.name AS category_name, c.slug AS category_slug
  FROM journal_posts p
  LEFT JOIN journal_categories c ON c.id = p.category_id
`;

export function listCategories() {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.description,
        (SELECT COUNT(*) FROM journal_posts p
          WHERE p.category_id = c.id AND p.status = 'published') AS post_count
       FROM journal_categories c
       WHERE c.status = 'active'
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all() as Row[];
  return rows.map(
    (r): JournalCategory => ({
      id: str(r, "id"),
      name: str(r, "name"),
      slug: str(r, "slug"),
      description: str(r, "description"),
      postCount: Number(r["post_count"] ?? 0),
    }),
  );
}

export function listPublishedPosts(opts?: {
  featuredOnly?: boolean;
  categorySlug?: string;
  limit?: number;
  offset?: number;
}) {
  const db = ensure();
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
  const offset = opts?.offset ?? 0;
  const where = [`p.status = 'published'`];
  const args: Array<string | number> = [];
  if (opts?.featuredOnly) where.push(`p.featured = 1`);
  if (opts?.categorySlug) {
    where.push(`c.slug = ?`);
    args.push(opts.categorySlug);
  }
  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE ${where.join(" AND ")}
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as Row[];
  return rows.map(mapListRow);
}

export function searchPosts(params: JournalSearchParams = {}) {
  const db = ensure();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  const where = [`p.status = 'published'`];
  const args: Array<string | number> = [];

  if (params.q?.trim()) {
    const q = `%${params.q.trim().toLowerCase()}%`;
    where.push(
      `(lower(p.title) LIKE ? OR lower(p.excerpt) LIKE ? OR lower(p.content) LIKE ?)`,
    );
    args.push(q, q, q);
  }
  if (params.categorySlug?.trim()) {
    where.push(`c.slug = ?`);
    args.push(params.categorySlug.trim());
  }
  if (params.contentType?.trim()) {
    where.push(`p.content_type = ?`);
    args.push(params.contentType.trim());
  }

  const whereSql = where.join(" AND ");
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM journal_posts p
         LEFT JOIN journal_categories c ON c.id = p.category_id
         WHERE ${whereSql}`,
      )
      .get(...args) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE ${whereSql}
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as Row[];

  return {
    items: rows.map(mapListRow),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function getPostBySlug(slug: string): JournalPostDetail | null {
  const db = ensure();
  const r = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM journal_posts p
       LEFT JOIN journal_categories c ON c.id = p.category_id
       WHERE p.slug = ?`,
    )
    .get(slug) as Row | undefined;
  if (!r) return null;
  if (str(r, "status") !== "published") return null;

  const sources = (
    db
      .prepare(
        `SELECT id, title, url, publisher, accessed_at FROM journal_sources
         WHERE post_id = ? ORDER BY title ASC`,
      )
      .all(str(r, "id")) as Row[]
  ).map(
    (s): JournalSource => ({
      id: str(s, "id"),
      title: str(s, "title"),
      url: str(s, "url"),
      publisher: str(s, "publisher"),
      accessedAt: s["accessed_at"] ? str(s, "accessed_at") : null,
    }),
  );

  return {
    ...mapListRow(r),
    content: str(r, "content"),
    categoryId: r["category_id"] ? str(r, "category_id") : null,
    seoTitle: str(r, "seo_title"),
    seoKeywords: str(r, "seo_keywords"),
    seoDescription: str(r, "seo_description"),
    seoFocusKeyword: str(r, "seo_focus_keyword"),
    canonicalUrl: str(r, "canonical_url"),
    status: str(r, "status"),
    sourceType: str(r, "source_type"),
    updatedAt: str(r, "updated_at"),
    createdAt: str(r, "created_at"),
    sources,
  };
}

/** Admin: load any status post by id (includes drafts). */
export function getPostByIdForAdmin(id: string): JournalPostDetail | null {
  const db = ensure();
  const r = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM journal_posts p
       LEFT JOIN journal_categories c ON c.id = p.category_id
       WHERE p.id = ?`,
    )
    .get(id) as Row | undefined;
  if (!r) return null;

  const sources = (
    db
      .prepare(
        `SELECT id, title, url, publisher, accessed_at FROM journal_sources
         WHERE post_id = ? ORDER BY title ASC`,
      )
      .all(str(r, "id")) as Row[]
  ).map(
    (s): JournalSource => ({
      id: str(s, "id"),
      title: str(s, "title"),
      url: str(s, "url"),
      publisher: str(s, "publisher"),
      accessedAt: s["accessed_at"] ? str(s, "accessed_at") : null,
    }),
  );

  return {
    ...mapListRow(r),
    content: str(r, "content"),
    categoryId: r["category_id"] ? str(r, "category_id") : null,
    seoTitle: str(r, "seo_title"),
    seoKeywords: str(r, "seo_keywords"),
    seoDescription: str(r, "seo_description"),
    seoFocusKeyword: str(r, "seo_focus_keyword"),
    canonicalUrl: str(r, "canonical_url"),
    status: str(r, "status"),
    sourceType: str(r, "source_type"),
    updatedAt: str(r, "updated_at"),
    createdAt: str(r, "created_at"),
    sources,
  };
}

export function getRelatedPosts(postId: string, categorySlug: string | null, limit = 3) {
  const db = ensure();
  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE p.status = 'published' AND p.id != ?
         ${categorySlug ? "AND c.slug = ?" : ""}
       ORDER BY p.published_at DESC
       LIMIT ?`,
    )
    .all(...(categorySlug ? [postId, categorySlug, limit] : [postId, limit])) as Row[];
  return rows.map(mapListRow);
}

export function getPolicyBySlug(slug: string): JournalPolicy | null {
  const db = ensure();
  const r = db.prepare(`SELECT * FROM journal_policies WHERE slug = ?`).get(slug) as
    | Row
    | undefined;
  return r ? mapPolicy(r) : null;
}

export function listPolicies(limit = 20) {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT * FROM journal_policies
       ORDER BY COALESCE(announcement_date, created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map(mapPolicy);
}

export function getJournalDashboardStats() {
  const db = ensure();
  const published = (
    db.prepare(`SELECT COUNT(*) as c FROM journal_posts WHERE status = 'published'`).get() as {
      c: number;
    }
  ).c;
  const drafts = (
    db.prepare(`SELECT COUNT(*) as c FROM journal_posts WHERE status = 'draft'`).get() as {
      c: number;
    }
  ).c;
  const policies = (
    db.prepare(`SELECT COUNT(*) as c FROM journal_policies`).get() as { c: number }
  ).c;
  const categories = (
    db.prepare(`SELECT COUNT(*) as c FROM journal_categories WHERE status = 'active'`).get() as {
      c: number;
    }
  ).c;
  return { published, drafts, policies, categories };
}

export function adminListPosts(limit = 100): JournalAdminPost[] {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.author_name, p.reading_time, p.published_at,
              p.featured, p.content_type, p.featured_image, p.image_alt, p.status, p.updated_at,
              p.category_id, p.seo_title, p.seo_keywords, p.seo_description, p.seo_focus_keyword,
              p.canonical_url,
              c.name AS category_name, c.slug AS category_slug
       FROM journal_posts p
       LEFT JOIN journal_categories c ON c.id = p.category_id
       ORDER BY p.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map(
    (r): JournalAdminPost => ({
      ...mapListRow(r),
      categoryId: r["category_id"] ? str(r, "category_id") : null,
      status: str(r, "status"),
      updatedAt: str(r, "updated_at"),
      seoTitle: str(r, "seo_title"),
      seoKeywords: str(r, "seo_keywords"),
      seoDescription: str(r, "seo_description"),
      seoFocusKeyword: str(r, "seo_focus_keyword"),
      canonicalUrl: str(r, "canonical_url"),
    }),
  );
}
