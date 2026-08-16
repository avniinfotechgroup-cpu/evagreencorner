/**
 * Green Jobs & Internships — SQLite schema (namespaced).
 */
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { JOB_CATEGORY_OPTIONS } from "./constants";

export {
  JOB_STATUSES,
  JOB_TYPES,
  REMOTE_TYPES,
  JOB_TYPE_LABEL,
  REMOTE_LABEL,
  JOB_CATEGORY_OPTIONS,
  INDIA_STATES,
} from "./constants";

export function ensureJobsSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      organization_type TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES job_organizations(id),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      job_type TEXT NOT NULL DEFAULT 'full_time',
      category_id TEXT REFERENCES job_categories(id),
      description TEXT NOT NULL DEFAULT '',
      responsibilities TEXT NOT NULL DEFAULT '',
      requirements TEXT NOT NULL DEFAULT '',
      qualification TEXT NOT NULL DEFAULT '',
      experience_min INTEGER,
      experience_max INTEGER,
      salary_min REAL,
      salary_max REAL,
      salary_type TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'India',
      remote_type TEXT NOT NULL DEFAULT 'onsite',
      skills TEXT NOT NULL DEFAULT '',
      application_url TEXT NOT NULL DEFAULT '',
      application_email TEXT NOT NULL DEFAULT '',
      deadline TEXT,
      posted_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      featured INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      duration_months INTEGER,
      stipend_monthly REAL,
      start_date TEXT,
      end_date TEXT,
      mode TEXT NOT NULL DEFAULT '',
      eligibility TEXT NOT NULL DEFAULT '',
      specialization TEXT NOT NULL DEFAULT '',
      certificate_offered INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      seo_focus_keyword TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resume_path TEXT NOT NULL DEFAULT '',
      cover_letter TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted',
      applied_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(job_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS job_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keywords TEXT NOT NULL DEFAULT '',
      category_id TEXT REFERENCES job_categories(id),
      location TEXT NOT NULL DEFAULT '',
      job_type TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'weekly',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_slug ON jobs(slug);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
    CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_cat ON jobs(category_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
    CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(featured);
    CREATE INDEX IF NOT EXISTS idx_job_cat_slug ON job_categories(slug);
    CREATE INDEX IF NOT EXISTS idx_job_org_slug ON job_organizations(slug);
    CREATE INDEX IF NOT EXISTS idx_job_app_job ON job_applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_app_user ON job_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_alert_user ON job_alerts(user_id);
  `);

  migrateJobsSeoColumns();
  seedCategoriesIfEmpty();
  seedDemoJobsIfEmpty();
}

function migrateJobsSeoColumns() {
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(jobs)`).all() as Array<{ name: string }>;
  const have = new Set(cols.map((c) => c.name));
  const add = (name: string, ddl: string) => {
    if (!have.has(name)) db.exec(`ALTER TABLE jobs ADD COLUMN ${ddl}`);
  };
  add("seo_title", `seo_title TEXT NOT NULL DEFAULT ''`);
  add("seo_keywords", `seo_keywords TEXT NOT NULL DEFAULT ''`);
  add("seo_description", `seo_description TEXT NOT NULL DEFAULT ''`);
  add("seo_focus_keyword", `seo_focus_keyword TEXT NOT NULL DEFAULT ''`);
}

