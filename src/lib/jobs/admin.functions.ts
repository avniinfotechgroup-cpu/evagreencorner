import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/community/auth.server";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureJobsSchema, expireDueJobs, slugifyJob } from "./schema";
import { JOB_STATUSES, JOB_TYPES, REMOTE_TYPES } from "./constants";
import {
  adminListApplications,
  adminListJobs,
  getJobByIdForAdmin,
  getJobsDashboardStats,
  listCategories,
  listOrgs,
} from "./queries";

function now() {
  return new Date().toISOString();
}

export const adminJobsDashboard = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    expireDueJobs();
    return {
      stats: getJobsDashboardStats(),
      jobs: adminListJobs(500),
      categories: listCategories(),
      orgs: listOrgs(),
      applications: adminListApplications(undefined, 50),
      jobTypes: [...JOB_TYPES],
      remoteTypes: [...REMOTE_TYPES],
      statuses: [...JOB_STATUSES],
    };
  });

export const adminGetJob = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    return { job: getJobByIdForAdmin(data.id) };
  });

function findOrCreateOrganization(name: string): string {
  const db = getDb();
  const ts = now();
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) throw new Error("Organization name is required.");

  const byName = db
    .prepare(`SELECT id FROM job_organizations WHERE lower(name) = lower(?)`)
    .get(cleaned) as { id: string } | undefined;
  if (byName) return byName.id;

  const baseSlug = slugifyJob(cleaned) || `org-${newId().slice(0, 8)}`;
  const bySlug = db
    .prepare(`SELECT id FROM job_organizations WHERE slug = ?`)
    .get(baseSlug) as { id: string } | undefined;
  // Same slug usually means same org (e.g. "Acme Corp" vs "Acme-Corp")
  if (bySlug) return bySlug.id;

  const id = `org-${newId().slice(0, 12)}`;
  let slug = baseSlug;
  const insert = db.prepare(
    `INSERT INTO job_organizations
      (id, name, slug, logo, description, website, industry, organization_type, location,
       verified, status, created_at, updated_at)
     VALUES (?, ?, ?, '', '', '', '', '', '', 0, 'active', ?, ?)`,
  );

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      insert.run(id, cleaned, slug, ts, ts);
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("UNIQUE")) throw err;
      const existing = db
        .prepare(`SELECT id FROM job_organizations WHERE slug = ? OR lower(name) = lower(?)`)
        .get(slug, cleaned) as { id: string } | undefined;
      if (existing) return existing.id;
      slug = `${baseSlug}-${newId().slice(0, 6)}`;
    }
  }

  throw new Error(`Could not create organization “${cleaned}” (slug conflict).`);
}

function resolveCategoryId(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const db = getDb();
  const key = raw.trim();
  const byId = db.prepare(`SELECT id FROM job_categories WHERE id = ?`).get(key) as
    | { id: string }
    | undefined;
  if (byId) return byId.id;
  const slug = slugifyJob(key);
  const bySlug = db.prepare(`SELECT id FROM job_categories WHERE slug = ?`).get(slug) as
    | { id: string }
    | undefined;
  if (bySlug) return bySlug.id;
  const byName = db
    .prepare(`SELECT id FROM job_categories WHERE lower(name) = lower(?)`)
    .get(key) as { id: string } | undefined;
  return byName?.id ?? null;
}

function truthy(v: unknown): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function normalizeJobType(raw: string): (typeof JOB_TYPES)[number] {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, (typeof JOB_TYPES)[number]> = {
    full_time: "full_time",
    fulltime: "full_time",
    "full time": "full_time",
    job: "full_time",
    part_time: "part_time",
    parttime: "part_time",
    contract: "contract",
    internship: "internship",
    intern: "internship",
    apprenticeship: "apprenticeship",
    fellowship: "fellowship",
    temporary: "temporary",
    volunteer: "volunteer",
  };
  return aliases[key] ?? (JOB_TYPES.includes(key as (typeof JOB_TYPES)[number]) ? (key as (typeof JOB_TYPES)[number]) : "full_time");
}

function normalizeRemote(raw: string): (typeof REMOTE_TYPES)[number] {
  const key = raw.trim().toLowerCase();
  if (key === "hybrid") return "hybrid";
  if (key === "remote" || key === "wfh" || key === "work_from_home") return "remote";
  return "onsite";
}

