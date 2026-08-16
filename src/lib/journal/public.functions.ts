import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { JournalSearchParams } from "./queries";

/** Public Environment Journal APIs. */

export const getJournalHome = createServerFn({ method: "GET" }).handler(async () => {
  const { listCategories, listPublishedPosts, listPolicies, getJournalDashboardStats } =
    await import("./queries");

  const categories = listCategories();
  const featured = listPublishedPosts({ featuredOnly: true, limit: 4 });
  const latest = listPublishedPosts({ limit: 9 });
  const byCategory = categories
    .filter((c) => c.postCount > 0)
    .slice(0, 6)
    .map((c) => ({
      category: c,
      posts: listPublishedPosts({ categorySlug: c.slug, limit: 3 }),
    }));

  return {
    categories,
    featured,
    latest,
    byCategory,
    policies: listPolicies(6),
    stats: getJournalDashboardStats(),
  };
});

export const getJournalPost = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ slug: z.string().min(1).max(160) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPostBySlug, getRelatedPosts } = await import("./queries");
    const post = getPostBySlug(data.slug);
    if (!post) return { post: null, related: [] };
    return {
      post,
      related: getRelatedPosts(post.id, post.categorySlug, 3),
    };
  });

export const searchJournal = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        categorySlug: z.string().max(80).optional(),
        contentType: z.string().max(40).optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { searchPosts, listCategories } = await import("./queries");
    const params: JournalSearchParams = {
      q: data.q,
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    };
    if (data.categorySlug) params.categorySlug = data.categorySlug;
    if (data.contentType) params.contentType = data.contentType;
    return {
      result: searchPosts(params),
      categories: listCategories(),
    };
  });

export const getJournalPolicy = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ slug: z.string().min(1).max(160) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPolicyBySlug, getPostBySlug, listPolicies } = await import("./queries");
    const policy = getPolicyBySlug(data.slug);
    if (!policy) return { policy: null, linkedPost: null, relatedPolicies: [] };

    let linkedPost = null;
    if (policy.postId) {
      // Resolve via slug lookup after fetching post row
      const { getDb } = await import("@/lib/community/db");
      const { ensureJournalSchema } = await import("./schema");
      ensureJournalSchema();
      const row = getDb()
        .prepare(`SELECT slug FROM journal_posts WHERE id = ? AND status = 'published'`)
        .get(policy.postId) as { slug: string } | undefined;
      if (row) linkedPost = getPostBySlug(row.slug);
    }

    const relatedPolicies = listPolicies(8).filter((p) => p.id !== policy.id).slice(0, 4);
    return { policy, linkedPost, relatedPolicies };
  });
