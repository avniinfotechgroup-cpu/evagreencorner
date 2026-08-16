import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveUserByToken } from "@/lib/community/auth.server";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureJobsSchema } from "./schema";
import type { JobSearchParams } from "./queries";

/** Public Jobs APIs — auth only where user action is required. */

export const getJobsHome = createServerFn({ method: "GET" }).handler(async () => {
  const { listCategories, listOrgs, searchJobs, getJobsDashboardStats } = await import("./queries");

  const categories = listCategories();
  const featured = searchJobs({ sort: "featured", limit: 6 });
  const internships = searchJobs({ internshipOnly: true, sort: "latest", limit: 4 });
  const latest = searchJobs({ sort: "latest", limit: 8 });
  const stats = getJobsDashboardStats();

  return {
    categories,
    orgs: listOrgs().filter((o) => o.jobCount > 0),
    featured: featured.items,
    internships: internships.items,
    latest: latest.items,
    stats: {
      published: stats.published,
      internships: stats.internships,
      orgs: stats.orgs,
    },
  };
});

export const searchJobsPublic = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        categorySlug: z.string().max(80).optional(),
        jobType: z.string().max(40).optional(),
        city: z.string().max(80).optional(),
        remoteType: z.string().max(40).optional(),
        internshipOnly: z.coerce.boolean().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        sort: z.enum(["latest", "deadline", "featured"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { searchJobs, listCategories } = await import("./queries");
    const params: JobSearchParams = {
      q: data.q,
      sort: data.sort ?? "latest",
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    };
    if (data.categorySlug) params.categorySlug = data.categorySlug;
    if (data.jobType) params.jobType = data.jobType;
    if (data.city) params.city = data.city;
    if (data.remoteType) params.remoteType = data.remoteType;
    if (data.internshipOnly) params.internshipOnly = true;
    return {
      result: searchJobs(params),
      categories: listCategories(),
    };
  });

export const getJobDetail = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        slug: z.string().min(1).max(160),
        token: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getJobBySlug, getRelatedJobs, getJobInternalCategoryId } = await import("./queries");
    const job = getJobBySlug(data.slug);
    if (!job) return { job: null, related: [], alreadyApplied: false };

    // Only expose published (or expired for archival view) — hide drafts
    if (job.status === "draft" || job.status === "archived") {
      return { job: null, related: [], alreadyApplied: false };
    }

    const categoryId = getJobInternalCategoryId(job.id);
    const related = getRelatedJobs(job.id, categoryId, 4);

    let alreadyApplied = false;
    if (data.token) {
      const user = resolveUserByToken(data.token);
      if (user) {
        ensureJobsSchema();
        const row = getDb()
          .prepare(`SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?`)
          .get(job.id, user.id) as { id: string } | undefined;
        alreadyApplied = Boolean(row);
      }
    }

    return { job, related, alreadyApplied };
  });

export const applyToJob = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        jobId: z.string().min(3),
        resumePath: z.string().max(500).optional().default(""),
        coverLetter: z.string().max(5000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = resolveUserByToken(data.token);
    if (!user) throw new Error("Please sign in to apply.");

    ensureJobsSchema();
    const db = getDb();
    const job = db
      .prepare(`SELECT id, status, deadline FROM jobs WHERE id = ?`)
      .get(data.jobId) as { id: string; status: string; deadline: string | null } | undefined;

    if (!job || job.status !== "published") {
      throw new Error("This job is not open for applications.");
    }
    if (job.deadline && job.deadline < new Date().toISOString().slice(0, 10)) {
      throw new Error("The application deadline has passed.");
    }

    const existing = db
      .prepare(`SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?`)
      .get(job.id, user.id) as { id: string } | undefined;
    if (existing) throw new Error("You have already applied to this job.");

    const ts = new Date().toISOString();
    const id = `japp-${newId().slice(0, 12)}`;
    // user_id always from token — never from client payload (IDOR-safe)
    db.prepare(
      `INSERT INTO job_applications
        (id, job_id, user_id, resume_path, cover_letter, status, applied_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
    ).run(id, job.id, user.id, data.resumePath.trim(), data.coverLetter.trim(), ts, ts);

    return { ok: true, applicationId: id };
  });

export const upsertJobAlert = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        keywords: z.string().max(200).optional().default(""),
        categorySlug: z.string().max(80).optional(),
        location: z.string().max(120).optional().default(""),
        jobType: z.string().max(40).optional().default(""),
        frequency: z.enum(["daily", "weekly"]).optional().default("weekly"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const user = resolveUserByToken(data.token);
    if (!user) throw new Error("Please sign in to create a job alert.");

    ensureJobsSchema();
    const db = getDb();
    const { getJobCategoryIdBySlug } = await import("./queries");
    const categoryId = data.categorySlug
      ? getJobCategoryIdBySlug(data.categorySlug)
      : null;

    const ts = new Date().toISOString();
    const existing = db
      .prepare(`SELECT id FROM job_alerts WHERE user_id = ? AND status = 'active' LIMIT 1`)
      .get(user.id) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE job_alerts
         SET keywords = ?, category_id = ?, location = ?, job_type = ?, frequency = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      ).run(
        data.keywords.trim(),
        categoryId,
        data.location.trim(),
        data.jobType.trim(),
        data.frequency,
        ts,
        existing.id,
        user.id,
      );
      return { ok: true, alertId: existing.id, updated: true };
    }

    const id = `jalert-${newId().slice(0, 12)}`;
    db.prepare(
      `INSERT INTO job_alerts
        (id, user_id, keywords, category_id, location, job_type, frequency, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).run(
      id,
      user.id,
      data.keywords.trim(),
      categoryId,
      data.location.trim(),
      data.jobType.trim(),
      data.frequency,
      ts,
      ts,
    );
    return { ok: true, alertId: id, updated: false };
  });
