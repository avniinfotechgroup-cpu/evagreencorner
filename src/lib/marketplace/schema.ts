/**
 * Lead Marketplace — SQLite schema (marketplace_* tables in community.sqlite).
 */
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";

export function ensureMarketplaceSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_id TEXT,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_providers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      business_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      provider_type TEXT NOT NULL DEFAULT 'company',
      description TEXT NOT NULL DEFAULT '',
      logo TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      alternate_phone TEXT NOT NULL DEFAULT '',
      gst_number TEXT NOT NULL DEFAULT '',
      registration_number TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      pincode TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      service_radius_km REAL,
      years_experience INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_provider_services (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES marketplace_categories(id),
      service_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      pricing_type TEXT NOT NULL DEFAULT 'quote',
      starting_price REAL,
      price_unit TEXT NOT NULL DEFAULT '',
      availability TEXT NOT NULL DEFAULT 'available',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_provider_locations (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
      state TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      pincode TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      service_radius_km REAL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS marketplace_leads (
      id TEXT PRIMARY KEY,
      lead_number TEXT NOT NULL UNIQUE,
      user_id TEXT,
      category_id TEXT REFERENCES marketplace_categories(id),
      service_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      pincode TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      budget TEXT NOT NULL DEFAULT '',
      preferred_date TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT NOT NULL DEFAULT 'web',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_lead_assignments (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES marketplace_leads(id) ON DELETE CASCADE,
      provider_id TEXT NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'assigned',
      assigned_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE(lead_id, provider_id)
    );

    CREATE TABLE IF NOT EXISTS marketplace_reviews (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
      user_id TEXT,
      lead_id TEXT,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      review TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mkt_cat_slug ON marketplace_categories(slug);
    CREATE INDEX IF NOT EXISTS idx_mkt_cat_status ON marketplace_categories(status);
    CREATE INDEX IF NOT EXISTS idx_mkt_prov_slug ON marketplace_providers(slug);
    CREATE INDEX IF NOT EXISTS idx_mkt_prov_status ON marketplace_providers(status);
    CREATE INDEX IF NOT EXISTS idx_mkt_prov_verify ON marketplace_providers(verification_status);
    CREATE INDEX IF NOT EXISTS idx_mkt_prov_city ON marketplace_providers(city);
    CREATE INDEX IF NOT EXISTS idx_mkt_prov_state ON marketplace_providers(state);
    CREATE INDEX IF NOT EXISTS idx_mkt_svc_provider ON marketplace_provider_services(provider_id);
    CREATE INDEX IF NOT EXISTS idx_mkt_svc_category ON marketplace_provider_services(category_id);
    CREATE INDEX IF NOT EXISTS idx_mkt_loc_provider ON marketplace_provider_locations(provider_id);
    CREATE INDEX IF NOT EXISTS idx_mkt_lead_status ON marketplace_leads(status);
    CREATE INDEX IF NOT EXISTS idx_mkt_lead_number ON marketplace_leads(lead_number);
    CREATE INDEX IF NOT EXISTS idx_mkt_assign_lead ON marketplace_lead_assignments(lead_id);
    CREATE INDEX IF NOT EXISTS idx_mkt_rev_provider ON marketplace_reviews(provider_id);
  `);

  seedCategoriesIfEmpty();
  seedDemoProvidersIfEmpty();
}

function now() {
  return new Date().toISOString();
}

export function slugifyMarketplace(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SeedCat = {
  name: string;
  slug: string;
  description: string;
  sort: number;
  parent?: string;
};

const PARENT_CATEGORIES: SeedCat[] = [
  {
    name: "Solar",
    slug: "solar",
    description: "Rooftop and commercial solar design, installation and O&M across India.",
    sort: 10,
  },
  {
    name: "EV Charging",
    slug: "ev-charging",
    description: "Home, workplace and public EV charger supply and installation.",
    sort: 20,
  },
  {
    name: "Waste Management",
    slug: "waste-management",
    description: "Segregation, recycling and organic waste solutions for homes and campuses.",
    sort: 30,
  },
  {
    name: "Energy Audit",
    slug: "energy-audit",
    description: "Residential and industrial energy audits with actionable savings plans.",
    sort: 40,
  },
  {
    name: "Green Building",
    slug: "green-building",
    description: "Green building consulting, ratings support and sustainable materials.",
    sort: 50,
  },
  {
    name: "Water Solutions",
    slug: "water-solutions",
    description: "Rainwater harvesting, treatment and water-efficiency systems.",
    sort: 60,
  },
  {
    name: "Battery Solutions",
    slug: "battery-solutions",
    description: "Battery energy storage for homes, commercial sites and microgrids.",
    sort: 70,
  },
  {
    name: "Green Consulting",
    slug: "green-consulting",
    description: "ESG, net-zero roadmaps and sustainability advisory for Indian businesses.",
    sort: 80,
  },
];

const CHILD_CATEGORIES: SeedCat[] = [
  {
    name: "Rooftop Solar",
    slug: "rooftop-solar",
    description: "Residential and MSME rooftop solar PV systems.",
    sort: 11,
    parent: "solar",
  },
  {
    name: "Commercial Solar",
    slug: "commercial-solar",
    description: "Factory, warehouse and campus solar plants.",
    sort: 12,
    parent: "solar",
  },
  {
    name: "Solar O&M",
    slug: "solar-om",
    description: "Operations, cleaning and performance monitoring.",
    sort: 13,
    parent: "solar",
  },
  {
    name: "Home EV Charger",
    slug: "home-ev-charger",
    description: "AC wallbox installation for apartments and villas.",
    sort: 21,
    parent: "ev-charging",
  },
  {
    name: "Workplace Charging",
    slug: "workplace-charging",
    description: "Office and fleet charging infrastructure.",
    sort: 22,
    parent: "ev-charging",
  },
  {
    name: "DC Fast Charging",
    slug: "dc-fast-charging",
    description: "Public and highway DC fast charger projects.",
    sort: 23,
    parent: "ev-charging",
  },
  {
    name: "Organic Waste",
    slug: "organic-waste",
    description: "Composting and biogas for organic waste streams.",
    sort: 31,
    parent: "waste-management",
  },
  {
    name: "Recycling Pickup",
    slug: "recycling-pickup",
    description: "Dry waste collection and recycling partnerships.",
    sort: 32,
    parent: "waste-management",
  },
  {
    name: "E-Waste",
    slug: "e-waste",
    description: "Authorized e-waste collection and disposal.",
    sort: 33,
    parent: "waste-management",
  },
  {
    name: "Home Energy Audit",
    slug: "home-energy-audit",
    description: "Appliance and billing review for households.",
    sort: 41,
    parent: "energy-audit",
  },
  {
    name: "Industrial Energy Audit",
    slug: "industrial-energy-audit",
    description: "BEE-style audits for factories and large loads.",
    sort: 42,
    parent: "energy-audit",
  },
  {
    name: "IGBC / GRIHA Support",
    slug: "igbc-griha-support",
    description: "Certification facilitation for green buildings.",
    sort: 51,
    parent: "green-building",
  },
  {
    name: "Passive Design",
    slug: "passive-design",
    description: "Daylighting, insulation and climate-responsive design.",
    sort: 52,
    parent: "green-building",
  },
  {
    name: "Rainwater Harvesting",
    slug: "rainwater-harvesting",
    description: "RWH design and recharge systems.",
    sort: 61,
    parent: "water-solutions",
  },
  {
    name: "Greywater Reuse",
    slug: "greywater-reuse",
    description: "Greywater treatment for landscaping and flushing.",
    sort: 62,
    parent: "water-solutions",
  },
  {
    name: "Home Battery Storage",
    slug: "home-battery-storage",
    description: "Lithium storage paired with solar or grid backup.",
    sort: 71,
    parent: "battery-solutions",
  },
  {
    name: "Commercial BESS",
    slug: "commercial-bess",
    description: "Battery energy storage for peak shaving and backup.",
    sort: 72,
    parent: "battery-solutions",
  },
  {
    name: "Net-Zero Roadmap",
    slug: "net-zero-roadmap",
    description: "Corporate net-zero and decarbonisation plans.",
    sort: 81,
    parent: "green-consulting",
  },
  {
    name: "ESG Reporting",
    slug: "esg-reporting",
    description: "ESG disclosure and sustainability reporting support.",
    sort: 82,
    parent: "green-consulting",
  },
];

function seedCategoriesIfEmpty() {
  const db = getDb();
  const count = (
    db.prepare(`SELECT COUNT(*) as c FROM marketplace_categories`).get() as { c: number }
  ).c;
  if (count > 0) return;

  const ts = now();
  const all = [...PARENT_CATEGORIES, ...CHILD_CATEGORIES];
  const ids = new Map<string, string>();
  for (const c of all) {
    ids.set(c.slug, `mcat-${newId().slice(0, 10)}`);
  }

  const insert = db.prepare(`
    INSERT INTO marketplace_categories
      (id, name, slug, parent_id, description, icon, image, status, sort_order,
       seo_title, seo_description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '', '', 'active', ?, ?, ?, ?, ?)
  `);

  for (const c of all) {
    const id = ids.get(c.slug)!;
    const parentId = c.parent ? ids.get(c.parent) ?? null : null;
    insert.run(
      id,
      c.name,
      c.slug,
      parentId,
      c.description,
      c.sort,
      `${c.name} services in India | EVA Green Corner`,
      c.description,
      ts,
      ts,
    );
  }
}

function seedDemoProvidersIfEmpty() {
  const db = getDb();
  const count = (
    db.prepare(`SELECT COUNT(*) as c FROM marketplace_providers`).get() as { c: number }
  ).c;
  if (count > 0) return;

  const ts = now();
  const catBySlug = (slug: string) => {
    const row = db
      .prepare(`SELECT id FROM marketplace_categories WHERE slug = ?`)
      .get(slug) as { id: string } | undefined;
    return row?.id ?? null;
  };

  const demos = [
    {
      business: "SuryaPath Solar Solutions",
      slug: "suryapath-solar-solutions",
      type: "company",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      lat: 18.5204,
      lng: 73.8567,
      radius: 80,
      years: 8,
      website: "https://example.com/suryapath-demo",
      email: "demo-suryapath@example.com",
      phone: "9000000001",
      description:
        "[DEMO SEED DATA] Fictional Pune-based rooftop and commercial solar installer for marketplace UI testing. Not a real business.",
      services: [
        {
          cat: "rooftop-solar",
          name: "Residential rooftop solar",
          pricing: "starting",
          price: 65000,
          unit: "per kW",
        },
        {
          cat: "commercial-solar",
          name: "Commercial solar EPC",
          pricing: "quote",
          price: null,
          unit: "",
        },
      ],
      locations: [
        { city: "Pune", state: "Maharashtra", pincode: "411001", lat: 18.5204, lng: 73.8567, r: 80 },
        { city: "Mumbai", state: "Maharashtra", pincode: "400001", lat: 19.076, lng: 72.8777, r: 40 },
      ],
    },
    {
      business: "ChargeNest Mobility",
      slug: "chargenest-mobility",
      type: "company",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      lat: 12.9716,
      lng: 77.5946,
      radius: 60,
      years: 5,
      website: "https://example.com/chargenest-demo",
      email: "demo-chargenest@example.com",
      phone: "9000000002",
      description:
        "[DEMO SEED DATA] Fictional Bengaluru EV charging installer for marketplace demos. Not a real business.",
      services: [
        {
          cat: "home-ev-charger",
          name: "Home AC charger install",
          pricing: "starting",
          price: 18000,
          unit: "per point",
        },
        {
          cat: "workplace-charging",
          name: "Workplace charging kit",
          pricing: "quote",
          price: null,
          unit: "",
        },
      ],
      locations: [
        {
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          lat: 12.9716,
          lng: 77.5946,
          r: 60,
        },
      ],
    },
    {
      business: "JalDhar Harvest Systems",
      slug: "jaldhar-harvest-systems",
      type: "company",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380001",
      lat: 23.0225,
      lng: 72.5714,
      radius: 100,
      years: 10,
      website: "https://example.com/jaldhar-demo",
      email: "demo-jaldhar@example.com",
      phone: "9000000003",
      description:
        "[DEMO SEED DATA] Fictional Ahmedabad rainwater and greywater specialist for marketplace demos. Not a real business.",
      services: [
        {
          cat: "rainwater-harvesting",
          name: "Rainwater harvesting design",
          pricing: "starting",
          price: 35000,
          unit: "per site",
        },
        {
          cat: "greywater-reuse",
          name: "Greywater reuse system",
          pricing: "quote",
          price: null,
          unit: "",
        },
      ],
      locations: [
        {
          city: "Ahmedabad",
          state: "Gujarat",
          pincode: "380001",
          lat: 23.0225,
          lng: 72.5714,
          r: 100,
        },
      ],
    },
  ];

  const insertProv = db.prepare(`
    INSERT INTO marketplace_providers
      (id, user_id, business_name, slug, provider_type, description, logo, website,
       email, phone, alternate_phone, gst_number, registration_number, address,
       city, state, pincode, latitude, longitude, service_radius_km, years_experience,
       status, verification_status, verified_at, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, '', ?, ?, ?, '', '', '', '', ?, ?, ?, ?, ?, ?, ?,
            'active', 'verified', ?, ?, ?)
  `);

  const insertSvc = db.prepare(`
    INSERT INTO marketplace_provider_services
      (id, provider_id, category_id, service_name, description, pricing_type,
       starting_price, price_unit, availability, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, '', ?, ?, ?, 'available', 'active', ?, ?)
  `);

  const insertLoc = db.prepare(`
    INSERT INTO marketplace_provider_locations
      (id, provider_id, state, city, area, pincode, latitude, longitude, service_radius_km, status)
    VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, 'active')
  `);

  for (const d of demos) {
    const pid = `mprov-${newId().slice(0, 10)}`;
    insertProv.run(
      pid,
      d.business,
      d.slug,
      d.type,
      d.description,
      d.website,
      d.email,
      d.phone,
      d.city,
      d.state,
      d.pincode,
      d.lat,
      d.lng,
      d.radius,
      d.years,
      ts,
      ts,
      ts,
    );

    for (const s of d.services) {
      const catId = catBySlug(s.cat);
      if (!catId) continue;
      insertSvc.run(
        `msvc-${newId().slice(0, 10)}`,
        pid,
        catId,
        s.name,
        s.pricing,
        s.price,
        s.unit,
        ts,
        ts,
      );
    }

    for (const loc of d.locations) {
      insertLoc.run(
        `mloc-${newId().slice(0, 10)}`,
        pid,
        loc.state,
        loc.city,
        loc.pincode,
        loc.lat,
        loc.lng,
        loc.r,
      );
    }
  }
}
