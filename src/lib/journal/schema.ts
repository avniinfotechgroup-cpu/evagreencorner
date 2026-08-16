/**
 * Environment Journal — SQLite schema (namespaced).
 */
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";

export {
  JOURNAL_POST_STATUSES,
  JOURNAL_CONTENT_TYPES,
  JOURNAL_POLICY_STATUSES,
} from "./constants";

export function ensureJournalSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      category_id TEXT REFERENCES journal_categories(id),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      featured_image TEXT NOT NULL DEFAULT '',
      image_alt TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      reading_time INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      updated_at TEXT NOT NULL,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      seo_focus_keyword TEXT NOT NULL DEFAULT '',
      canonical_url TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0,
      source_type TEXT NOT NULL DEFAULT 'editorial',
      content_type TEXT NOT NULL DEFAULT 'explainer',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_sources (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES journal_posts(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      publisher TEXT NOT NULL DEFAULT '',
      accessed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS journal_policies (
      id TEXT PRIMARY KEY,
      post_id TEXT REFERENCES journal_posts(id) ON DELETE SET NULL,
      policy_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      authority TEXT NOT NULL DEFAULT '',
      policy_type TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'India',
      state TEXT NOT NULL DEFAULT '',
      announcement_date TEXT,
      effective_date TEXT,
      status TEXT NOT NULL DEFAULT 'announced',
      summary TEXT NOT NULL DEFAULT '',
      official_source TEXT NOT NULL DEFAULT '',
      document_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jpost_slug ON journal_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_jpost_status ON journal_posts(status);
    CREATE INDEX IF NOT EXISTS idx_jpost_published ON journal_posts(published_at);
    CREATE INDEX IF NOT EXISTS idx_jpost_cat ON journal_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_jpost_featured ON journal_posts(featured);
    CREATE INDEX IF NOT EXISTS idx_jcat_slug ON journal_categories(slug);
    CREATE INDEX IF NOT EXISTS idx_jsrc_post ON journal_sources(post_id);
    CREATE INDEX IF NOT EXISTS idx_jpol_slug ON journal_policies(slug);
    CREATE INDEX IF NOT EXISTS idx_jpol_status ON journal_policies(status);
  `);

  migrateJournalSeoColumns();
  seedCategoriesIfEmpty();
  seedDemoContentIfEmpty();
}

function migrateJournalSeoColumns() {
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(journal_posts)`).all() as Array<{ name: string }>;
  const have = new Set(cols.map((c) => c.name));
  const add = (name: string, ddl: string) => {
    if (!have.has(name)) db.exec(`ALTER TABLE journal_posts ADD COLUMN ${ddl}`);
  };
  add("seo_title", `seo_title TEXT NOT NULL DEFAULT ''`);
  add("seo_keywords", `seo_keywords TEXT NOT NULL DEFAULT ''`);
  add("seo_description", `seo_description TEXT NOT NULL DEFAULT ''`);
  add("seo_focus_keyword", `seo_focus_keyword TEXT NOT NULL DEFAULT ''`);
  add("canonical_url", `canonical_url TEXT NOT NULL DEFAULT ''`);
}

function now() {
  return new Date().toISOString();
}

export function slugifyJournal(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SEED_CATEGORIES: Array<{ name: string; slug: string; description: string; sort: number }> = [
  { name: "Climate", slug: "climate", description: "Climate science and adaptation explainers.", sort: 10 },
  { name: "Environment", slug: "environment", description: "Broader environmental topics.", sort: 20 },
  { name: "Energy", slug: "energy", description: "Power systems and clean energy.", sort: 30 },
  { name: "EV & Mobility", slug: "ev-mobility", description: "Electric vehicles and transport.", sort: 40 },
  { name: "Renewable Energy", slug: "renewable-energy", description: "Solar, wind and other renewables.", sort: 50 },
  { name: "Sustainability", slug: "sustainability", description: "Practical sustainability guidance.", sort: 60 },
  { name: "Waste", slug: "waste", description: "Waste reduction and recycling.", sort: 70 },
  { name: "Water", slug: "water", description: "Water use, quality and conservation.", sort: 80 },
  { name: "Air Quality", slug: "air-quality", description: "AQI, pollution and health.", sort: 90 },
  { name: "Policy", slug: "policy", description: "Environmental and energy policy.", sort: 100 },
  { name: "Research", slug: "research", description: "Research summaries and methods.", sort: 110 },
  { name: "Green Technology", slug: "green-technology", description: "Clean tech and innovation.", sort: 120 },
  { name: "Circular Economy", slug: "circular-economy", description: "Reuse and circular systems.", sort: 130 },
  { name: "Green Living", slug: "green-living", description: "Everyday green living tips.", sort: 140 },
];

function seedCategoriesIfEmpty() {
  const db = getDb();
  const count = (
    db.prepare(`SELECT COUNT(*) as c FROM journal_categories`).get() as { c: number }
  ).c;
  if (count > 0) return;

  const ts = now();
  for (const c of SEED_CATEGORIES) {
    db.prepare(
      `INSERT INTO journal_categories
        (id, name, slug, description, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).run(`jcat-${newId().slice(0, 10)}`, c.name, c.slug, c.description, c.sort, ts, ts);
  }
}

function seedDemoContentIfEmpty() {
  const db = getDb();
  const count = (db.prepare(`SELECT COUNT(*) as c FROM journal_posts`).get() as { c: number }).c;
  if (count > 0) return;

  const ts = now();
  const catId = (slug: string) => {
    const row = db.prepare(`SELECT id FROM journal_categories WHERE slug = ?`).get(slug) as
      | { id: string }
      | undefined;
    return row?.id ?? null;
  };

  const articles: Array<{
    title: string;
    slug: string;
    categorySlug: string;
    excerpt: string;
    content: string;
    contentType: string;
    readingTime: number;
    featured: boolean;
    sources: Array<{ title: string; url: string; publisher: string }>;
  }> = [
    {
      title: "How to Read an EV Range Claim (Without the Hype)",
      slug: "how-to-read-ev-range-claim",
      categorySlug: "ev-mobility",
      excerpt:
        "Claimed range figures use standardised test cycles. Here is how to interpret MIDC and IDC numbers for Indian buyers — without treating them as guaranteed real-world km.",
      content: `Electric vehicle listings often lead with a single kilometre number. That figure usually comes from a regulated test cycle, not from your commute.

In India, passenger car claims commonly reference MIDC (Modified Indian Driving Cycle). Two-wheeler claims often reference IDC. These cycles control speed profiles, temperature assumptions and accessory loads in ways that differ from stop-go traffic, monsoon air-conditioning, hills and payload.

A practical way to use claimed range:
1. Treat it as a comparable lab score, not a promise.
2. Ask which cycle and which battery pack or variant the number applies to.
3. Expect lower real-world range in heat with AC, high speed highways, or heavy loads.
4. Prefer manufacturer documentation over marketplace blurbs when deciding.

This article is educational. Always confirm current specifications on the OEM site before purchase decisions.`,
      contentType: "guide",
      readingTime: 6,
      featured: true,
      sources: [
        {
          title: "Automotive industry test-cycle context (general reference)",
          url: "https://www.araiindia.com/",
          publisher: "ARAI (verify current guidance)",
        },
        {
          title: "EVA Green Corner EV catalogue notes on claimed vs real-world range",
          url: "/ev",
          publisher: "EVA Green Corner",
        },
      ],
    },
    {
      title: "Rooftop Solar Basics for Indian Homes",
      slug: "rooftop-solar-basics-indian-homes",
      categorySlug: "renewable-energy",
      excerpt:
        "A plain-language explainer of net metering concepts, shade, roof orientation and why installer quotes differ — without inventing subsidy amounts.",
      content: `Rooftop solar turns unused roof area into on-site generation. Outcomes depend on shade, orientation, inverter quality, local utility interconnection rules and how you use electricity through the day.

Key ideas for homeowners:
- Shade from trees, parapets or neighbouring buildings can cut production more than a brochure suggests.
- South-facing roofs in India often perform well, but east-west layouts can still be useful depending on load timing.
- Net metering and billing settlement rules vary by state and DISCOM; treat marketing claims as starting points and verify with your utility circulars.
- Quotes differ because of module tier, structure, warranties, monitoring and after-sales coverage — compare like-for-like.

Subsidy and incentive programmes change. Check the latest Ministry of New and Renewable Energy (MNRE) and state nodal agency notices rather than relying on outdated articles.

Use EVA Green Corner’s solar calculator for rough sizing intuition, then get site surveys from licensed installers.`,
      contentType: "explainer",
      readingTime: 7,
      featured: true,
      sources: [
        {
          title: "Ministry of New and Renewable Energy",
          url: "https://mnre.gov.in/",
          publisher: "MNRE, Government of India",
        },
        {
          title: "EVA Green Corner Solar Calculator",
          url: "/solar-calculator",
          publisher: "EVA Green Corner",
        },
      ],
    },
    {
      title: "What “Circular Economy” Means for Everyday Products",
      slug: "circular-economy-everyday-products",
      categorySlug: "circular-economy",
      excerpt:
        "Reuse, repair and material recovery are practical design goals — not buzzwords. A short educational overview for readers new to circular systems.",
      content: `A circular economy aims to keep materials in use longer through better design, reuse, repair, remanufacturing and recycling — reducing the need to extract virgin resources for every new product.

For everyday products, that can look like:
- Modular devices that are easier to repair
- Take-back schemes for batteries and electronics
- Packaging designed for collection and reprocessing
- Business models that sell service or durability instead of disposable volume

Circular systems still need energy, logistics and careful handling of hazardous materials (for example battery chemistry). Recycling is only one loop; prevention and reuse often rank higher in the waste hierarchy.

This piece does not claim national recycling rates or forecast market sizes. For policy detail, read official ministry notifications and standards bodies.`,
      contentType: "explainer",
      readingTime: 5,
      featured: false,
      sources: [
        {
          title: "Ellen MacArthur Foundation — circular economy overview",
          url: "https://www.ellenmacarthurfoundation.org/topics/circular-economy-introduction/overview",
          publisher: "Ellen MacArthur Foundation",
        },
      ],
    },
  ];

  const postIds: string[] = [];
  for (const a of articles) {
    const id = `jpost-${newId().slice(0, 12)}`;
    postIds.push(id);
    db.prepare(
      `INSERT INTO journal_posts
        (id, author_id, category_id, title, slug, excerpt, content, featured_image, image_alt,
         author_name, reading_time, status, published_at, updated_at, seo_title, seo_keywords,
         seo_description, seo_focus_keyword, canonical_url, featured, source_type, content_type,
         created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, '', '', 'EVA Green Corner Editorial', ?, 'published', ?, ?, ?, '', ?, '', '', ?, 'editorial', ?, ?)`,
    ).run(
      id,
      catId(a.categorySlug),
      a.title,
      a.slug,
      a.excerpt,
      a.content,
      a.readingTime,
      ts,
      ts,
      a.title,
      a.excerpt,
      a.featured ? 1 : 0,
      a.contentType,
      ts,
    );

    for (const s of a.sources) {
      db.prepare(
        `INSERT INTO journal_sources (id, post_id, title, url, publisher, accessed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(`jsrc-${newId().slice(0, 10)}`, id, s.title, s.url, s.publisher, ts.slice(0, 10));
    }
  }

  // FAME II policy summary — verify against ministry site before citing as current law.
  const policyPostId = postIds[0] ?? null;
  db.prepare(
    `INSERT INTO journal_policies
      (id, post_id, policy_name, slug, authority, policy_type, country, state,
       announcement_date, effective_date, status, summary, official_source, document_url,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'India', '', ?, ?, 'active', ?, ?, ?, ?, ?)`,
  ).run(
    `jpol-${newId().slice(0, 12)}`,
    policyPostId,
    "FAME India Scheme Phase II (overview)",
    "fame-ii-overview",
    "Ministry of Heavy Industries",
    "incentive-scheme",
    "2019-03-08",
    null,
    `FAME II (Faster Adoption and Manufacturing of Electric Vehicles in India — Phase II) is a Government of India scheme historically used to support electric mobility through demand incentives and charging infrastructure support, subject to eligibility rules and notifications over time.

This journal entry is an educational summary only. Scheme windows, eligible vehicle categories, incentive amounts and operational guidelines change. Always verify the latest status, notifications and FAQs on the Ministry of Heavy Industries / official FAME portal before making purchasing or business decisions.

Placeholder official source URL — replace with the live ministry page after verification.`,
    "https://heavyindustries.gov.in/ (verify current FAME / EV scheme pages on the official ministry site)",
    "https://heavyindustries.gov.in/",
    ts,
    ts,
  );
}
