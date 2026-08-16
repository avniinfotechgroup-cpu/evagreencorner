export type EvDataSource = "openchargemap" | "openstreetmap" | "curated";

export type AvailabilityStatus = "UNKNOWN";

export type YesNoUnknown = "yes" | "no" | "unknown";

/** What service this location provides. */
export type EvServiceType = "plug_in" | "battery_swap" | "both";

export interface VehicleAccess {
  cars: YesNoUnknown;
  twoWheelers: YesNoUnknown;
  /** 3-wheelers / cargo loaders / autos */
  threeWheelers: YesNoUnknown;
  buses: YesNoUnknown;
  trucks: YesNoUnknown;
}

export interface FuelCoLocation {
  petrol: YesNoUnknown;
  diesel: YesNoUnknown;
  cng: YesNoUnknown;
  fuelStationName: string | null;
  note: string | null;
}

export interface EvStation {
  id: string;
  source: EvDataSource;
  sourceId: string;
  name: string;
  operator: string;
  /** plug-in charging, battery swap (EV bike/loader), or both */
  serviceType: EvServiceType;
  batterySwap: boolean;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
  /** true when address came from reverse geocoding lat/lng */
  addressFromGeocode: boolean;
  lat: number;
  lng: number;
  distanceKm: number;
  connectors: string[];
  maxPowerKw: number | null;
  pricePerKwh: number | null;
  pricingNote: string | null;
  total: number;
  chargingPointsKnown: boolean;
  open24: boolean | null;
  openingHours: string | null;
  website: string | null;
  phone: string | null;
  availability: AvailabilityStatus;
  rushLevel: "UNKNOWN";
  rushNote: string;
  vehicleAccess: VehicleAccess;
  fuelCoLocation: FuelCoLocation;
  access: string | null;
  lastUpdated: string | null;
}

export interface GeocodedPlace {
  label: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  country: string;
}

export interface NearbyStationsResult {
  place: GeocodedPlace;
  stations: EvStation[];
  source: EvDataSource;
  fetchedAt: string;
  warning?: string | undefined;
}
