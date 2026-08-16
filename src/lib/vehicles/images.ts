import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/community/db";
import { newId } from "@/lib/community/crypto";
import { ensureVehiclesSchema } from "./schema";

const MAX_BYTES = Number(process.env["EV_IMAGE_MAX_SIZE"] || 5_242_880);
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getVehicleUploadDir() {
  const base =
    process.env["EV_IMAGE_STORAGE"] ||
    path.join(process.cwd(), "public", "uploads", "vehicles");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Secure admin image upload.
 * Validates MIME, size; renames to random filename; stores under public/uploads/vehicles.
 */
export function saveVehicleImage(opts: {
  vehicleId: string;
  mimeType: string;
  base64: string;
  altText: string;
  imageType?: string;
  isPrimary?: boolean;
  source?: string;
}) {
  ensureVehiclesSchema();
  if (!ALLOWED.has(opts.mimeType)) {
    throw new Error("Only JPEG, PNG or WebP images are allowed.");
  }
  if (!opts.altText.trim()) {
    throw new Error("Meaningful ALT text is required.");
  }

  const raw = opts.base64.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 32) throw new Error("Invalid image data.");
  if (buf.length > MAX_BYTES) {
    throw new Error(`Image too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`);
  }

  // Basic magic-byte check
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp =
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";
  if (
    (opts.mimeType === "image/jpeg" && !isJpeg) ||
    (opts.mimeType === "image/png" && !isPng) ||
    (opts.mimeType === "image/webp" && !isWebp)
  ) {
    throw new Error("File content does not match declared image type.");
  }

  const id = `img-${newId().slice(0, 12)}`;
  const ext = extForMime(opts.mimeType);
  const fileName = `${id}.${ext}`;
  const dir = getVehicleUploadDir();
  fs.writeFileSync(path.join(dir, fileName), buf);

  const publicUrl = `/uploads/vehicles/${fileName}`;
  const ts = new Date().toISOString();
  const db = getDb();

  if (opts.isPrimary) {
    db.prepare(`UPDATE vehicle_images SET is_primary = 0 WHERE vehicle_id = ?`).run(
      opts.vehicleId,
    );
  }

  db.prepare(
    `INSERT INTO vehicle_images
      (id, vehicle_id, image_url, thumbnail_url, image_type, alt_text, source, sort_order,
       is_primary, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)`,
  ).run(
    id,
    opts.vehicleId,
    publicUrl,
    publicUrl,
    opts.imageType || "gallery",
    opts.altText.trim().slice(0, 200),
    opts.source || "admin upload",
    opts.isPrimary ? 1 : 0,
    ts,
  );

  return { id, url: publicUrl };
}