function now() {
  return new Date().toISOString();
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/** Mark published jobs past their deadline as expired. */
export function expireDueJobs() {
  const db = getDb();
  const today = todayDateOnly();
  db.prepare(
    `UPDATE jobs
     SET status = 'expired', updated_at = ?
     WHERE status = 'published'
       AND deadline IS NOT NULL
       AND deadline != ''
       AND deadline < ?`,
  ).run(now(), today);
}

export function slugifyJob(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SEED_CATEGORIES = JOB_CATEGORY_OPTIONS;

function seedCategoriesIfEmpty() {
  const db = getDb();
  const count = (db.prepare(`SELECT COUNT(*) as c FROM job_categories`).get() as { c: number }).c;
  if (count > 0) return;

  const ts = now();
  for (const c of SEED_CATEGORIES) {
    db.prepare(
      `INSERT INTO job_categories
        (id, name, slug, description, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).run(`jcat-${newId().slice(0, 10)}`, c.name, c.slug, c.description, c.sort, ts, ts);
  }
}

function seedDemoJobsIfEmpty() {
  const db = getDb();
  const count = (db.prepare(`SELECT COUNT(*) as c FROM jobs`).get() as { c: number }).c;
  if (count > 0) return;

  try {
    const ts = now();
    const existingOrg = db
      .prepare(`SELECT id FROM job_organizations WHERE slug = ?`)
      .get("greenpath-demo-org") as { id: string } | undefined;
    let orgId = existingOrg?.id;
    if (!orgId) {
      orgId = `jorg-${newId().slice(0, 10)}`;
      db.prepare(
        `INSERT INTO job_organizations
          (id, name, slug, logo, description, website, industry, organization_type, location,
           verified, status, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, 0, 'active', ?, ?)`,
      ).run(
        orgId,
        "GreenPath Demo Org",
        "greenpath-demo-org",
        "Demo employer used to seed sample green career listings on EVA Green Corner. Not a real hiring company.",
        "https://evagreencorner.com",
        "Climate Tech",
        "startup",
        "Bengaluru, Karnataka",
        ts,
        ts,
      );
    }

  const cat = (slug: string) =>
    db.prepare(`SELECT id FROM job_categories WHERE slug = ?`).get(slug) as
      | { id: string }
      | undefined;

  const samples: Array<{
    title: string;
    slug: string;
    jobType: string;
    categorySlug: string;
    description: string;
    responsibilities: string;
    requirements: string;
    qualification: string;
    experienceMin: number | null;
    experienceMax: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryType: string;
    location: string;
    city: string;
    state: string;
    remoteType: string;
    skills: string;
    featured: boolean;
    internship?: {
      durationMonths: number;
      stipendMonthly: number | null;
      mode: string;
      eligibility: string;
      specialization: string;
      certificate: boolean;
    };
  }> = [
    {
      title: "Solar Project Engineer (Demo)",
      slug: "solar-project-engineer-demo",
      jobType: "full_time",
      categorySlug: "solar",
      description:
        "Demo listing: support design and site coordination for rooftop and small commercial solar projects in India. This is sample seed data — not a live vacancy.",
      responsibilities:
        "Prepare basic layout notes, coordinate with installers, track project milestones, and document as-built changes for internal review.",
      requirements:
        "Familiarity with PV basics, AutoCAD or similar, and willingness to visit sites. Prefer prior internship or project experience in solar.",
      qualification: "B.E. / B.Tech in Electrical, Mechanical, or related field (or equivalent experience).",
      experienceMin: 1,
      experienceMax: 4,
      salaryMin: null,
      salaryMax: null,
      salaryType: "",
      location: "Bengaluru, Karnataka",
      city: "Bengaluru",
      state: "Karnataka",
      remoteType: "hybrid",
      skills: "PV design, AutoCAD, site surveys, stakeholder coordination",
      featured: true,
    },
    {
      title: "EV Charging Network Analyst (Demo)",
      slug: "ev-charging-network-analyst-demo",
      jobType: "full_time",
      categorySlug: "ev-mobility",
      description:
        "Demo listing: analyse public charger utilisation patterns and help prioritise network expansion. Seed content for EVA Green Corner Jobs module.",
      responsibilities:
        "Clean utilisation datasets, build simple dashboards, and summarise findings for operations leads.",
      requirements:
        "Comfortable with spreadsheets or basic SQL/Python. Interest in EV charging infrastructure.",
      qualification: "Bachelor's in Engineering, Data, or related discipline.",
      experienceMin: 0,
      experienceMax: 3,
      salaryMin: null,
      salaryMax: null,
      salaryType: "",
      location: "Pune, Maharashtra",
      city: "Pune",
      state: "Maharashtra",
      remoteType: "onsite",
      skills: "Excel, SQL basics, GIS interest, EV charging",
      featured: true,
    },
    {
      title: "ESG Reporting Associate (Demo)",
      slug: "esg-reporting-associate-demo",
      jobType: "contract",
      categorySlug: "esg",
      description:
        "Demo contract role: support ESG data collection and draft sections of sustainability disclosures. Not a verified live opening.",
      responsibilities:
        "Gather emissions and social metrics from internal owners, maintain evidence folders, and draft narrative text for review.",
      requirements:
        "Understanding of GHG Protocol concepts or GRI basics is a plus. Strong writing and organisation skills.",
      qualification: "Graduate in Environment, Sustainability, Finance, or related field.",
      experienceMin: 1,
      experienceMax: 5,
      salaryMin: null,
      salaryMax: null,
      salaryType: "",
      location: "Mumbai, Maharashtra",
      city: "Mumbai",
      state: "Maharashtra",
      remoteType: "hybrid",
      skills: "ESG frameworks, writing, data collection, Excel",
      featured: false,
    },
    {
      title: "Climate Policy Research Intern (Demo)",
      slug: "climate-policy-research-intern-demo",
      jobType: "internship",
      categorySlug: "environmental-policy",
      description:
        "Demo internship: literature reviews and short briefs on Indian climate and energy policy. Sample seed for campus programmes — not a live application.",
      responsibilities:
        "Summarise official policy documents, maintain a source bibliography, and draft 1–2 page briefs for mentors.",
      requirements:
        "Strong reading and citation habits. Interest in energy transition or environmental governance.",
      qualification: "Currently enrolled in Master's or final-year Bachelor's in related fields.",
      experienceMin: 0,
      experienceMax: 1,
      salaryMin: null,
      salaryMax: null,
      salaryType: "",
      location: "New Delhi, Delhi",
      city: "New Delhi",
      state: "Delhi",
      remoteType: "remote",
      skills: "Policy research, writing, citations, climate literacy",
      featured: true,
      internship: {
        durationMonths: 3,
        stipendMonthly: null,
        mode: "remote",
        eligibility: "Students enrolled in recognised Indian universities; strong writing sample preferred.",
        specialization: "Climate & energy policy",
        certificate: true,
      },
    },
  ];

  for (const s of samples) {
    const catRow = cat(s.categorySlug);
    const id = `job-${newId().slice(0, 12)}`;
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 2);
    const deadlineStr = deadline.toISOString().slice(0, 10);

    db.prepare(
      `INSERT INTO jobs
        (id, organization_id, title, slug, job_type, category_id, description, responsibilities,
         requirements, qualification, experience_min, experience_max, salary_min, salary_max,
         salary_type, location, city, state, country, remote_type, skills, application_url,
         application_email, deadline, posted_at, status, featured, source, source_url, verified,
         duration_months, stipend_monthly, start_date, end_date, mode, eligibility, specialization,
         certificate_offered, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', ?, ?, '',
               'jobs-demo@evagreencorner.com', ?, ?, 'published', ?, 'demo-seed', '', 0,
               ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      orgId,
      s.title,
      s.slug,
      s.jobType,
      catRow?.id ?? null,
      s.description,
      s.responsibilities,
      s.requirements,
      s.qualification,
      s.experienceMin,
      s.experienceMax,
      s.salaryMin,
      s.salaryMax,
      s.salaryType,
      s.location,
      s.city,
      s.state,
      s.remoteType,
      s.skills,
      deadlineStr,
      ts,
      s.featured ? 1 : 0,
      s.internship?.durationMonths ?? null,
      s.internship?.stipendMonthly ?? null,
      s.internship?.mode ?? "",
      s.internship?.eligibility ?? "",
      s.internship?.specialization ?? "",
      s.internship?.certificate ? 1 : 0,
      ts,
      ts,
    );
  }
  } catch (err) {
    console.error("[jobs] demo seed skipped:", err instanceof Error ? err.message : err);
  }
}
