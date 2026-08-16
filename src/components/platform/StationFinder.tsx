import { useEffect, useState } from "react";
import { Crosshair, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { IndiaLocation } from "@/data/indiaLocations";
import { useIsMobile } from "@/hooks/use-mobile";
import { IconicLoader } from "./IconicLoader";
import { LocationAutocomplete } from "./LocationAutocomplete";
import {
  NearbyChargersPanel,
  type RadiusKm,
} from "./NearbyChargersPanel";

export function StationFinder() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<IndiaLocation | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10);
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const placeLabel = selectedLocation?.label || submitted.trim() || "this area";

  const goToChargersPage = (lat: number, lng: number, label: string) => {
    void navigate({
      to: "/chargers",
      search: {
        lat,
        lng,
        q: label,
        radius: radiusKm,
        view: "list",
      },
    });
  };

  const runSelectedSearch = (loc: IndiaLocation) => {
    setFormError(null);
    setGeoError(null);
    setSelectedLocation(loc);
    setQuery(loc.label);
    setCoords({ lat: loc.lat, lng: loc.lng });
    setSubmitted(loc.label);
    setHasSearched(true);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      goToChargersPage(loc.lat, loc.lng, loc.label);
    }
  };

  const useCurrentLocation = () => {
    setFormError(null);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const label = "Current location";
        setSelectedLocation(null);
        setQuery(label);
        setCoords({ lat, lng });
        setSubmitted(label);
        setHasSearched(true);
        setLocating(false);

        if (typeof window !== "undefined" && window.innerWidth < 768) {
          goToChargersPage(lat, lng, label);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(err.message || "Could not get your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  // If viewport becomes mobile after a desktop search, send user to results page.
  useEffect(() => {
    if (!isMobile || !hasSearched || !coords) return;
    goToChargersPage(coords.lat, coords.lng, submitted || placeLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedLocation) {
            runSelectedSearch(selectedLocation);
            return;
          }
          setFormError("Please select a location from the list (type 3+ letters, then choose).");
        }}
        className="relative z-20 overflow-visible rounded-[1.75rem] border border-border bg-white p-2 shadow-lift ring-1 ring-black/5 dark:bg-card"
      >
        <div className="flex flex-col gap-2 overflow-visible md:flex-row md:items-center">
          <LocationAutocomplete
            value={query}
            selected={selectedLocation}
            onQueryChange={(v) => {
              setQuery(v);
              if (!selectedLocation || v !== selectedLocation.label) {
                setSelectedLocation(null);
              }
            }}
            onSelect={runSelectedSearch}
          />

          <div className="flex items-center gap-2 px-1 pb-1 md:px-0 md:pb-0">
            <button
              type="button"
              onClick={useCurrentLocation}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:flex-none"
            >
              {locating ? (
                <IconicLoader size="sm" />
              ) : (
                <Crosshair className="size-4 text-leaf" />
              )}
              Current location
            </button>
            <button
              type="submit"
              disabled={!selectedLocation}
              title={
                selectedLocation
                  ? "Search chargers at selected location"
                  : "Select a location from the list first"
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
            >
              <Zap className="size-4" />
              Find chargers
            </button>
          </div>
        </div>
      </form>

      {(formError || geoError) && (
        <p className="mt-3 rounded-2xl border border-border bg-white px-4 py-2 text-xs text-muted-foreground dark:bg-card">
          {formError || geoError}
        </p>
      )}

      {/* Desktop / tablet: list + map side by side on the home hero */}
      {hasSearched && coords ? (
        <div className="hidden md:block">
          <NearbyChargersPanel
            coords={coords}
            placeLabel={placeLabel}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            layout="split"
          />
        </div>
      ) : null}

      {hasSearched && coords ? (
        <p className="mt-4 text-center text-sm text-primary-foreground/85 md:hidden">
          Opening <span className="font-semibold">Nearby chargers</span> with Station list & Map
          view…
        </p>
      ) : null}
    </>
  );
}
