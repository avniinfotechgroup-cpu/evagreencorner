/**
 * Household + travel carbon footprint estimator (India benchmarks).
 * Planning / awareness tool — not a certified GHG inventory.
 */

export type DietType = "veg" | "eggetarian" | "nonveg";
export type CommuteMode = "ev" | "petrol" | "diesel" | "cng" | "metro" | "bus" | "walk";

export interface CarbonInputs {
  householdSize: number;
  monthlyElectricityKwh: number;
  diet: DietType;
  commuteKmPerDay: number;
  commuteMode: CommuteMode;
  flightsHoursPerYear: number;
  lpgCylindersPerYear: number;
}

export interface CarbonBreakdown {
  id: string;
  label: string;
  kgCo2ePerYear: number;
}

export interface CarbonEstimate {
  totalKgCo2ePerYear: number;
  perPersonKg: number;
  indiaAvgKg: number;
  vsIndiaPct: number;
  treesToOffset: number;
  breakdown: CarbonBreakdown[];
}

/** Grid & lifestyle factors — indicative India averages. */
const FACTORS = {
  gridKgPerKwh: 0.82,
  dietKgPerPersonYear: { veg: 900, eggetarian: 1200, nonveg: 1800 } as Record<DietType, number>,
  commuteKgPerKm: {
    ev: 0.05,
    petrol: 0.17,
    diesel: 0.16,
    cng: 0.12,
    metro: 0.03,
    bus: 0.05,
    walk: 0,
  } as Record<CommuteMode, number>,
  flightKgPerHour: 90,
  lpgKgPerCylinder: 45,
  indiaAvgHouseholdKg: 7200,
  treeKgPerYear: 22,
};

export function estimateCarbon(input: CarbonInputs): CarbonEstimate {
  const size = Math.max(1, input.householdSize);
  const electricity = Math.max(0, input.monthlyElectricityKwh) * 12 * FACTORS.gridKgPerKwh;
  const diet = FACTORS.dietKgPerPersonYear[input.diet] * size;
  const commute =
    Math.max(0, input.commuteKmPerDay) *
    220 *
    FACTORS.commuteKgPerKm[input.commuteMode];
  const flights = Math.max(0, input.flightsHoursPerYear) * FACTORS.flightKgPerHour;
  const lpg = Math.max(0, input.lpgCylindersPerYear) * FACTORS.lpgKgPerCylinder;

  const breakdown: CarbonBreakdown[] = [
    { id: "electricity", label: "Home electricity", kgCo2ePerYear: Math.round(electricity) },
    { id: "diet", label: "Food & diet", kgCo2ePerYear: Math.round(diet) },
    { id: "commute", label: "Daily commute", kgCo2ePerYear: Math.round(commute) },
    { id: "flights", label: "Flights", kgCo2ePerYear: Math.round(flights) },
    { id: "lpg", label: "Cooking gas (LPG)", kgCo2ePerYear: Math.round(lpg) },
  ];

  const total = breakdown.reduce((s, b) => s + b.kgCo2ePerYear, 0);
  const vs = Math.round(((total - FACTORS.indiaAvgHouseholdKg) / FACTORS.indiaAvgHouseholdKg) * 100);

  return {
    totalKgCo2ePerYear: total,
    perPersonKg: Math.round(total / size),
    indiaAvgKg: FACTORS.indiaAvgHouseholdKg,
    vsIndiaPct: vs,
    treesToOffset: Math.max(1, Math.round(total / FACTORS.treeKgPerYear)),
    breakdown,
  };
}

export const DIET_OPTIONS: { id: DietType; label: string }[] = [
  { id: "veg", label: "Vegetarian" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "nonveg", label: "Non-vegetarian" },
];

export const COMMUTE_OPTIONS: { id: CommuteMode; label: string }[] = [
  { id: "ev", label: "Electric vehicle" },
  { id: "petrol", label: "Petrol car / bike" },
  { id: "diesel", label: "Diesel" },
  { id: "cng", label: "CNG" },
  { id: "metro", label: "Metro / train" },
  { id: "bus", label: "Bus" },
  { id: "walk", label: "Walk / cycle" },
];
