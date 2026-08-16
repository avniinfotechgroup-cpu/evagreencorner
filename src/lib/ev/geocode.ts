import type { GeocodedPlace } from "./types";

const USER_AGENT = "EvaGreenCorner/1.0 (https://evagreencorner.com; hello@evagreencorner.com)";

/** Bengaluru fallback when geocoding fails entirely. */
export const DEFAULT_PLACE: GeocodedPlace = {
  label: "Bengaluru, Karnataka, India",
  lat: 12.9716,
  lng: 77.5946,
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
};

export interface ReverseAddress {
  label: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat: number;
  lng: number;
}

const reverseCache = new Map<string, ReverseAddress>();

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export async function geocodeQuery(query: string): Promise<GeocodedPlace> {
  const q = query.trim();
  if (!q) return DEFAULT_PLACE;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      suburb?: string;
      state?: string;
      country?: string;
      postcode?: string;
    };
  }>;

  const hit = data[0];
  if (!hit) {
    throw new Error(`No location found for “${q}”`);
  }

  const addr = hit.address ?? {};
  return {
    label: hit.display_name,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    city: addr.city || addr.town || addr.village || addr.suburb || q,
    state: addr.state || "",
    country: addr.country || "India",
  };
}

async function reverseViaBigDataCloud(lat: number, lng: number): Promise<ReverseAddress | null> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "en");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    locality?: string;
    city?: string;
    localityInfo?: { administrative?: Array<{ name?: string; adminLevel?: number }> };
    principalSubdivision?: string;
    postcode?: string;
    countryName?: string;
    localAddress?: string;
    street?: string | null;
  };

  const street = data.localAddress || data.street || "";
  const area = data.locality || "";
  const city = data.city || data.locality || "";
  const state = data.principalSubdivision || "";
  const pincode = data.postcode || "";
  const parts = [street, area, city, state, pincode].filter(Boolean);
  if (!parts.length) return null;

  return {
    label: parts.join(", "),
    street: street || area || "Nearby location",
    area,
    city,
    state,
    pincode,
    country: data.countryName || "India",
    lat,
    lng,
  };
}

async function reverseViaNominatim(lat: number, lng: number): Promise<ReverseAddress | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) return null;

  const hit = (await res.json()) as {
    display_name?: string;
    address?: {
      road?: string;
      pedestrian?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      postcode?: string;
      country?: string;
      house_number?: string;
    };
  };

  const a = hit.address ?? {};
  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(" ");
  const area = a.suburb || a.neighbourhood || "";
  const city = a.city || a.town || a.village || "";
  const state = a.state || "";
  const pincode = a.postcode || "";
  const label =
    hit.display_name ||
    [street, area, city, state, pincode].filter(Boolean).join(", ") ||
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return {
    label,
    street: street || area || "Nearby location",
    area,
    city,
    state,
    pincode,
    country: a.country || "India",
    lat,
    lng,
  };
}

/** Reverse-geocode coordinates into a human address (cached). */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<ReverseAddress> {
  const key = cacheKey(lat, lng);
  const cached = reverseCache.get(key);
  if (cached) return cached;

  let result =
    (await reverseViaBigDataCloud(lat, lng).catch(() => null)) ||
    (await reverseViaNominatim(lat, lng).catch(() => null));

  if (!result) {
    result = {
      label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      street: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      area: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      lat,
      lng,
    };
  }

  reverseCache.set(key, result);
  return result;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace> {
  const addr = await reverseGeocodeAddress(lat, lng);
  return {
    label: addr.label,
    lat,
    lng,
    city: addr.city || addr.area || "Nearby",
    state: addr.state,
    country: addr.country,
  };
}
