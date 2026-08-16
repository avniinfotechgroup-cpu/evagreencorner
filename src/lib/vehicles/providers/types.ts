/**
 * Vehicle data provider abstraction.
 * Public pages never call providers — only sync jobs / admin do.
 */

export type ProviderVehicleDraft = {
  brandName: string;
  modelName: string;
  variantName?: string;
  categoryHint?: string;
  name: string;
  slugHint?: string;
  status?: "upcoming" | "available" | "discontinued" | "temporarily_unavailable";
  batteryKwh?: number | null;
  batteryChemistry?: string;
  claimedRangeKm?: number | null;
  rangeTestCycle?: string;
  motorPowerKw?: number | null;
  torqueNm?: number | null;
  topSpeedKmph?: number | null;
  dcChargingKw?: number | null;
  connector?: string;
  seating?: number | null;
  startingPrice?: number | null;
  sourceUrl?: string;
  sourceName: string;
  raw?: Record<string, unknown>;
};

export type VehicleDataProvider = {
  id: string;
  name: string;
  priority: number;
  fetchVehicles: () => Promise<ProviderVehicleDraft[]>;
};

export function normalizeDraft(raw: Record<string, unknown>, sourceName: string): ProviderVehicleDraft {
  const pickNum = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v == null || v === "") continue;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const pickStr = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const brandName = pickStr("brand", "brandName", "brand_name", "make") || "Unknown";
  const modelName = pickStr("model", "modelName", "model_name") || pickStr("name");
  const name =
    pickStr("name", "title", "fullName") || `${brandName} ${modelName}`.trim();

  const draft: ProviderVehicleDraft = {
    brandName,
    modelName,
    name,
    status: "available",
    batteryKwh: pickNum(
      "battery_capacity_kwh",
      "batteryCapacity",
      "batteryCapacityKwh",
      "battery_kwh",
    ),
    claimedRangeKm: pickNum(
      "claimed_range_km",
      "range",
      "rangeKm",
      "claimedRange",
      "maximum_range",
    ),
    motorPowerKw: pickNum("motor_power_kw", "motorPower", "powerKw", "power_kw"),
    torqueNm: pickNum("torque_nm", "torque", "torqueNm"),
    topSpeedKmph: pickNum("top_speed_kmph", "topSpeed", "top_speed"),
    dcChargingKw: pickNum("dc_charging_power_kw", "dcCharging", "dc_kw", "fastChargeKw"),
    seating: pickNum("seating_capacity", "seating", "seats"),
    startingPrice: pickNum(
      "ex_showroom_price",
      "price",
      "startingPrice",
      "min_price",
      "exShowroom",
    ),
    sourceName,
    raw,
  };

  const variantName = pickStr("variant", "variantName", "variant_name");
  if (variantName) draft.variantName = variantName;
  const categoryHint = pickStr("category", "categorySlug", "vehicle_type");
  if (categoryHint) draft.categoryHint = categoryHint;
  const slugHint = pickStr("slug");
  if (slugHint) draft.slugHint = slugHint;
  const batteryChemistry = pickStr("battery_chemistry", "chemistry", "batteryChemistry");
  if (batteryChemistry) draft.batteryChemistry = batteryChemistry;
  const rangeTestCycle = pickStr("range_test_cycle", "testCycle", "rangeCycle");
  if (rangeTestCycle) draft.rangeTestCycle = rangeTestCycle;
  const connector = pickStr("charging_connector", "connector", "chargingConnector");
  if (connector) draft.connector = connector;
  const sourceUrl = pickStr("source_url", "url", "sourceUrl");
  if (sourceUrl) draft.sourceUrl = sourceUrl;

  return draft;
}

/** Stable duplicate key: brand|model|variant */
export function duplicateKey(d: ProviderVehicleDraft): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return [
    norm(d.brandName),
    norm(d.modelName || d.name),
    norm(d.variantName || ""),
  ].join("|");
}
