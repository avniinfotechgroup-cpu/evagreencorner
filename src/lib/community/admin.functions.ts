import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./auth.server";
import {
  deleteCuratedStation,
  deleteCuratedStationsBulk,
  insertCuratedStation,
  listCuratedStations,
  setCuratedActive,
} from "./curated-stations";
import { getDb } from "./db";

const stationInputSchema = z.object({
  name: z.string().min(2).max(200),
  operator: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  area: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  pincode: z.string().max(12).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  connectors: z.string().max(200).optional(),
  maxPowerKw: z.coerce.number().min(0).max(1000).optional().nullable(),
  pricePerKwh: z.coerce.number().min(0).max(200).optional().nullable(),
  totalPoints: z.coerce.number().int().min(1).max(100).optional(),
  open24: z.boolean().optional(),
  openingHours: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  batterySwap: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c.length)) rows.push(row);
  return rows;
}

function headerKey(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function num(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export const adminGetDashboard = createServerFn({ method: "GET" })
  .validator((input) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const admin = requireAdmin(data.token);
    const stations = listCuratedStations(300);
    const db = getDb();
    const redeems = db
      .prepare(
        `SELECT r.id, r.credits, r.cash_inr, r.upi_id, r.status, r.created_at,
                u.name as user_name, u.email as user_email
         FROM redeem_requests r
         JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC
         LIMIT 50`,
      )
      .all() as Array<{
      id: string;
      credits: number;
      cash_inr: number;
      upi_id: string;
      status: string;
      created_at: string;
      user_name: string;
      user_email: string;
    }>;

    const stats = {
      curatedStations: stations.length,
      activeStations: stations.filter((s) => s.active).length,
      pendingRedeems: redeems.filter((r) => r.status === "pending").length,
      totalReviews: (
        db.prepare(`SELECT COUNT(*) as c FROM reviews`).get() as { c: number }
      ).c,
    };

    return { admin, stations, redeems, stats };
  });

export const adminAddStation = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        station: stationInputSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const id = insertCuratedStation({
      name: data.station.name,
      operator: data.station.operator,
      address: data.station.address,
      area: data.station.area,
      city: data.station.city,
      state: data.station.state,
      pincode: data.station.pincode,
      lat: data.station.lat,
      lng: data.station.lng,
      connectors: data.station.connectors,
      maxPowerKw: data.station.maxPowerKw ?? null,
      pricePerKwh: data.station.pricePerKwh ?? null,
      totalPoints: data.station.totalPoints,
      open24: data.station.open24,
      openingHours: data.station.openingHours ?? null,
      phone: data.station.phone ?? null,
      website: data.station.website ?? null,
      batterySwap: data.station.batterySwap,
      notes: data.station.notes ?? null,
    });
    return { ok: true as const, id };
  });

export const adminImportStationsCsv = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        csvText: z.string().min(10).max(5_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const rows = parseCsv(data.csvText.replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw new Error("CSV needs a header row + at least 1 data row.");

    const headers = rows[0]!.map(headerKey);
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = headers.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };

    const iName = idx(["name", "stationname", "station"]);
    const iLat = idx(["lat", "latitude"]);
    const iLng = idx(["lng", "lon", "long", "longitude"]);
    if (iName < 0 || iLat < 0 || iLng < 0) {
      throw new Error("CSV must include columns: name, lat, lng (Excel → Save As CSV).");
    }

    const iOperator = idx(["operator", "brand"]);
    const iAddress = idx(["address", "street"]);
    const iArea = idx(["area", "locality"]);
    const iCity = idx(["city"]);
    const iState = idx(["state"]);
    const iPin = idx(["pincode", "pin", "postalcode"]);
    const iConn = idx(["connectors", "connector", "plugs"]);
    const iPower = idx(["maxpowerkw", "powerkw", "maxkw", "power"]);
    const iPrice = idx(["priceperkwh", "price", "tarif"]);
    const iPoints = idx(["totalpoints", "points", "guns", "bays"]);
    const iPhone = idx(["phone", "mobile"]);
    const iNotes = idx(["notes", "remark", "remarks"]);

    let imported = 0;
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]!;
      const name = cols[iName] || "";
      const lat = num(cols[iLat]);
      const lng = num(cols[iLng]);
      if (!name || lat == null || lng == null) {
        errors.push(`Row ${r + 1}: missing name/lat/lng`);
        continue;
      }
      try {
        insertCuratedStation({
          name,
          operator: iOperator >= 0 ? cols[iOperator] : "",
          address: iAddress >= 0 ? cols[iAddress] : "",
          area: iArea >= 0 ? cols[iArea] : "",
          city: iCity >= 0 ? cols[iCity] : "",
          state: iState >= 0 ? cols[iState] : "",
          pincode: iPin >= 0 ? cols[iPin] : "",
          lat,
          lng,
          connectors: iConn >= 0 && cols[iConn] ? cols[iConn] : "CCS2",
          maxPowerKw: iPower >= 0 ? num(cols[iPower]) : null,
          pricePerKwh: iPrice >= 0 ? num(cols[iPrice]) : null,
          totalPoints: iPoints >= 0 ? num(cols[iPoints]) || 1 : 1,
          phone: iPhone >= 0 ? cols[iPhone] || null : null,
          notes: iNotes >= 0 ? cols[iNotes] || null : null,
          open24: true,
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${r + 1}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    return { ok: true as const, imported, failed: errors.length, errors: errors.slice(0, 20) };
  });

export const adminDeleteStation = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ token: z.string().min(10), id: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    deleteCuratedStation(data.id);
    return { ok: true as const };
  });

export const adminBulkDeleteStations = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        ids: z.array(z.string().min(1)).min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const deleted = deleteCuratedStationsBulk(data.ids);
    return { ok: true as const, deleted };
  });

export const adminToggleStation = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(1),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    setCuratedActive(data.id, data.active);
    return { ok: true as const };
  });

export const adminUpdateRedeemStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        id: z.string().min(1),
        status: z.enum(["pending", "paid", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    getDb()
      .prepare(`UPDATE redeem_requests SET status = ? WHERE id = ?`)
      .run(data.status, data.id);
    return { ok: true as const };
  });
