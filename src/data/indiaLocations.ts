import { City, State } from "country-state-city";
import pincodeRows from "./generated/india-pincodes.json";

/**
 * India locations — cities/towns + districts + all geocoded India Post pincodes.
 * Typeahead: min 3 characters. Nearby search runs only after select.
 */
export type LocationKind = "city" | "pincode" | "district";

export interface IndiaLocation {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  country: string;
  lat: number;
  lng: number;
  label: string;
  aliases: string[];
  kind: LocationKind;
  pincode?: string;
  district?: string;
  /** Higher = shown first when query matches */
  priority: number;
}

/** [pincode, district, state, lat, lng] */
type PincodeRow = [string, string, string, number, number];

const stateNameByCode = new Map(
  (State.getStatesOfCountry("IN") ?? []).map((s) => [s.isoCode, s.name]),
);

const stateCodeByName = new Map(
  (State.getStatesOfCountry("IN") ?? []).map((s) => [s.name.toLowerCase(), s.isoCode]),
);

const MAJOR_CITY_OVERRIDES: Array<{
  name: string;
  stateCode: string;
  lat: number;
  lng: number;
  aliases: string[];
  priority: number;
}> = [
  { name: "Delhi", stateCode: "DL", lat: 28.6139, lng: 77.209, aliases: ["new delhi", "ncr"], priority: 100 },
  { name: "Mumbai", stateCode: "MH", lat: 19.076, lng: 72.8777, aliases: ["bombay"], priority: 100 },
  {
    name: "Bengaluru",
    stateCode: "KA",
    lat: 12.9716,
    lng: 77.5946,
    aliases: ["bangalore", "bengalooru"],
    priority: 100,
  },
  { name: "Hyderabad", stateCode: "TG", lat: 17.385, lng: 78.4867, aliases: ["secunderabad"], priority: 95 },
  { name: "Chennai", stateCode: "TN", lat: 13.0827, lng: 80.2707, aliases: ["madras"], priority: 95 },
  { name: "Kolkata", stateCode: "WB", lat: 22.5726, lng: 88.3639, aliases: ["calcutta"], priority: 95 },
  { name: "Pune", stateCode: "MH", lat: 18.5204, lng: 73.8567, aliases: [], priority: 90 },
  { name: "Ahmedabad", stateCode: "GJ", lat: 23.0225, lng: 72.5714, aliases: ["amdavad"], priority: 90 },
  { name: "Jaipur", stateCode: "RJ", lat: 26.9124, lng: 75.7873, aliases: [], priority: 90 },
  { name: "Surat", stateCode: "GJ", lat: 21.1702, lng: 72.8311, aliases: [], priority: 85 },
  { name: "Lucknow", stateCode: "UP", lat: 26.8467, lng: 80.9462, aliases: [], priority: 85 },
  { name: "Kanpur", stateCode: "UP", lat: 26.4499, lng: 80.3319, aliases: [], priority: 80 },
  { name: "Nagpur", stateCode: "MH", lat: 21.1458, lng: 79.0882, aliases: [], priority: 80 },
  { name: "Indore", stateCode: "MP", lat: 22.7196, lng: 75.8577, aliases: [], priority: 80 },
  { name: "Bhopal", stateCode: "MP", lat: 23.2599, lng: 77.4126, aliases: [], priority: 80 },
  { name: "Patna", stateCode: "BR", lat: 25.5941, lng: 85.1376, aliases: [], priority: 80 },
  { name: "Gurgaon", stateCode: "HR", lat: 28.4595, lng: 77.0266, aliases: ["gurugram"], priority: 90 },
  { name: "Noida", stateCode: "UP", lat: 28.5355, lng: 77.391, aliases: [], priority: 85 },
  { name: "Ghaziabad", stateCode: "UP", lat: 28.6692, lng: 77.4538, aliases: [], priority: 75 },
  { name: "Faridabad", stateCode: "HR", lat: 28.4089, lng: 77.3178, aliases: [], priority: 75 },
  { name: "Chandigarh", stateCode: "CH", lat: 30.7333, lng: 76.7794, aliases: [], priority: 85 },
  { name: "Thane", stateCode: "MH", lat: 19.2183, lng: 72.9781, aliases: [], priority: 75 },
  { name: "Navi Mumbai", stateCode: "MH", lat: 19.033, lng: 73.0297, aliases: [], priority: 80 },
  { name: "Coimbatore", stateCode: "TN", lat: 11.0168, lng: 76.9558, aliases: [], priority: 80 },
  { name: "Kochi", stateCode: "KL", lat: 9.9312, lng: 76.2673, aliases: ["cochin", "ernakulam"], priority: 85 },
  {
    name: "Thiruvananthapuram",
    stateCode: "KL",
    lat: 8.5241,
    lng: 76.9366,
    aliases: ["trivandrum"],
    priority: 80,
  },
  { name: "Visakhapatnam", stateCode: "AP", lat: 17.6868, lng: 83.2185, aliases: ["vizag"], priority: 80 },
  { name: "Vadodara", stateCode: "GJ", lat: 22.3072, lng: 73.1812, aliases: ["baroda"], priority: 75 },
  { name: "Rajkot", stateCode: "GJ", lat: 22.3039, lng: 70.8022, aliases: [], priority: 75 },
  { name: "Nashik", stateCode: "MH", lat: 19.9975, lng: 73.7898, aliases: ["nasik"], priority: 75 },
  { name: "Ranchi", stateCode: "JH", lat: 23.3441, lng: 85.3096, aliases: [], priority: 70 },
  { name: "Raipur", stateCode: "CT", lat: 21.2514, lng: 81.6296, aliases: [], priority: 70 },
  { name: "Guwahati", stateCode: "AS", lat: 26.1445, lng: 91.7362, aliases: [], priority: 75 },
  { name: "Bhubaneswar", stateCode: "OR", lat: 20.2961, lng: 85.8245, aliases: [], priority: 75 },
  { name: "Mysore", stateCode: "KA", lat: 12.2958, lng: 76.6394, aliases: ["mysuru"], priority: 75 },
  { name: "Mangalore", stateCode: "KA", lat: 12.9141, lng: 74.856, aliases: ["mangaluru"], priority: 70 },
  { name: "Panaji", stateCode: "GA", lat: 15.4909, lng: 73.8278, aliases: ["panjim", "goa"], priority: 80 },
  { name: "Dehradun", stateCode: "UT", lat: 30.3165, lng: 78.0322, aliases: [], priority: 70 },
  { name: "Amritsar", stateCode: "PB", lat: 31.634, lng: 74.8723, aliases: [], priority: 70 },
  { name: "Ludhiana", stateCode: "PB", lat: 30.901, lng: 75.8573, aliases: [], priority: 70 },
  {
    name: "Varanasi",
    stateCode: "UP",
    lat: 25.3176,
    lng: 82.9739,
    aliases: ["banaras", "benaras"],
    priority: 70,
  },
  { name: "Agra", stateCode: "UP", lat: 27.1767, lng: 78.0081, aliases: [], priority: 75 },
  { name: "Meerut", stateCode: "UP", lat: 28.9845, lng: 77.7064, aliases: [], priority: 65 },
  { name: "Jodhpur", stateCode: "RJ", lat: 26.2389, lng: 73.0243, aliases: [], priority: 70 },
  { name: "Madurai", stateCode: "TN", lat: 9.9252, lng: 78.1198, aliases: [], priority: 70 },
  {
    name: "Tiruchirappalli",
    stateCode: "TN",
    lat: 10.7905,
    lng: 78.7047,
    aliases: ["trichy", "tiruchi"],
    priority: 65,
  },
  { name: "Vijayawada", stateCode: "AP", lat: 16.5062, lng: 80.648, aliases: [], priority: 70 },
  { name: "Warangal", stateCode: "TG", lat: 17.9689, lng: 79.5941, aliases: [], priority: 65 },
  {
    name: "Aurangabad",
    stateCode: "MH",
    lat: 19.8762,
    lng: 75.3433,
    aliases: ["chhatrapati sambhajinagar"],
    priority: 65,
  },
  { name: "Jamshedpur", stateCode: "JH", lat: 22.8046, lng: 86.2029, aliases: [], priority: 65 },
  {
    name: "Allahabad",
    stateCode: "UP",
    lat: 25.4358,
    lng: 81.8463,
    aliases: ["prayagraj"],
    priority: 70,
  },
  { name: "Howrah", stateCode: "WB", lat: 22.5958, lng: 88.2636, aliases: [], priority: 65 },
  { name: "Greater Noida", stateCode: "UP", lat: 28.4744, lng: 77.504, aliases: [], priority: 75 },
];