function normalizeStatus(raw: string): (typeof JOB_STATUSES)[number] {
  const key = raw.trim().toLowerCase();
  if ((JOB_STATUSES as readonly string[]).includes(key)) {
    return key as (typeof JOB_STATUSES)[number];
  }
  return "draft";
}

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const jobInput = z.object({
  id: z.string().optional(),
  organizationId: z.preprocess(emptyToUndef, z.string().min(3).optional()),
  organizationName: z.preprocess(emptyToUndef, z.string().min(2).max(200).optional()),
  title: z.string().min(2).max(200),
  jobType: z.enum(JOB_TYPES).default("full_time"),
  categoryId: z.string().optional().nullable(),
  description: z.string().max(100000).optional().default(""),
  responsibilities: z.string().max(8000).optional().default(""),
  requirements: z.string().max(8000).optional().default(""),
  qualification: z.string().max(1000).optional().default(""),
  experienceMin: z.coerce.number().int().nonnegative().optional().nullable(),
  experienceMax: z.coerce.number().int().nonnegative().optional().nullable(),
  salaryMin: z.coerce.number().nonnegative().optional().nullable(),
  salaryMax: z.coerce.number().nonnegative().optional().nullable(),
  salaryType: z.string().max(40).optional().default(""),
  location: z.string().max(200).optional().default(""),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default("India"),
  remoteType: z.enum(REMOTE_TYPES).default("onsite"),
  skills: z.string().max(500).optional().default(""),
  applicationUrl: z.string().max(500).optional().default(""),
  applicationEmail: z.string().max(200).optional().default(""),
  deadline: z.string().max(40).optional().nullable(),
  status: z.enum(JOB_STATUSES).default("draft"),
  featured: z.boolean().optional().default(false),
  verified: z.boolean().optional().default(false),
  source: z.string().max(200).optional().default(""),
  sourceUrl: z.string().max(500).optional().default(""),
  durationMonths: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().positive().optional().nullable(),
  ),
  stipendMonthly: z.preprocess(
    emptyToUndef,
    z.coerce.number().nonnegative().optional().nullable(),
  ),
  startDate: z.string().max(40).optional().nullable(),
  endDate: z.string().max(40).optional().nullable(),
  mode: z.string().max(40).optional().default(""),
  eligibility: z.string().max(2000).optional().default(""),
  specialization: z.string().max(200).optional().default(""),
  certificateOffered: z.boolean().optional().default(false),
  seoTitle: z.string().max(200).optional().default(""),
  seoKeywords: z.string().max(200).optional().default(""),
  seoDescription: z.string().max(400).optional().default(""),
  seoFocusKeyword: z.string().max(80).optional().default(""),
});

function resolveOrganizationId(j: z.infer<typeof jobInput>): string {
  if (j.organizationId?.trim()) return j.organizationId.trim();
  if (j.organizationName?.trim()) return findOrCreateOrganization(j.organizationName);
  throw new Error("Select or enter an organization.");
}

