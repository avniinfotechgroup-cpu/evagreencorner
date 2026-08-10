/**
 * Rooftop solar sizing model.
 *
 * Location profiles carry peak sun hours, tariff and installed-cost benchmarks
 * so new cities can be added without touching the calculator UI.
 */

export interface SolarLocation {
  slug: string;
  name: string;
  /** Average daily peak sun hours (kWh/m²/day). */
  sunHours: number;
  /** Grid tariff, ₹/kWh. */
  tariff: number;
  /** Installed cost benchmark, ₹/kW. */
  costPerKw: number;
  /** Grid emission factor, kg CO₂ per kWh. */
  gridCo2: number;
}

export const SOLAR_LOCATIONS: SolarLocation[] = [
  { slug: "bengaluru", name: "Bengaluru", sunHours: 5.1, tariff: 8.2, costPerKw: 58000, gridCo2: 0.71 },
  { slug: "indiranagar", name: "Indiranagar", sunHours: 5.1, tariff: 8.2, costPerKw: 59000, gridCo2: 0.71 },
  { slug: "whitefield", name: "Whitefield", sunHours: 5.2, tariff: 8.0, costPerKw: 57000, gridCo2: 0.71 },
  { slug: "hyderabad", name: "Hyderabad", sunHours: 5.4, tariff: 7.8, costPerKw: 55000, gridCo2: 0.73 },
  { slug: "chennai", name: "Chennai", sunHours: 5.3, tariff: 7.4, costPerKw: 56000, gridCo2: 0.75 },
  { slug: "pune", name: "Pune", sunHours: 5.2, tariff: 9.1, costPerKw: 57000, gridCo2: 0.72 },
  { slug: "delhi", name: "Delhi NCR", sunHours: 4.9, tariff: 8.5, costPerKw: 54000, gridCo2: 0.79 },
  { slug: "mumbai", name: "Mumbai", sunHours: 4.8, tariff: 9.6, costPerKw: 60000, gridCo2: 0.72 },
];

export const ROOF_TYPES = [
  { id: "rcc", label: "RCC flat roof", usable: 0.75 },
  { id: "metal", label: "Metal sheet roof", usable: 0.85 },
  { id: "tile", label: "Tiled / sloped roof", usable: 0.65 },
];

export const SHADING = [
  { id: "none", label: "No shading", factor: 1 },
  { id: "light", label: "Light shading", factor: 0.9 },
  { id: "heavy", label: "Heavy shading", factor: 0.75 },
];

/** ~9.5 m² of roof per kW for typical mono-PERC modules. */
const AREA_PER_KW = 9.5;
const PERFORMANCE_RATIO = 0.78;
const SUBSIDY_RATE = 0.3;
const SUBSIDY_CAP = 78000;
const DEGRADATION = 0.006;

export interface SolarInput {
  location: SolarLocation;
  roofAreaSqft: number;
  usableFactor: number;
  shadingFactor: number;
  monthlyBill: number;
  applySubsidy: boolean;
}

export interface SolarEstimate {
  systemKw: number;
  panels: number;
  usableAreaSqm: number;
  monthlyUnits: number;
  annualUnits: number;
  monthlySavings: number;
  annualSavings: number;
  billOffsetPct: number;
  grossCost: number;
  subsidy: number;
  netCost: number;
  paybackYears: number;
  lifetimeSavings: number;
  co2TonnesPerYear: number;
  treesEquivalent: number;
}

export function estimateSolar({
  location,
  roofAreaSqft,
  usableFactor,
  shadingFactor,
  monthlyBill,
  applySubsidy,
}: SolarInput): SolarEstimate {
  const usableAreaSqm = (roofAreaSqft * 0.0929) * usableFactor;
  const roofLimitKw = usableAreaSqm / AREA_PER_KW;

  // Don't oversize beyond what the household actually consumes (+15% headroom).
  const monthlyUnitsNeeded = monthlyBill / location.tariff;
  const dailyGenPerKw = location.sunHours * PERFORMANCE_RATIO * shadingFactor;
  const demandKw = monthlyUnitsNeeded / (dailyGenPerKw * 30.4) * 1.15;

  const systemKw = Math.max(1, Math.round(Math.min(roofLimitKw, demandKw) * 2) / 2);

  const annualUnits = Math.round(systemKw * dailyGenPerKw * 365);
  const monthlyUnits = Math.round(annualUnits / 12);
  const monthlySavings = Math.round(Math.min(monthlyUnits, monthlyUnitsNeeded * 1.1) * location.tariff);
  const annualSavings = monthlySavings * 12;
  const billOffsetPct = Math.min(100, Math.round((monthlyUnits / Math.max(1, monthlyUnitsNeeded)) * 100));

  const grossCost = Math.round(systemKw * location.costPerKw);
  const subsidy = applySubsidy ? Math.min(SUBSIDY_CAP, Math.round(grossCost * SUBSIDY_RATE)) : 0;
  const netCost = grossCost - subsidy;

  const paybackYears = Math.round((netCost / Math.max(1, annualSavings)) * 10) / 10;

  let lifetimeSavings = 0;
  for (let year = 0; year < 25; year++) {
    // 3% tariff escalation, 0.6% panel degradation per year.
    lifetimeSavings += annualSavings * Math.pow(1.03, year) * Math.pow(1 - DEGRADATION, year);
  }

  const co2TonnesPerYear = Math.round((annualUnits * location.gridCo2) / 100) / 10;

  return {
    systemKw,
    panels: Math.ceil((systemKw * 1000) / 545),
    usableAreaSqm: Math.round(usableAreaSqm),
    monthlyUnits,
    annualUnits,
    monthlySavings,
    annualSavings,
    billOffsetPct,
    grossCost,
    subsidy,
    netCost,
    paybackYears,
    lifetimeSavings: Math.round(lifetimeSavings),
    co2TonnesPerYear,
    treesEquivalent: Math.round((annualUnits * location.gridCo2) / 21),
  };
}

export function inr(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}
