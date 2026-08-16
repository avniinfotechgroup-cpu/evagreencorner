/**
 * Rooftop solar sizing model — India city benchmarks.
 *
 * Sun hours: typical annual-average peak-sun-hour style values (kWh/kWp/day proxy).
 * Live PVGIS can override sun hours in the calculator.
 * Tariffs: approximate residential slab mid-points by DISCOM / city (₹/kWh incl. duties ballpark).
 * costPerKw: typical turnkey rooftop installed cost band (₹/kW DC, mid-2020s India).
 * gridCo2: CEA-style grid emission factor proxies (kg CO₂/kWh).
 *
 * Always treat as planning estimates — not an installer or DISCOM bill quote.
 */

export interface SolarLocation {
  slug: string;
  name: string;
  state: string;
  /** DISCOM / utility label for transparency */
  discom: string;
  lat: number;
  lng: number;
  /** Average daily peak sun hours (kWh/m²/day proxy). */
  sunHours: number;
  /** Grid tariff, ₹/kWh (residential mid-slab approx). */
  tariff: number;
  /** Installed cost benchmark, ₹/kW. */
  costPerKw: number;
  /** Grid emission factor, kg CO₂ per kWh. */
  gridCo2: number;
  /** Short note shown in UI */
  notes?: string;
}

