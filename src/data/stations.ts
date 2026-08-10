export interface ChargingStation {
  id: string;
  name: string;
  operator: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  distanceKm: number;
  connectors: string[];
  maxPowerKw: number;
  pricePerKwh: number;
  available: number;
  total: number;
  open24: boolean;
  rating: number;
  /** Normalised 0-100 coordinates used by the schematic map. */
  x: number;
  y: number;
}

export const STATIONS: ChargingStation[] = [
  {
    id: "st-1",
    name: "Indiranagar Metro Hub",
    operator: "ChargeZone",
    address: "100 Feet Rd, Indiranagar",
    area: "Indiranagar",
    city: "Bengaluru",
    pincode: "560038",
    distanceKm: 1.2,
    connectors: ["CCS2", "Type 2"],
    maxPowerKw: 60,
    pricePerKwh: 18,
    available: 3,
    total: 4,
    open24: true,
    rating: 4.7,
    x: 32,
    y: 38,
  },
  {
    id: "st-2",
    name: "Koramangala Forum Deck",
    operator: "Tata Power EZ",
    address: "Hosur Main Rd, Koramangala",
    area: "Koramangala",
    city: "Bengaluru",
    pincode: "560034",
    distanceKm: 2.8,
    connectors: ["CCS2", "CHAdeMO"],
    maxPowerKw: 120,
    pricePerKwh: 21,
    available: 1,
    total: 6,
    open24: true,
    rating: 4.4,
    x: 58,
    y: 62,
  },
  {
    id: "st-3",
    name: "Whitefield Tech Park",
    operator: "Statiq",
    address: "ITPL Main Rd, Whitefield",
    area: "Whitefield",
    city: "Bengaluru",
    pincode: "560066",
    distanceKm: 6.4,
    connectors: ["Type 2", "GB/T"],
    maxPowerKw: 30,
    pricePerKwh: 15,
    available: 5,
    total: 8,
    open24: false,
    rating: 4.1,
    x: 78,
    y: 30,
  },
  {
    id: "st-4",
    name: "Jayanagar 4th Block",
    operator: "Ather Grid",
    address: "11th Main, Jayanagar",
    area: "Jayanagar",
    city: "Bengaluru",
    pincode: "560011",
    distanceKm: 4.1,
    connectors: ["Type 2"],
    maxPowerKw: 22,
    pricePerKwh: 13,
    available: 0,
    total: 2,
    open24: true,
    rating: 4.0,
    x: 40,
    y: 74,
  },
  {
    id: "st-5",
    name: "Hebbal Flyover Point",
    operator: "Jio-bp Pulse",
    address: "Bellary Rd, Hebbal",
    area: "Hebbal",
    city: "Bengaluru",
    pincode: "560024",
    distanceKm: 8.9,
    connectors: ["CCS2", "Type 2"],
    maxPowerKw: 150,
    pricePerKwh: 23,
    available: 4,
    total: 4,
    open24: true,
    rating: 4.8,
    x: 46,
    y: 14,
  },
  {
    id: "st-6",
    name: "HSR Sector 2 Plaza",
    operator: "ChargeGrid",
    address: "27th Main, HSR Layout",
    area: "HSR Layout",
    city: "Bengaluru",
    pincode: "560102",
    distanceKm: 5.3,
    connectors: ["CCS2", "Type 2", "GB/T"],
    maxPowerKw: 60,
    pricePerKwh: 17,
    available: 2,
    total: 5,
    open24: false,
    rating: 4.3,
    x: 68,
    y: 80,
  },
];

export interface PopularArea {
  name: string;
  city: string;
  pincode: string;
  stations: number;
  searches: string;
  aqi: number;
}

export const POPULAR_AREAS: PopularArea[] = [
  { name: "Indiranagar", city: "Bengaluru", pincode: "560038", stations: 24, searches: "18.4k", aqi: 62 },
  { name: "Koramangala", city: "Bengaluru", pincode: "560034", stations: 31, searches: "16.1k", aqi: 71 },
  { name: "Whitefield", city: "Bengaluru", pincode: "560066", stations: 42, searches: "14.7k", aqi: 88 },
  { name: "HSR Layout", city: "Bengaluru", pincode: "560102", stations: 19, searches: "11.2k", aqi: 66 },
  { name: "Hebbal", city: "Bengaluru", pincode: "560024", stations: 15, searches: "9.8k", aqi: 94 },
  { name: "Jayanagar", city: "Bengaluru", pincode: "560011", stations: 12, searches: "8.3k", aqi: 58 },
  { name: "Electronic City", city: "Bengaluru", pincode: "560100", stations: 27, searches: "7.9k", aqi: 79 },
  { name: "Yelahanka", city: "Bengaluru", pincode: "560064", stations: 9, searches: "5.4k", aqi: 55 },
];
