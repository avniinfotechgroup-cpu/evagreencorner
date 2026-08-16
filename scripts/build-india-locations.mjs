/**
 * Builds a compact India pincode index from india-post-pincode (~19.5k PINs).
 * Output: src/data/generated/india-pincodes.json
 *
 * Each row: [pincode, district, state, lat, lng]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookupPincode, getPincodeCount } from "india-post-pincode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/generated");
const outFile = path.join(outDir, "india-pincodes.json");

const rows = [];
const expected = getPincodeCount();

for (let n = 100000; n <= 999999; n++) {
  const pin = String(n);
  const info = lookupPincode(pin);
  if (!info) continue;
  if (info.latitude == null || info.longitude == null) continue;
  if (!Number.isFinite(info.latitude) || !Number.isFinite(info.longitude)) continue;
  rows.push([
    info.pincode,
    info.district,
    info.state,
    Math.round(info.latitude * 1e6) / 1e6,
    Math.round(info.longitude * 1e6) / 1e6,
  ]);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(rows));

console.log(
  `Wrote ${rows.length} geocoded pincodes (dataset has ${expected} total) → ${outFile}`,
);
console.log(`File size: ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB`);
