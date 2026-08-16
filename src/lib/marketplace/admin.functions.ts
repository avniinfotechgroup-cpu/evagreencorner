import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/community/auth.server";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureMarketplaceSchema, slugifyMarketplace } from "./schema";

type Row = Record<string, unknown>;

function str(r: Row, key: string, fallback = ""): string {
  const v = r[key];
  if (v == null) return fallback;
  return String(v);
}

export const adminMarketplaceDashboard = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();

    const counts = {
      providers: (
        db.prepare(`SELECT COUNT(*) as c FROM marketplace_providers`).get() as {
          c: number;
        }
      ).c,
      pendingVerification: (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM marketplace_providers
             WHERE verification_status = 'pending'`,
          )
          .get() as { c: number }
      ).c,
      verified: (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM marketplace_providers
             WHERE verification_status = 'verified'`,
          )
          .get() as { c: number }
      ).c,
      leads: (
        db.prepare(`SELECT COUNT(*) as c FROM marketplace_leads`).get() as { c: number }
      ).c,
      newLeads: (
        db
          .prepare(`SELECT COUNT(*) as c FROM marketplace_leads WHERE status = 'new'`)
          .get() as { c: number }
      ).c,
      categories: (
        db.prepare(`SELECT COUNT(*) as c FROM marketplace_categories`).get() as {
          c: number;
        }
      ).c,
    };

    const recentLeads = db
      .prepare(
        `SELECT id, lead_number, name, city, state, status, created_at
         FROM marketplace_leads ORDER BY created_at DESC LIMIT 8`,
      )
      .all() as Row[];

    const pendingProviders = db
      .prepare(
        `SELECT id, business_name, slug, city, state, email, phone, verification_status, created_at
         FROM marketplace_providers
         WHERE verification_status = 'pending'
         ORDER BY created_at DESC LIMIT 8`,
      )
      .all() as Row[];

    return {
      counts,
      recentLeads: recentLeads.map((r) => ({
        id: str(r, "id"),
        leadNumber: str(r, "lead_number"),
        name: str(r, "name"),
        city: str(r, "city"),
        state: str(r, "state"),
        status: str(r, "status"),
        createdAt: str(r, "created_at"),
      })),
      pendingProviders: pendingProviders.map((r) => ({
        id: str(r, "id"),
        businessName: str(r, "business_name"),
        slug: str(r, "slug"),
        city: str(r, "city"),
        state: str(r, "state"),
        email: str(r, "email"),
        phone: str(r, "phone"),
        verificationStatus: str(r, "verification_status"),
        createdAt: str(r, "created_at"),
      })),
    };
  });

export const adminListProviders = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        status: z.string().max(40).optional(),
        verification: z.string().max(40).optional(),
        q: z.string().max(120).optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const page = Math.max(1, data.page ?? 1);
    const limit = Math.min(100, Math.max(1, data.limit ?? 30));
    const offset = (page - 1) * limit;

    const where: string[] = ["1=1"];
    const args: Array<string | number> = [];
    if (data.status) {
      where.push(`status = ?`);
      args.push(data.status);
    }
    if (data.verification) {
      where.push(`verification_status = ?`);
      args.push(data.verification);
    }
    if (data.q?.trim()) {
      where.push(
        `(business_name LIKE ? OR city LIKE ? OR email LIKE ? OR phone LIKE ?)`,
      );
      const q = `%${data.q.trim()}%`;
      args.push(q, q, q, q);
    }
    const whereSql = where.join(" AND ");
    const total = (
      db
        .prepare(`SELECT COUNT(*) as c FROM marketplace_providers WHERE ${whereSql}`)
        .get(...args) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT * FROM marketplace_providers
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset) as Row[];

    return {
      total,
      page,
      limit,
      items: rows.map((r) => ({
        id: str(r, "id"),
        businessName: str(r, "business_name"),
        slug: str(r, "slug"),
        city: str(r, "city"),
        state: str(r, "state"),
        email: str(r, "email"),
        phone: str(r, "phone"),
        status: str(r, "status"),
        verificationStatus: str(r, "verification_status"),
        verifiedAt: r["verified_at"] ? str(r, "verified_at") : null,
        yearsExperience: r["years_experience"] != null ? Number(r["years_experience"]) : null,
        createdAt: str(r, "created_at"),
      })),
    };
  });

export const adminSetProviderVerification = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        providerId: z.string().min(1),
        action: z.enum(["approve", "reject", "suspend"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const ts = new Date().toISOString();

    const existing = db
      .prepare(`SELECT id FROM marketplace_providers WHERE id = ?`)
      .get(data.providerId);
    if (!existing) throw new Error("Provider not found.");

    if (data.action === "approve") {
      db.prepare(
        `UPDATE marketplace_providers
         SET verification_status = 'verified', status = 'active',
             verified_at = ?, updated_at = ?
         WHERE id = ?`,
      ).run(ts, ts, data.providerId);
    } else if (data.action === "reject") {
      db.prepare(
        `UPDATE marketplace_providers
         SET verification_status = 'rejected', status = 'rejected',
             verified_at = NULL, updated_at = ?
         WHERE id = ?`,
      ).run(ts, data.providerId);
    } else {
      db.prepare(
        `UPDATE marketplace_providers
         SET status = 'suspended', verification_status = 'suspended', updated_at = ?
         WHERE id = ?`,
      ).run(ts, data.providerId);
    }

    return { ok: true as const };
  });

