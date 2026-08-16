import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "evgm.gps-city.v1";
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

type CachedCity = {
  city: string;
  lat: number;
  lng: number;
  at: number;
};

function readCache(): CachedCity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCity;
    if (!parsed?.city || !parsed.at || Date.now() - parsed.at > CACHE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(city: string, lat: number, lng: number) {
  try {
    const payload: CachedCity = { city, lat, lng, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

async function cityFromCoords(lat: number, lng: number): Promise<string> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "en");

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Reverse geocode failed");

  const data = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
  };

  const city = (data.city || data.locality || data.principalSubdivision || "").trim();
  if (!city) throw new Error("No city in reverse geocode");
  return city;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 5 * 60_000,
    });
  });
}

export function useGpsCity() {
  // Keep SSR + first client paint identical ("Set location") to avoid hydration mismatch.
  const [city, setCity] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const label = await cityFromCoords(lat, lng);
      writeCache(label, lat, lng);
      setCity(label);
      setStatus("ready");
    } catch (err) {
      const denied =
        err instanceof GeolocationPositionError &&
        (err.code === err.PERMISSION_DENIED || err.code === 1);
      setStatus(denied ? "denied" : "error");
      setCity((prev) => prev);
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached?.city) {
      setCity(cached.city);
      setStatus("ready");
      return;
    }
    void refresh();
  }, [refresh]);

  return {
    city,
    status,
    label:
      status === "loading" && !city
        ? "Locating…"
        : city || (status === "denied" ? "Location off" : "Set location"),
    refresh,
  };
}
