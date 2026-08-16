/**
 * Direct + virtual water footprint estimator (India-oriented).
 * Awareness tool — not a municipal bill forecast.
 */

export type DietType = "veg" | "eggetarian" | "nonveg";
export type ShowerHabit = "short" | "medium" | "long";

export interface WaterInputs {
  householdSize: number;
  showersPerPersonPerWeek: number;
  showerHabit: ShowerHabit;
  laundryLoadsPerWeek: number;
  diet: DietType;
  mealsOutPerWeek: number;
  gardenWateringDaysPerWeek: number;
}

export interface WaterBreakdown {
  id: string;
  label: string;
  litresPerDay: number;
}

export interface WaterEstimate {
  litresPerDay: number;
  litresPerPersonPerDay: number;
  litresPerMonth: number;
  indiaAvgLitresPerPersonDay: number;
  vsIndiaPct: number;
  breakdown: WaterBreakdown[];
}

const SHOWER_L = { short: 35, medium: 55, long: 90 } as Record<ShowerHabit, number>;
const LAUNDRY_L = 70;
const DIET_L_PER_PERSON_DAY = { veg: 2500, eggetarian: 3200, nonveg: 4500 } as Record<
  DietType,
  number
>;
const MEAL_OUT_L = 1800;
const GARDEN_L_PER_DAY = 120;
const INDIA_AVG_L_PERSON = 2800; // includes virtual water in food

export function estimateWater(input: WaterInputs): WaterEstimate {
  const size = Math.max(1, input.householdSize);
  const shower =
    (Math.max(0, input.showersPerPersonPerWeek) / 7) *
    SHOWER_L[input.showerHabit] *
    size;
  const laundry = (Math.max(0, input.laundryLoadsPerWeek) / 7) * LAUNDRY_L;
  const diet = DIET_L_PER_PERSON_DAY[input.diet] * size;
  const mealsOut = (Math.max(0, input.mealsOutPerWeek) / 7) * MEAL_OUT_L;
  const garden = (Math.max(0, input.gardenWateringDaysPerWeek) / 7) * GARDEN_L_PER_DAY;

  const breakdown: WaterBreakdown[] = [
    { id: "shower", label: "Showers & bathing", litresPerDay: Math.round(shower) },
    { id: "laundry", label: "Laundry", litresPerDay: Math.round(laundry) },
    { id: "diet", label: "Food (virtual water)", litresPerDay: Math.round(diet) },
    { id: "meals", label: "Eating out", litresPerDay: Math.round(mealsOut) },
    { id: "garden", label: "Garden / plants", litresPerDay: Math.round(garden) },
  ];

  const total = breakdown.reduce((s, b) => s + b.litresPerDay, 0);
  const perPerson = Math.round(total / size);
  const vs = Math.round(((perPerson - INDIA_AVG_L_PERSON) / INDIA_AVG_L_PERSON) * 100);

  return {
    litresPerDay: total,
    litresPerPersonPerDay: perPerson,
    litresPerMonth: Math.round(total * 30),
    indiaAvgLitresPerPersonDay: INDIA_AVG_L_PERSON,
    vsIndiaPct: vs,
    breakdown,
  };
}

export const DIET_OPTIONS: { id: DietType; label: string }[] = [
  { id: "veg", label: "Vegetarian" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "nonveg", label: "Non-vegetarian" },
];

export const SHOWER_OPTIONS: { id: ShowerHabit; label: string }[] = [
  { id: "short", label: "Short (~5 min)" },
  { id: "medium", label: "Medium (~8 min)" },
  { id: "long", label: "Long (10+ min)" },
];
