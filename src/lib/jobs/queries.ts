import { getDb } from "@/lib/community/db";
import { ensureJobsSchema, expireDueJobs } from "./schema";

export type JobListItem = {
  id: string;
  title: string;
  slug: string;
  jobType: string;
  status: string;
  location: string;
  city: string;
  state: string;
  country: string;
  remoteType: string;
  featured: boolean;
  verified: boolean;
  deadline: string | null;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string;
  experienceMin: number | null;
  experienceMax: number | null;
  skills: string;
  organizationName: string;
  organizationSlug: string;
  organizationVerified: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  durationMonths: number | null;
  stipendMonthly: number | null;
  mode: string;
  certificateOffered: boolean;
};

export type JobDetail = JobListItem & {
  description: string;
  responsibilities: string;
  requirements: string;
  qualification: string;
  applicationUrl: string;
  applicationEmail: string;
  source: string;
  sourceUrl: string;
  organizationDescription: string;
  organizationWebsite: string;
  organizationLogo: string;
  organizationIndustry: string;
  organizationType: string;
  organizationLocation: string;
  startDate: string | null;
  endDate: string | null;
  eligibility: string;
  specialization: string;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  seoFocusKeyword: string;
  createdAt: string;
  updatedAt: string;
};

export type JobCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  jobCount: number;
};

export type JobOrg = {
  id: string;
  name: string;
  slug: string;
  location: string;
  verified: boolean;
  jobCount: number;
};

export type JobSearchParams = {
  q?: string;
  categorySlug?: string;
  jobType?: string;
  city?: string;
  remoteType?: string;
  internshipOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: "latest" | "deadline" | "featured";
};

type Row = Record<string, unknown>;

