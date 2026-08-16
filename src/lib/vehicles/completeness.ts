import type { VehicleDetail } from "./queries";

const WEIGHTS = {
  price: 15,
  battery: 15,
  range: 15,
  charging: 10,
  motor: 10,
  dimensions: 8,
  safety: 8,
  warranty: 8,
  images: 6,
  source: 5,
} as const;

export type CompletenessResult = {
  score: number;
  missing: string[];
  confidence: "high" | "medium" | "low";
};

/** Admin-facing completeness (0–100). Not shown as a public quality claim. */
export function computeCompleteness(
  v: Pick<
    VehicleDetail,
    | "startingPrice"
    | "batteryKwh"
    | "claimedRangeKm"
    | "rangeTestCycle"
    | "dcChargingKw"
    | "connector"
    | "motorPowerKw"
    | "seating"
    | "lengthMm"
    | "safetyRating"
    | "vehicleWarrantyYears"
    | "batteryWarrantyYears"
    | "images"
    | "sourceName"
    | "lastVerified"
    | "priceSource"
  >,
): CompletenessResult {
  let earned = 0;
  const missing: string[] = [];

  const check = (key: keyof typeof WEIGHTS, ok: boolean, label: string) => {
    if (ok) earned += WEIGHTS[key];
    else missing.push(label);
  };

  check("price", v.startingPrice != null && v.startingPrice > 0, "Price");
  check("battery", v.batteryKwh != null, "Battery");
  check(
    "range",
    v.claimedRangeKm != null && Boolean(v.rangeTestCycle),
    "Range + test cycle",
  );
  check(
    "charging",
    v.dcChargingKw != null || Boolean(v.connector),
    "Charging",
  );
  check("motor", v.motorPowerKw != null, "Motor power");
  check(
    "dimensions",
    v.seating != null || v.lengthMm != null,
    "Dimensions / seating",
  );
  check("safety", Boolean(v.safetyRating), "Safety rating");
  check(
    "warranty",
    v.vehicleWarrantyYears != null || v.batteryWarrantyYears != null,
    "Warranty",
  );
  check("images", v.images.length > 0, "Images");
  check(
    "source",
    Boolean(v.sourceName || v.priceSource) && Boolean(v.lastVerified),
    "Source + verified date",
  );

  const score = Math.round(earned);
  const daysSinceVerify = v.lastVerified
    ? (Date.now() - new Date(v.lastVerified).getTime()) / (86400 * 1000)
    : 999;
  let confidence: CompletenessResult["confidence"] = "low";
  if (score >= 80 && daysSinceVerify <= 60) confidence = "high";
  else if (score >= 55 && daysSinceVerify <= 120) confidence = "medium";

  return { score, missing, confidence };
}
