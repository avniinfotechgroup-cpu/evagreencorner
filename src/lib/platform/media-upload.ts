import fs from "node:fs";
import path from "node:path";
import { newId } from "@/lib/community/crypto";

const MAX_BYTES = Number(process.env["EV_IMAGE_MAX_SIZE"] || 5_242_880);
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getEditorUploadDir() {
  const base =
    process.env["EV_EDITOR_IMAGE_STORAGE"] ||
    path.join(process.cwd(), "public", "uploads", "content");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Save an admin rich-text editor image under public/uploads/content.
 */
export function saveEditorImage(opts: {
  mimeType: string;
  base64: string;
  altText?: string;
}) {
  if (!ALLOWED.has(opts.mimeType)) {
    throw new Error("Only JPEG, PNG or WebP images are allowed.");
  }

  const raw = opts.base64.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 32) throw new Error("Invalid image data.");
  if (buf.length > MAX_BYTES) {
    throw new Error(`Image too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`);
  }

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

  const id = `rte-${newId().slice(0, 12)}`;
  const fileName = `${id}.${extForMime(opts.mimeType)}`;
  fs.writeFileSync(path.join(getEditorUploadDir(), fileName), buf);

  return {
    url: `/uploads/content/${fileName}`,
    alt: (opts.altText || "").trim().slice(0, 200),
  };
}