export const SOLAR_LOCATIONS: SolarLocation[] = [
  {
    slug: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    discom: "BESCOM",
    lat: 12.9716,
    lng: 77.5946,
    sunHours: 5.2,
    tariff: 8.4,
    costPerKw: 58000,
    gridCo2: 0.71,
    notes: "Strong year-round irradiance; monsoon dips Jun–Sep.",
  },
  {
    slug: "mysuru",
    name: "Mysuru",
    state: "Karnataka",
    discom: "CESC Mysuru",
    lat: 12.2958,
    lng: 76.6394,
    sunHours: 5.3,
    tariff: 8.2,
    costPerKw: 57000,
    gridCo2: 0.71,
    notes: "Similar solar resource to Bengaluru; slightly clearer winters.",
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    discom: "TGSPDCL / TGNPDCL",
    lat: 17.385,
    lng: 78.4867,
    sunHours: 5.5,
    tariff: 7.9,
    costPerKw: 55000,
    gridCo2: 0.73,
    notes: "High solar potential; hot summers improve PV but raise soiling.",
  },
  {
    slug: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    discom: "TANGEDCO",
    lat: 13.0827,
    lng: 80.2707,
    sunHours: 5.4,
    tariff: 7.6,
    costPerKw: 56000,
    gridCo2: 0.75,
    notes: "Coastal humidity + salt air — cleaning & corrosion care matter.",
  },
  {
    slug: "coimbatore",
    name: "Coimbatore",
    state: "Tamil Nadu",
    discom: "TANGEDCO",
    lat: 11.0168,
    lng: 76.9558,
    sunHours: 5.5,
    tariff: 7.5,
    costPerKw: 55500,
    gridCo2: 0.75,
    notes: "Among TN’s stronger inland irradiance pockets.",
  },
  {
    slug: "pune",
    name: "Pune",
    state: "Maharashtra",
    discom: "MSEDCL",
    lat: 18.5204,
    lng: 73.8567,
    sunHours: 5.3,
    tariff: 9.2,
    costPerKw: 57000,
    gridCo2: 0.72,
    notes: "Higher residential tariffs improve payback vs many southern cities.",
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    discom: "Adani Electricity / BEST / MSEDCL",
    lat: 19.076,
    lng: 72.8777,
    sunHours: 4.9,
    tariff: 10.2,
    costPerKw: 62000,
    gridCo2: 0.72,
    notes: "Lower sun hours + high tariffs; roof space often constrained.",
  },
  {
    slug: "nagpur",
    name: "Nagpur",
    state: "Maharashtra",
    discom: "MSEDCL",
    lat: 21.1458,
    lng: 79.0882,
    sunHours: 5.4,
    tariff: 9.0,
    costPerKw: 56000,
    gridCo2: 0.72,
    notes: "Central India — strong summer resource.",
  },
  {
    slug: "delhi",
    name: "Delhi NCR",
    state: "Delhi",
    discom: "BSES / TPDDL",
    lat: 28.6139,
    lng: 77.209,
    sunHours: 5.0,
    tariff: 8.6,
    costPerKw: 54000,
    gridCo2: 0.79,
    notes: "Winter fog/smog cuts winter yield; summers excellent.",
  },
  {
    slug: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    discom: "DHBVN",
    lat: 28.4595,
    lng: 77.0266,
    sunHours: 5.0,
    tariff: 8.3,
    costPerKw: 54500,
    gridCo2: 0.78,
    notes: "NCR air quality similar to Delhi in winter.",
  },
  {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    discom: "NPCL / PVVNL",
    lat: 28.5355,
    lng: 77.391,
    sunHours: 5.0,
    tariff: 8.1,
    costPerKw: 54000,
    gridCo2: 0.78,
    notes: "Society rooftops common; check RWAs / net-metering queue.",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    discom: "JVVNL",
    lat: 26.9124,
    lng: 75.7873,
    sunHours: 5.8,
    tariff: 7.8,
    costPerKw: 53000,
    gridCo2: 0.74,
    notes: "Rajasthan among India’s highest solar irradiance zones.",
  },
  {
    slug: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    discom: "TPL / UGVCL area",
    lat: 23.0225,
    lng: 72.5714,
    sunHours: 5.7,
    tariff: 7.4,
    costPerKw: 53500,
    gridCo2: 0.73,
    notes: "Gujarat solar policy ecosystem is mature for rooftop.",
  },
  {
    slug: "surat",
    name: "Surat",
    state: "Gujarat",
    discom: "DGVCL",
    lat: 21.1702,
    lng: 72.8311,
    sunHours: 5.6,
    tariff: 7.3,
    costPerKw: 54000,
    gridCo2: 0.73,
    notes: "Strong sun; industrial + residential rooftop uptake high.",
  },
  {
    slug: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    discom: "CESC / WBSEDCL",
    lat: 22.5726,
    lng: 88.3639,
    sunHours: 4.7,
    tariff: 8.0,
    costPerKw: 59000,
    gridCo2: 0.8,
    notes: "Monsoon-heavy; lower annual sun hours than west/north-west.",
  },
  {
    slug: "bhopal",
    name: "Bhopal",
    state: "Madhya Pradesh",
    discom: "MPPKVVCL",
    lat: 23.2599,
    lng: 77.4126,
    sunHours: 5.4,
    tariff: 7.7,
    costPerKw: 54500,
    gridCo2: 0.76,
    notes: "Central India — balanced irradiance profile.",
  },
  {
    slug: "chandigarh",
    name: "Chandigarh",
    state: "Chandigarh",
    discom: "CED",
    lat: 30.7333,
    lng: 76.7794,
    sunHours: 5.1,
    tariff: 7.5,
    costPerKw: 55000,
    gridCo2: 0.77,
    notes: "Winter fog episodes reduce Dec–Jan generation.",
  },
  {
    slug: "kochi",
    name: "Kochi",
    state: "Kerala",
    discom: "KSEB",
    lat: 9.9312,
    lng: 76.2673,
    sunHours: 4.8,
    tariff: 7.2,
    costPerKw: 60000,
    gridCo2: 0.7,
    notes: "Heavy monsoon; coastal humidity — yield more seasonal.",
  },
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
  const usableAreaSqm = roofAreaSqft * 0.0929 * usableFactor;
  const roofLimitKw = usableAreaSqm / AREA_PER_KW;

  const monthlyUnitsNeeded = monthlyBill / location.tariff;
  const dailyGenPerKw = location.sunHours * PERFORMANCE_RATIO * shadingFactor;
  const demandKw = ((monthlyUnitsNeeded / (dailyGenPerKw * 30.4)) * 1.15);

  const systemKw = Math.max(1, Math.round(Math.min(roofLimitKw, demandKw) * 2) / 2);

  const annualUnits = Math.round(systemKw * dailyGenPerKw * 365);
  const monthlyUnits = Math.round(annualUnits / 12);
  const monthlySavings = Math.round(
    Math.min(monthlyUnits, monthlyUnitsNeeded * 1.1) * location.tariff,
  );
  const annualSavings = monthlySavings * 12;
  const billOffsetPct = Math.min(
    100,
    Math.round((monthlyUnits / Math.max(1, monthlyUnitsNeeded)) * 100),
  );

  const grossCost = Math.round(systemKw * location.costPerKw);
  const subsidy = applySubsidy ? Math.min(SUBSIDY_CAP, Math.round(grossCost * SUBSIDY_RATE)) : 0;
  const netCost = grossCost - subsidy;

  const paybackYears = Math.round((netCost / Math.max(1, annualSavings)) * 10) / 10;

  let lifetimeSavings = 0;
  for (let year = 0; year < 25; year++) {
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