function makeCity(input: {
  name: string;
  stateCode: string;
  lat: number;
  lng: number;
  aliases?: string[];
  priority?: number;
}): IndiaLocation | null {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  const state = stateNameByCode.get(input.stateCode) || input.stateCode;
  const name = input.name.trim();
  const aliases = (input.aliases ?? []).map((a) => a.toLowerCase().trim()).filter(Boolean);
  return {
    id: `city-${input.stateCode}-${name}`.toLowerCase().replace(/\s+/g, "-"),
    name,
    state,
    stateCode: input.stateCode,
    country: "India",
    lat: input.lat,
    lng: input.lng,
    label: `${name}, ${state}`,
    aliases,
    kind: "city",
    priority: input.priority ?? 0,
  };
}

function buildCities(): IndiaLocation[] {
  const byKey = new Map<string, IndiaLocation>();

  for (const city of City.getCitiesOfCountry("IN") ?? []) {
    const row = makeCity({
      name: city.name,
      stateCode: city.stateCode,
      lat: Number(city.latitude),
      lng: Number(city.longitude),
      priority: 0,
    });
    if (row) byKey.set(`${row.stateCode}::${row.name.toLowerCase()}`, row);
  }

  for (const major of MAJOR_CITY_OVERRIDES) {
    const row = makeCity(major);
    if (row) byKey.set(`${row.stateCode}::${row.name.toLowerCase()}`, row);
  }

  return Array.from(byKey.values());
}