export const adminListLeads = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        status: z.string().max(40).optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const page = Math.max(1, data.page ?? 1);
    const limit = Math.min(100, Math.max(1, data.limit ?? 30));
    const offset = (page - 1) * limit;

    const where: string[] = ["1=1"];
    const args: Array<string | number> = [];
    if (data.status) {
      where.push(`l.status = ?`);
      args.push(data.status);
    }
    const whereSql = where.join(" AND ");

    const total = (
      db
        .prepare(`SELECT COUNT(*) as c FROM marketplace_leads l WHERE ${whereSql}`)
        .get(...args) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT l.*, c.name AS category_name,
           (SELECT COUNT(*) FROM marketplace_lead_assignments a WHERE a.lead_id = l.id) AS assign_count
         FROM marketplace_leads l
         LEFT JOIN marketplace_categories c ON c.id = l.category_id
         WHERE ${whereSql}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset) as Row[];

    return {
      total,
      page,
      limit,
      items: rows.map((r) => ({
        id: str(r, "id"),
        leadNumber: str(r, "lead_number"),
        name: str(r, "name"),
        email: str(r, "email"),
        phone: str(r, "phone"),
        city: str(r, "city"),
        state: str(r, "state"),
        pincode: str(r, "pincode"),
        description: str(r, "description"),
        budget: str(r, "budget"),
        status: str(r, "status"),
        source: str(r, "source"),
        categoryName: str(r, "category_name"),
        assignCount: Number(r["assign_count"] ?? 0),
        createdAt: str(r, "created_at"),
      })),
    };
  });

export const adminUpdateLeadStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        leadId: z.string().min(1),
        status: z.enum([
          "new",
          "assigned",
          "in_progress",
          "closed",
          "cancelled",
          "spam",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const ts = new Date().toISOString();
    const existing = db
      .prepare(`SELECT id FROM marketplace_leads WHERE id = ?`)
      .get(data.leadId);
    if (!existing) throw new Error("Lead not found.");
    db.prepare(
      `UPDATE marketplace_leads SET status = ?, updated_at = ? WHERE id = ?`,
    ).run(data.status, ts, data.leadId);
    return { ok: true as const };
  });

export const adminAssignLead = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        leadId: z.string().min(1),
        providerId: z.string().min(1),
        notes: z.string().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const ts = new Date().toISOString();

    const lead = db
      .prepare(`SELECT id FROM marketplace_leads WHERE id = ?`)
      .get(data.leadId);
    if (!lead) throw new Error("Lead not found.");
    const prov = db
      .prepare(`SELECT id FROM marketplace_providers WHERE id = ?`)
      .get(data.providerId);
    if (!prov) throw new Error("Provider not found.");

    db.prepare(
      `INSERT OR IGNORE INTO marketplace_lead_assignments
        (id, lead_id, provider_id, status, assigned_at, notes)
       VALUES (?, ?, ?, 'assigned', ?, ?)`,
    ).run(
      `massign-${newId().slice(0, 10)}`,
      data.leadId,
      data.providerId,
      ts,
      data.notes ?? "Manual admin assignment",
    );

    db.prepare(
      `UPDATE marketplace_leads SET status = 'assigned', updated_at = ? WHERE id = ? AND status = 'new'`,
    ).run(ts, data.leadId);

    return { ok: true as const };
  });

export const adminListCategories = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM marketplace_categories ORDER BY sort_order ASC, name ASC`,
      )
      .all() as Row[];
    return {
      items: rows.map((r) => ({
        id: str(r, "id"),
        name: str(r, "name"),
        slug: str(r, "slug"),
        parentId: r["parent_id"] ? str(r, "parent_id") : null,
        description: str(r, "description"),
        status: str(r, "status"),
        sortOrder: Number(r["sort_order"] ?? 0),
        seoTitle: str(r, "seo_title"),
        seoDescription: str(r, "seo_description"),
      })),
    };
  });

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(1),
        id: z.string().optional(),
        name: z.string().min(1).max(120),
        slug: z.string().max(80).optional(),
        parentId: z.string().nullable().optional(),
        description: z.string().max(1000).optional().default(""),
        status: z.enum(["active", "inactive"]).optional().default("active"),
        sortOrder: z.number().int().optional().default(0),
        seoTitle: z.string().max(160).optional().default(""),
        seoDescription: z.string().max(320).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    ensureMarketplaceSchema();
    const db = getDb();
    const ts = new Date().toISOString();
    const slug = data.slug?.trim() || slugifyMarketplace(data.name);

    if (data.id) {
      db.prepare(
        `UPDATE marketplace_categories
         SET name = ?, slug = ?, parent_id = ?, description = ?, status = ?,
             sort_order = ?, seo_title = ?, seo_description = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        data.name.trim(),
        slug,
        data.parentId ?? null,
        data.description ?? "",
        data.status,
        data.sortOrder ?? 0,
        data.seoTitle ?? "",
        data.seoDescription ?? "",
        ts,
        data.id,
      );
      return { ok: true as const, id: data.id, slug };
    }

    const id = `mcat-${newId().slice(0, 10)}`;
    db.prepare(
      `INSERT INTO marketplace_categories
        (id, name, slug, parent_id, description, icon, image, status, sort_order,
         seo_title, seo_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      data.name.trim(),
      slug,
      data.parentId ?? null,
      data.description ?? "",
      data.status,
      data.sortOrder ?? 0,
      data.seoTitle ?? "",
      data.seoDescription ?? "",
      ts,
      ts,
    );
    return { ok: true as const, id, slug };
  });