export const adminUpsertJob = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), job: jobInput }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    const db = getDb();
    const j = data.job;
    const ts = now();
    const organizationId = resolveOrganizationId(j);
    const categoryId = resolveCategoryId(j.categoryId);

    if (j.id) {
      db.prepare(
        `UPDATE jobs SET
          organization_id = ?, title = ?, job_type = ?, category_id = ?,
          description = ?, responsibilities = ?, requirements = ?, qualification = ?,
          experience_min = ?, experience_max = ?, salary_min = ?, salary_max = ?,
          salary_type = ?, location = ?, city = ?, state = ?, country = ?,
          remote_type = ?, skills = ?, application_url = ?, application_email = ?,
          deadline = ?, status = ?, featured = ?, verified = ?, source = ?, source_url = ?,
          duration_months = ?, stipend_monthly = ?, start_date = ?, end_date = ?,
          mode = ?, eligibility = ?, specialization = ?, certificate_offered = ?,
          seo_title = ?, seo_keywords = ?, seo_description = ?, seo_focus_keyword = ?,
          updated_at = ?
         WHERE id = ?`,
      ).run(
        organizationId,
        j.title,
        j.jobType,
        categoryId,
        j.description,
        j.responsibilities,
        j.requirements,
        j.qualification,
        j.experienceMin ?? null,
        j.experienceMax ?? null,
        j.salaryMin ?? null,
        j.salaryMax ?? null,
        j.salaryType,
        j.location,
        j.city,
        j.state,
        j.country,
        j.remoteType,
        j.skills,
        j.applicationUrl,
        j.applicationEmail,
        j.deadline || null,
        j.status,
        j.featured ? 1 : 0,
        j.verified ? 1 : 0,
        j.source,
        j.sourceUrl,
        j.durationMonths ?? null,
        j.stipendMonthly ?? null,
        j.startDate || null,
        j.endDate || null,
        j.mode,
        j.eligibility,
        j.specialization,
        j.certificateOffered ? 1 : 0,
        j.seoTitle,
        j.seoKeywords,
        j.seoDescription,
        j.seoFocusKeyword,
        ts,
        j.id,
      );
      return { ok: true, id: j.id };
    }

    let slug = slugifyJob(j.title);
    const clash = db.prepare(`SELECT id FROM jobs WHERE slug = ?`).get(slug);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;
    const id = `job-${newId().slice(0, 12)}`;

    db.prepare(
      `INSERT INTO jobs
        (id, organization_id, title, slug, job_type, category_id, description, responsibilities,
         requirements, qualification, experience_min, experience_max, salary_min, salary_max,
         salary_type, location, city, state, country, remote_type, skills, application_url,
         application_email, deadline, posted_at, status, featured, source, source_url, verified,
         duration_months, stipend_monthly, start_date, end_date, mode, eligibility, specialization,
         certificate_offered, seo_title, seo_keywords, seo_description, seo_focus_keyword,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      organizationId,
      j.title,
      slug,
      j.jobType,
      categoryId,
      j.description,
      j.responsibilities,
      j.requirements,
      j.qualification,
      j.experienceMin ?? null,
      j.experienceMax ?? null,
      j.salaryMin ?? null,
      j.salaryMax ?? null,
      j.salaryType,
      j.location,
      j.city,
      j.state,
      j.country,
      j.remoteType,
      j.skills,
      j.applicationUrl,
      j.applicationEmail,
      j.deadline || null,
      j.status === "published" ? ts : null,
      j.status,
      j.featured ? 1 : 0,
      j.source,
      j.sourceUrl,
      j.verified ? 1 : 0,
      j.durationMonths ?? null,
      j.stipendMonthly ?? null,
      j.startDate || null,
      j.endDate || null,
      j.mode,
      j.eligibility,
      j.specialization,
      j.certificateOffered ? 1 : 0,
      j.seoTitle,
      j.seoKeywords,
      j.seoDescription,
      j.seoFocusKeyword,
      ts,
      ts,
    );
    return { ok: true, id, slug };
  });

export const adminEnsureOrganization = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        name: z.string().min(2).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    const id = findOrCreateOrganization(data.name);
    return { id, orgs: listOrgs() };
  });

export const adminDeleteJob = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    getDb().prepare(`DELETE FROM jobs WHERE id = ?`).run(data.id);
    return { ok: true as const };
  });

export const adminBulkDeleteJobs = createServerFn({ method: "POST" })
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
    ensureJobsSchema();
    const stmt = getDb().prepare(`DELETE FROM jobs WHERE id = ?`);
    let deleted = 0;
    for (const id of data.ids) {
      const res = stmt.run(id);
      deleted += Number(res.changes || 0);
    }
    return { ok: true as const, deleted };
  });

const importJobRow = z.object({
  title: z.string().min(2).max(200),
  organization: z.string().min(2).max(200),
  job_type: z.string().min(1).max(40).optional().default("full_time"),
  category: z.string().max(120).optional().default(""),
  description: z.string().max(10000).optional().default(""),
  responsibilities: z.string().max(8000).optional().default(""),
  requirements: z.string().max(8000).optional().default(""),
  qualification: z.string().max(1000).optional().default(""),
  location: z.string().max(200).optional().default(""),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default("India"),
  remote_type: z.string().max(40).optional().default("onsite"),
  skills: z.string().max(500).optional().default(""),
  application_url: z.string().max(500).optional().default(""),
  application_email: z.string().max(200).optional().default(""),
  deadline: z.string().max(40).optional().default(""),
  status: z.string().max(40).optional().default("published"),
  featured: z.union([z.boolean(), z.string(), z.number()]).optional(),
  verified: z.union([z.boolean(), z.string(), z.number()]).optional(),
  experience_min: z.union([z.string(), z.number()]).optional(),
  experience_max: z.union([z.string(), z.number()]).optional(),
  salary_min: z.union([z.string(), z.number()]).optional(),
  salary_max: z.union([z.string(), z.number()]).optional(),
  salary_type: z.string().max(40).optional().default(""),
  duration_months: z.union([z.string(), z.number()]).optional(),
  stipend_monthly: z.union([z.string(), z.number()]).optional(),
  mode: z.string().max(40).optional().default(""),
  eligibility: z.string().max(2000).optional().default(""),
  specialization: z.string().max(200).optional().default(""),
  certificate_offered: z.union([z.boolean(), z.string(), z.number()]).optional(),
  start_date: z.string().max(40).optional().default(""),
  end_date: z.string().max(40).optional().default(""),
  seo_title: z.string().max(70).optional().default(""),
  seo_keywords: z.string().max(200).optional().default(""),
  seo_description: z.string().max(320).optional().default(""),
  seo_focus_keyword: z.string().max(80).optional().default(""),
});

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const adminImportJobsExcel = createServerFn({ method: "POST" })
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
    ensureJobsSchema();
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
      if (!normalized["organization"] && normalized["organization_name"]) {
        normalized["organization"] = normalized["organization_name"];
      }
      if (!normalized["organization"] && normalized["org"]) {
        normalized["organization"] = normalized["org"];
      }
      if (!normalized["job_type"] && normalized["type"]) {
        normalized["job_type"] = normalized["type"];
      }
      if (!normalized["category"] && normalized["category_slug"]) {
        normalized["category"] = normalized["category_slug"];
      }
      if (!normalized["application_email"] && normalized["apply_email"]) {
        normalized["application_email"] = normalized["apply_email"];
      }
      if (!normalized["application_url"] && normalized["apply_url"]) {
        normalized["application_url"] = normalized["apply_url"];
      }
      if (!normalized["certificate_offered"] && normalized["cert"]) {
        normalized["certificate_offered"] = normalized["cert"];
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

      const parsed = importJobRow.safeParse(normalized);
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
        continue;
      }
      const row = parsed.data;
      try {
        const organizationId = findOrCreateOrganization(row.organization);
        const categoryId = resolveCategoryId(row.category);
        const jobType = normalizeJobType(row.job_type);
        const remoteType = normalizeRemote(row.remote_type);
        const status = normalizeStatus(row.status);
        const ts = now();
        let slug = slugifyJob(row.title);
        const clash = db.prepare(`SELECT id FROM jobs WHERE slug = ?`).get(slug);
        if (clash) slug = `${slug}-${newId().slice(0, 4)}`;
        const id = `job-${newId().slice(0, 12)}`;

        db.prepare(
          `INSERT INTO jobs
            (id, organization_id, title, slug, job_type, category_id, description, responsibilities,
             requirements, qualification, experience_min, experience_max, salary_min, salary_max,
             salary_type, location, city, state, country, remote_type, skills, application_url,
             application_email, deadline, posted_at, status, featured, source, source_url, verified,
             duration_months, stipend_monthly, start_date, end_date, mode, eligibility, specialization,
             certificate_offered, seo_title, seo_keywords, seo_description, seo_focus_keyword,
             created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                   ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          organizationId,
          row.title,
          slug,
          jobType,
          categoryId,
          row.description,
          row.responsibilities,
          row.requirements,
          row.qualification,
          numOrNull(row.experience_min),
          numOrNull(row.experience_max),
          numOrNull(row.salary_min),
          numOrNull(row.salary_max),
          row.salary_type,
          row.location || [row.city, row.state].filter(Boolean).join(", "),
          row.city,
          row.state,
          row.country || "India",
          remoteType,
          row.skills,
          row.application_url,
          row.application_email,
          row.deadline || null,
          status === "published" ? ts : null,
          status,
          truthy(row.featured) ? 1 : 0,
          "excel-import",
          "",
          truthy(row.verified) ? 1 : 0,
          numOrNull(row.duration_months),
          numOrNull(row.stipend_monthly),
          row.start_date || null,
          row.end_date || null,
          row.mode,
          row.eligibility,
          row.specialization,
          truthy(row.certificate_offered) ? 1 : 0,
          row.seo_title,
          row.seo_keywords,
          row.seo_description,
          row.seo_focus_keyword,
          ts,
          ts,
        );
        imported += 1;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "insert failed"}`);
      }
    }

    return { imported, errors: errors.slice(0, 20), total: data.rows.length };
  });

export const adminSetJobStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        jobId: z.string().min(3),
        status: z.enum(JOB_STATUSES),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    const db = getDb();
    const ts = now();
    const existing = db.prepare(`SELECT posted_at FROM jobs WHERE id = ?`).get(data.jobId) as
      | { posted_at: string | null }
      | undefined;
    if (!existing) throw new Error("Job not found.");

    const postedAt =
      data.status === "published" && (!existing.posted_at || existing.posted_at === "")
        ? ts
        : existing.posted_at;

    db.prepare(`UPDATE jobs SET status = ?, updated_at = ?, posted_at = ? WHERE id = ?`).run(
      data.status,
      ts,
      postedAt,
      data.jobId,
    );

    return { ok: true };
  });

export const adminListApplicationsFn = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        jobId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    return { applications: adminListApplications(data.jobId, 200) };
  });

export const adminUpdateApplicationStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        applicationId: z.string().min(3),
        status: z.enum([
          "submitted",
          "reviewing",
          "shortlisted",
          "rejected",
          "hired",
          "withdrawn",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureJobsSchema();
    getDb()
      .prepare(`UPDATE job_applications SET status = ?, updated_at = ? WHERE id = ?`)
      .run(data.status, now(), data.applicationId);
    return { ok: true };
  });