function rowToPincode(row: PincodeRow): IndiaLocation {
  const [pincode, district, state, lat, lng] = row;
  const stateCode = stateCodeByName.get(state.toLowerCase()) || "IN";
  return {
    id: `pin-${pincode}`,
    name: pincode,
    state,
    stateCode,
    country: "India",
    lat,
    lng,
    label: `${pincode} · ${district}, ${state}`,
    aliases: [district.toLowerCase()],
    kind: "pincode",
    pincode,
    district,
    priority: 10,
  };
}

function buildDistricts(rows: PincodeRow[], cityKeys: Set<string>): IndiaLocation[] {
  const districtAcc = new Map<
    string,
    { district: string; state: string; latSum: number; lngSum: number; n: number }
  >();

  for (const [pincode, district, state, lat, lng] of rows) {
    if (!pincode || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const dKey = `${state.toLowerCase()}::${district.toLowerCase()}`;
    const acc = districtAcc.get(dKey);
    if (acc) {
      acc.latSum += lat;
      acc.lngSum += lng;
      acc.n += 1;
    } else {
      districtAcc.set(dKey, { district, state, latSum: lat, lngSum: lng, n: 1 });
    }
  }

  const districts: IndiaLocation[] = [];
  for (const [key, acc] of districtAcc) {
    const stateCode = stateCodeByName.get(acc.state.toLowerCase()) || "IN";
    // Skip districts that duplicate an existing city name in the same state
    if (cityKeys.has(`${stateCode}::${acc.district.toLowerCase()}`)) continue;

    districts.push({
      id: `dist-${key.replace(/[^a-z0-9]+/g, "-")}`,
      name: acc.district,
      state: acc.state,
      stateCode,
      country: "India",
      lat: acc.latSum / acc.n,
      lng: acc.lngSum / acc.n,
      label: `${acc.district}, ${acc.state}`,
      aliases: [],
      kind: "district",
      district: acc.district,
      priority: 40,
    });
  }
  return districts;
}

function buildPinPrefixIndex(rows: PincodeRow[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const pin = rows[i]![0];
    const prefix = pin.slice(0, 3);
    const bucket = index.get(prefix);
    if (bucket) bucket.push(i);
    else index.set(prefix, [i]);
  }
  return index;
}

const PIN_ROWS = pincodeRows as PincodeRow[];
const CITIES = buildCities();
const CITY_KEYS = new Set(CITIES.map((c) => `${c.stateCode}::${c.name.toLowerCase()}`));
const DISTRICTS = buildDistricts(PIN_ROWS, CITY_KEYS);
const PIN_PREFIX_INDEX = buildPinPrefixIndex(PIN_ROWS);

/** Cities + districts for text search (pincodes stay compact until matched). */
const PLACE_LOCATIONS: IndiaLocation[] = [...CITIES, ...DISTRICTS].sort((a, b) =>
  a.label.localeCompare(b.label),
);

/** @deprecated Prefer searchIndiaLocations — kept for count/debug. */
export const INDIA_LOCATIONS: IndiaLocation[] = PLACE_LOCATIONS;

function cityMatchScore(loc: IndiaLocation, q: string): number {
  const name = loc.name.toLowerCase();
  const label = loc.label.toLowerCase();
  const aliases = loc.aliases;
  const kindBoost = loc.kind === "city" ? 50 : 0;

  if (name === q || aliases.some((a) => a === q)) return 5000 + loc.priority + kindBoost;
  if (name.startsWith(q)) return 4000 + loc.priority * 2 + kindBoost;
  if (aliases.some((a) => a.startsWith(q) || a.includes(` ${q}`))) {
    return 3900 + loc.priority * 2 + kindBoost;
  }
  if (aliases.some((a) => a.includes(q))) return 3500 + loc.priority + kindBoost;
  if (label.startsWith(q)) return 3000 + loc.priority + kindBoost;

  const nameWords = name.split(/[\s,/-]+/);
  if (nameWords.some((w) => w.startsWith(q))) return 2500 + loc.priority + kindBoost;
  if (name.includes(q)) return 1200 + loc.priority + kindBoost;
  return 0;
}

function searchByPincodeDigits(digits: string, limit: number): IndiaLocation[] {
  const scored: Array<{ idx: number; score: number }> = [];
  const prefix3 = digits.slice(0, 3);

  const prefixes =
    digits.length === 3
      ? [prefix3]
      : Array.from(PIN_PREFIX_INDEX.keys()).filter((p) => p.startsWith(prefix3));

  for (const prefix of prefixes) {
    const bucket = PIN_PREFIX_INDEX.get(prefix);
    if (!bucket) continue;
    for (const idx of bucket) {
      const pin = PIN_ROWS[idx]![0];
      if (!pin.startsWith(digits)) continue;
      const score = pin === digits ? 10000 : 8000 - (pin.length - digits.length);
      scored.push({ idx, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || PIN_ROWS[a.idx]![0].localeCompare(PIN_ROWS[b.idx]![0]));
  return scored.slice(0, limit).map((x) => rowToPincode(PIN_ROWS[x.idx]!));
}

export function searchIndiaLocations(query: string, limit = 12): IndiaLocation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const compact = q.replace(/\s/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length >= 3 && /^\d+$/.test(compact)) {
    return searchByPincodeDigits(digits, limit);
  }

  const scored: Array<{ loc: IndiaLocation; score: number }> = [];
  for (const loc of PLACE_LOCATIONS) {
    const score = cityMatchScore(loc, q);
    if (score > 0) scored.push({ loc, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.loc.name.length - b.loc.name.length || a.loc.label.localeCompare(b.loc.label);
  });

  return scored.slice(0, limit).map((x) => x.loc);
}

/** Exact city/alias resolve for route planning (works even for short names). */
export function resolveIndiaLocation(query: string): IndiaLocation | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  for (const loc of CITIES) {
    if (loc.name.toLowerCase() === q) return loc;
    if (loc.aliases.some((a) => a === q)) return loc;
  }

  if (q.length >= 3) {
    const hits = searchIndiaLocations(q, 5);
    const exact = hits.find(
      (h) =>
        h.name.toLowerCase() === q ||
        h.aliases.some((a) => a === q) ||
        h.label.toLowerCase().startsWith(q),
    );
    return exact ?? hits[0] ?? null;
  }

  return null;
}

export function getIndiaLocationCount() {
  return CITIES.length + DISTRICTS.length + PIN_ROWS.length;
}

export function getIndiaLocationStats() {
  return {
    total: getIndiaLocationCount(),
    cities: CITIES.length,
    districts: DISTRICTS.length,
    pincodes: PIN_ROWS.length,
  };
}
