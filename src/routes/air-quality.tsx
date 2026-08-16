import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { siteConfig } from "@/config/platform";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { AqiDashboard } from "@/components/platform/AqiDashboard";
import { AQI_PLACES, type AirQuality, type AqiMapPin, type AqiWeather } from "@/data/aqi";
import { fetchAirQualityLive } from "@/lib/ev/aqi.functions";
import { buildPageHead } from "@/lib/seo/site";
import { loadPageSeo } from "@/lib/seo/load-page-seo";

const TITLE = `Real-time Air Quality Index (AQI) | ${siteConfig.name}`;
const DESCRIPTION =
  "Live US AQI on a dark city map — PM2.5, PM10, weather, and nearby readings for Indian cities.";

export const Route = createFileRoute("/air-quality")({
  loader: () => loadPageSeo("/air-quality"),
  head: ({ loaderData }) =>
    loaderData?.head ??
    buildPageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/air-quality",
    }),
  component: AirQualityPage,
});

function AirQualityPage() {
  const fetchLive = useServerFn(fetchAirQualityLive);
  const [query, setQuery] = useState("New Delhi");
  const [active, setActive] = useState("New Delhi");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [data, setData] = useState<AirQuality | null>(null);
  const [weather, setWeather] = useState<AqiWeather | null>(null);
  const [nearby, setNearby] = useState<AqiMapPin[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const place = AQI_PLACES.find(
      (p) => p.area.toLowerCase() === active.trim().toLowerCase(),
    );
    const t = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchLive({
        data: coords
          ? {
              query: active === "Current location" ? "Current location" : active,
              lat: coords.lat,
              lng: coords.lng,
            }
          : place
            ? { query: place.area, lat: place.lat, lng: place.lng }
            : { query: active },
      })
        .then((res) => {
          if (cancelled) return;
          setData(res.data);
          setWeather(res.weather);
          setNearby(res.nearby);
          setWarning(res.warning);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Could not load live AQI.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [active, coords, fetchLive]);

  const onLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setQuery("Current location");
        setActive("Current location");
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(err.message || "Could not get your location.");
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="min-h-screen bg-[#070b14]">
      <SiteHeader />
      <AqiDashboard
        data={data}
        weather={weather}
        nearby={nearby}
        loading={loading}
        error={error}
        warning={warning}
        query={query}
        onQueryChange={setQuery}
        onSearch={(q, opts) => {
          if (opts) {
            setCoords({ lat: opts.lat, lng: opts.lng });
            setActive(q);
          } else {
            setCoords(null);
            setActive(q);
          }
        }}
        onLocate={onLocate}
        locating={locating}
        popular={AQI_PLACES}
      />
      <SiteFooter />
    </div>
  );
}