function ensure() {
  ensureJobsSchema();
  expireDueJobs();
  return getDb();
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function str(r: Row, key: string, fallback = ""): string {
  const v = r[key];
  if (v == null) return fallback;
  return String(v);
}

function mapListRow(r: Row): JobListItem {
  return {
    id: str(r, "id"),
    title: str(r, "title"),
    slug: str(r, "slug"),
    jobType: str(r, "job_type"),
    status: str(r, "status"),
    location: str(r, "location"),
    city: str(r, "city"),
    state: str(r, "state"),
    country: str(r, "country", "India"),
    remoteType: str(r, "remote_type", "onsite"),
    featured: Boolean(r["featured"]),
    verified: Boolean(r["verified"]),
    deadline: r["deadline"] ? str(r, "deadline") : null,
    postedAt: r["posted_at"] ? str(r, "posted_at") : null,
    salaryMin: num(r["salary_min"]),
    salaryMax: num(r["salary_max"]),
    salaryType: str(r, "salary_type"),
    experienceMin: num(r["experience_min"]),
    experienceMax: num(r["experience_max"]),
    skills: str(r, "skills"),
    organizationName: str(r, "org_name"),
    organizationSlug: str(r, "org_slug"),
    organizationVerified: Boolean(r["org_verified"]),
    categoryName: r["category_name"] ? str(r, "category_name") : null,
    categorySlug: r["category_slug"] ? str(r, "category_slug") : null,
    durationMonths: num(r["duration_months"]),
    stipendMonthly: num(r["stipend_monthly"]),
    mode: str(r, "mode"),
    certificateOffered: Boolean(r["certificate_offered"]),
  };
}

const LIST_SELECT = `
  SELECT
    j.id, j.title, j.slug, j.job_type, j.status, j.location, j.city, j.state, j.country,
    j.remote_type, j.featured, j.verified, j.deadline, j.posted_at,
    j.salary_min, j.salary_max, j.salary_type, j.experience_min, j.experience_max, j.skills,
    j.duration_months, j.stipend_monthly, j.mode, j.certificate_offered,
    o.name AS org_name, o.slug AS org_slug, o.verified AS org_verified,
    c.name AS category_name, c.slug AS category_slug
  FROM jobs j
  JOIN job_organizations o ON o.id = j.organization_id
  LEFT JOIN job_categories c ON c.id = j.category_id
`;

const ACTIVE_WHERE = `
  j.status = 'published'
  AND (j.deadline IS NULL OR j.deadline = '' OR j.deadline >= date('now'))
`;

export function listCategories() {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.description,
        (SELECT COUNT(*) FROM jobs j
          WHERE j.category_id = c.id AND j.status = 'published'
            AND (j.deadline IS NULL OR j.deadline = '' OR j.deadline >= date('now'))
        ) AS job_count
       FROM job_categories c
       WHERE c.status = 'active'
       ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all() as Row[];
  return rows.map(
    (r): JobCategory => ({
      id: str(r, "id"),
      name: str(r, "name"),
      slug: str(r, "slug"),
      description: str(r, "description"),
      jobCount: Number(r["job_count"] ?? 0),
    }),
  );
}

export function listOrgs() {
  const db = ensure();
  const rows = db
    .prepare(
      `SELECT o.id, o.name, o.slug, o.location, o.verified,
        (SELECT COUNT(*) FROM jobs j
          WHERE j.organization_id = o.id AND j.status = 'published'
            AND (j.deadline IS NULL OR j.deadline = '' OR j.deadline >= date('now'))
        ) AS job_count
       FROM job_organizations o
       WHERE o.status = 'active'
       ORDER BY o.name ASC`,
    )
    .all() as Row[];
  return rows.map(
    (r): JobOrg => ({
      id: str(r, "id"),
      name: str(r, "name"),
      slug: str(r, "slug"),
      location: str(r, "location"),
      verified: Boolean(r["verified"]),
      jobCount: Number(r["job_count"] ?? 0),
    }),
  );
}

export function searchJobs(params: JobSearchParams = {}) {
  const db = ensure();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: string[] = [ACTIVE_WHERE];
  const args: Array<string | number> = [];

  if (params.q?.trim()) {
    const q = `%${params.q.trim().toLowerCase()}%`;
    where.push(
      `(lower(j.title) LIKE ? OR lower(j.description) LIKE ? OR lower(j.skills) LIKE ? OR lower(o.name) LIKE ? OR lower(j.city) LIKE ?)`,
    );
    args.push(q, q, q, q, q);
  }
  if (params.categorySlug?.trim()) {
    where.push(`c.slug = ?`);
    args.push(params.categorySlug.trim());
  }
  if (params.jobType?.trim()) {
    where.push(`j.job_type = ?`);
    args.push(params.jobType.trim());
  }
  if (params.city?.trim()) {
    where.push(`lower(j.city) LIKE ?`);
    args.push(`%${params.city.trim().toLowerCase()}%`);
  }
  if (params.remoteType?.trim()) {
    where.push(`j.remote_type = ?`);
    args.push(params.remoteType.trim());
  }
  if (params.internshipOnly) {
    where.push(`j.job_type = 'internship'`);
  }

  let orderBy = `j.featured DESC, j.posted_at DESC`;
  if (params.sort === "deadline") {
    orderBy = `CASE WHEN j.deadline IS NULL OR j.deadline = '' THEN 1 ELSE 0 END, j.deadline ASC, j.posted_at DESC`;
  } else if (params.sort === "featured") {
    orderBy = `j.featured DESC, j.posted_at DESC`;
  } else if (params.sort === "latest") {
    orderBy = `j.posted_at DESC`;
  }

  const whereSql = where.join(" AND ");
  const countRow = db
    .prepare(
      `SELECT COUNT(*) as c FROM jobs j
       JOIN job_organizations o ON o.id = j.organization_id
       LEFT JOIN job_categories c ON c.id = j.category_id
       WHERE ${whereSql}`,
    )
    .get(...args) as { c: number };

  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as Row[];

  return {
    items: rows.map(mapListRow),
    page,
    limit,
    total: countRow.c,
    totalPages: Math.max(1, Math.ceil(countRow.c / limit)),
  };
}

export function getJobBySlug(slug: string): JobDetail | null {
  const db = ensure();
  const r = db
    .prepare(
      `SELECT
        j.*, o.name AS org_name, o.slug AS org_slug, o.verified AS org_verified,
        o.description AS org_description, o.website AS org_website, o.logo AS org_logo,
        o.industry AS org_industry, o.organization_type AS org_type, o.location AS org_location,
        c.name AS category_name, c.slug AS category_slug
       FROM jobs j
       JOIN job_organizations o ON o.id = j.organization_id
       LEFT JOIN job_categories c ON c.id = j.category_id
       WHERE j.slug = ?`,
    )
    .get(slug) as Row | undefined;
  if (!r) return null;

  const base = mapListRow(r);
  return {
    ...base,
    description: str(r, "description"),
    responsibilities: str(r, "responsibilities"),
    requirements: str(r, "requirements"),
    qualification: str(r, "qualification"),
    applicationUrl: str(r, "application_url"),
    applicationEmail: str(r, "application_email"),
    source: str(r, "source"),
    sourceUrl: str(r, "source_url"),
    organizationDescription: str(r, "org_description"),
    organizationWebsite: str(r, "org_website"),
    organizationLogo: str(r, "org_logo"),
    organizationIndustry: str(r, "org_industry"),
    organizationType: str(r, "org_type"),
    organizationLocation: str(r, "org_location"),
    startDate: r["start_date"] ? str(r, "start_date") : null,
    endDate: r["end_date"] ? str(r, "end_date") : null,
    eligibility: str(r, "eligibility"),
    specialization: str(r, "specialization"),
    seoTitle: str(r, "seo_title"),
    seoKeywords: str(r, "seo_keywords"),
    seoDescription: str(r, "seo_description"),
    seoFocusKeyword: str(r, "seo_focus_keyword"),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

export function getRelatedJobs(jobId: string, categoryId: string | null, limit = 4) {
  const db = ensure();
  const rows = db
    .prepare(
      `${LIST_SELECT}
       WHERE ${ACTIVE_WHERE}
         AND j.id != ?
         ${categoryId ? "AND j.category_id = ?" : ""}
       ORDER BY j.featured DESC, j.posted_at DESC
       LIMIT ?`,
    )
    .all(...(categoryId ? [jobId, categoryId, limit] : [jobId, limit])) as Row[];
  return rows.map(mapListRow);
}

export function getJobsDashboardStats() {
  const db = ensure();
  const published = (
    db.prepare(`SELECT COUNT(*) as c FROM jobs WHERE status = 'published'`).get() as { c: number }
  ).c;
  const internships = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM jobs WHERE status = 'published' AND job_type = 'internship'`,
      )
      .get() as { c: number }
  ).c;
  const applications = (
    db.prepare(`SELECT COUNT(*) as c FROM job_applications`).get() as { c: number }
  ).c;
  const orgs = (
    db.prepare(`SELECT COUNT(*) as c FROM job_organizations WHERE status = 'active'`).get() as {
      c: number;
    }
  ).c;
  return { published, internships, applications, orgs };
}

export function adminListJobs(limit = 100) {
  const db = ensure();
  const rows = db
    .prepare(
      `${LIST_SELECT}
       ORDER BY j.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map(mapListRow);
}

/** Admin: load any status job by id for editing. */
export function getJobByIdForAdmin(
  id: string,
): (JobDetail & { categoryId: string | null; organizationId: string }) | null {
  const db = ensure();
  const r = db
    .prepare(
      `SELECT j.*,
        o.name AS org_name, o.slug AS org_slug, o.verified AS org_verified,
        o.description AS org_description, o.website AS org_website, o.logo AS org_logo,
        o.industry AS org_industry, o.organization_type AS org_type, o.location AS org_location,
        c.name AS category_name, c.slug AS category_slug
       FROM jobs j
       JOIN job_organizations o ON o.id = j.organization_id
       LEFT JOIN job_categories c ON c.id = j.category_id
       WHERE j.id = ?`,
    )
    .get(id) as Row | undefined;
  if (!r) return null;

  const base = mapListRow(r);
  return {
    ...base,
    organizationId: str(r, "organization_id"),
    categoryId: r["category_id"] ? str(r, "category_id") : null,
    description: str(r, "description"),
    responsibilities: str(r, "responsibilities"),
    requirements: str(r, "requirements"),
    qualification: str(r, "qualification"),
    applicationUrl: str(r, "application_url"),
    applicationEmail: str(r, "application_email"),
    source: str(r, "source"),
    sourceUrl: str(r, "source_url"),
    organizationDescription: str(r, "org_description"),
    organizationWebsite: str(r, "org_website"),
    organizationLogo: str(r, "org_logo"),
    organizationIndustry: str(r, "org_industry"),
    organizationType: str(r, "org_type"),
    organizationLocation: str(r, "org_location"),
    startDate: r["start_date"] ? str(r, "start_date") : null,
    endDate: r["end_date"] ? str(r, "end_date") : null,
    eligibility: str(r, "eligibility"),
    specialization: str(r, "specialization"),
    seoTitle: str(r, "seo_title"),
    seoKeywords: str(r, "seo_keywords"),
    seoDescription: str(r, "seo_description"),
    seoFocusKeyword: str(r, "seo_focus_keyword"),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

export function adminListApplications(jobId?: string, limit = 100) {
  const db = ensure();
  const rows = (
    jobId
      ? db
          .prepare(
            `SELECT a.*, j.title AS job_title, j.slug AS job_slug, u.name AS user_name, u.email AS user_email
             FROM job_applications a
             JOIN jobs j ON j.id = a.job_id
             JOIN users u ON u.id = a.user_id
             WHERE a.job_id = ?
             ORDER BY a.applied_at DESC
             LIMIT ?`,
          )
          .all(jobId, limit)
      : db
          .prepare(
            `SELECT a.*, j.title AS job_title, j.slug AS job_slug, u.name AS user_name, u.email AS user_email
             FROM job_applications a
             JOIN jobs j ON j.id = a.job_id
             JOIN users u ON u.id = a.user_id
             ORDER BY a.applied_at DESC
             LIMIT ?`,
          )
          .all(limit)
  ) as Row[];

  return rows.map((r) => ({
    id: str(r, "id"),
    jobId: str(r, "job_id"),
    jobTitle: str(r, "job_title"),
    jobSlug: str(r, "job_slug"),
    userId: str(r, "user_id"),
    userName: str(r, "user_name"),
    userEmail: str(r, "user_email"),
    resumePath: str(r, "resume_path"),
    coverLetter: str(r, "cover_letter"),
    status: str(r, "status"),
    appliedAt: str(r, "applied_at"),
    updatedAt: str(r, "updated_at"),
  }));
}

export function getJobCategoryIdBySlug(slug: string): string | null {
  const db = ensure();
  const row = db.prepare(`SELECT id FROM job_categories WHERE slug = ?`).get(slug) as
    | { id: string }
    | undefined;
  return row?.id ?? null;
}

export function getJobInternalCategoryId(jobId: string): string | null {
  const db = ensure();
  const row = db.prepare(`SELECT category_id FROM jobs WHERE id = ?`).get(jobId) as
    | { category_id: string | null }
    | undefined;
  return row?.category_id ?? null;
}
